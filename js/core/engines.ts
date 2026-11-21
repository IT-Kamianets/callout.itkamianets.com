import { calloutMessage } from './audio-catalog.ts';
import { type AppData, type Level, type LearningProgress, type Mode, type Question, type TrainingAnswer, type TrainingSession, type UserSettings, type RoundScenario } from './model.ts';
import { PositionDictionaryService, scenarios } from './dictionary.ts';
const DAY=86400000;
export class SpacedRepetitionEngine {
 static fresh(positionId:string):LearningProgress {return {positionId,correct:0,errors:0,totalMs:0,lastReview:0,nextReview:0,interval:0,ease:2.5,repetitions:0,streak:0,types:{}};}
 static review(old:LearningProgress|undefined,answer:TrainingAnswer):LearningProgress {
  const p:LearningProgress=structuredClone(old??this.fresh(answer.positionId));
  p.correct+=Number(answer.correct);p.errors+=Number(!answer.correct);p.totalMs+=answer.reactionMs;p.lastReview=answer.at;
  const quality=answer.correct?(answer.reactionMs<3500?5:4):1;
  if(!answer.correct || (!answer.aided && answer.mode!=='flashcards' && (!old || answer.at>=old.nextReview)))p.ease=Math.min(10,Math.max(1.3,p.ease+0.1-(5-quality)*(0.08+(5-quality)*0.02)));
  if(answer.correct){p.streak++;if(!answer.aided && answer.mode!=='flashcards' && (!old || answer.at>=old.nextReview)){p.repetitions++;p.interval=p.repetitions===1?1:p.repetitions===2?6:Math.round(p.interval*p.ease);}}
  else {p.repetitions=0;p.streak=0;p.interval=0;}
  p.nextReview=answer.correct && old && answer.at<old.nextReview?old.nextReview:answer.at+(answer.correct?Math.max(1,p.interval)*DAY:5*60000);
  if(!answer.aided && answer.mode!=='flashcards'){const t=p.types[answer.mode]??{correct:0,total:0};t.total++;t.correct+=Number(answer.correct);p.types[answer.mode]=t;}return p;
 }
 static mastered(p:LearningProgress|undefined) {return !!p && p.repetitions>=3 && p.correct/(p.correct+p.errors)>=0.8 && new Set(Object.keys(p.types)).size>=2 && p.interval>=6;}
}
export function allAnswers(data:AppData,mapId?:string) {return data.sessions.filter(s=>!mapId||s.mapId===mapId).flatMap(s=>s.answers);}
export class StatisticsService {
 static calculate(data:AppData,ids:string[]) {
  const a=allAnswers(data).filter(a=>ids.includes(a.positionId) && a.mode!=='flashcards' && !a.aided);const correct=a.filter(a=>a.correct).length;
  const timed=a.filter(a=>!a.timedOut);const learned=ids.filter(id=>SpacedRepetitionEngine.mastered(data.progress[id])).length;
  return {answers:a.length,correct,accuracy:a.length?correct/a.length:0,averageMs:timed.length?timed.reduce((sum,a)=>sum+a.reactionMs,0)/timed.length:0,learned,total:ids.length,due:ids.filter(id=>data.progress[id] && data.progress[id].nextReview<=Date.now()).length,audio:a.filter(a=>a.audio),round:a.filter(a=>a.round),aliases:a.filter(a=>a.alias),progress:ids.length?learned/ids.length:0};
 }
}
export class CommunicationReadinessCalculator {
 static calculate(data:AppData,ids:string[]) {
  const s=StatisticsService.calculate(data,ids);const fraction=(a:TrainingAnswer[])=>a.length?a.filter(a=>a.correct).length/a.length:0;
  const covered=ids.filter(id=>(data.progress[id]?.correct??0)>=2).length/Math.max(1,ids.length);
  const stability=ids.reduce((sum,id)=>sum+Math.min(1,(data.progress[id]?.interval??0)/15),0)/Math.max(1,ids.length);
  const speed=s.answers?Math.max(0,1-s.averageMs/12000)*s.accuracy*Math.min(1,s.answers/20):0;
  return Math.round(100*(.25*s.progress+.15*covered*s.accuracy+.15*fraction(s.aliases)*Math.min(1,s.aliases.length/10)+.15*fraction(s.audio)*Math.min(1,s.audio.length/10)+.1*speed+.1*fraction(s.round)*Math.min(1,s.round.length/8)+.1*stability));
 }
}
export class LanguageImmersionEngine {
 static ratios=[.2,.5,.8,1];
 static level(data:AppData,ids:string[]):Level {
  if(data.settings.difficulty!=='auto') return data.settings.difficulty;
  const a=allAnswers(data).filter(a=>ids.includes(a.positionId) && !a.aided && a.mode!=='flashcards').slice(-40);if(a.length<10)return data.settings.initial==='advanced'?2:data.settings.initial==='intermediate'?1:0;
  const acc=a.filter(a=>a.correct).length/a.length;const avg=a.reduce((s,a)=>s+a.reactionMs,0)/a.length;
  const s=StatisticsService.calculate(data,ids);const audio=s.audio.slice(-20);const audioAcc=audio.length?audio.filter(a=>a.correct).length/audio.length:0;
  if(acc<.65 || avg>10000)return 0;
  if(acc>=.92 && avg<3000 && s.progress>=.65 && audio.length>=10 && audioAcc>=.85)return 3;
  if(acc>=.85 && avg<5500 && s.progress>=.25 && audio.length>=5 && audioAcc>=.75)return 2;
  return 1;
 }
 static language(index:number,count:number,level:Level,settings:UserSettings) {const n=Math.round(count*this.ratios[level]);return index<n?settings.target:settings.native;}
 static languages(count:number,level:Level,settings:UserSettings,random:()=>number=Math.random) {return shuffle(Array.from({length:count},(_,i)=>this.language(i,count,level,settings)),random);}
}
export function shuffle<T>(values:T[],random:()=>number=Math.random) {const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export class RoundSimulationEngine {
 static scenario(index=0) {return scenarios[index%scenarios.length];}
 static events(scenario:RoundScenario,dictionary:PositionDictionaryService) {return scenario.events.filter(e=>dictionary.get(e.positionId).verified);}
}
export class LearningEngine {
 dictionary:PositionDictionaryService; constructor(dictionary=new PositionDictionaryService()){this.dictionary=dictionary;}
 start(data:AppData,mode:Mode,scenarioIndex=0,now=Date.now(),random:()=>number=Math.random):TrainingSession {
  const settings=data.settings;const positions=this.dictionary.positions(settings.mapId);if(positions.length<4)throw new Error('This map does not have a verified learning pack.');
  const ids=positions.map(p=>p.id);const level=LanguageImmersionEngine.level(data,ids);
  let pool=[...positions].sort((a,b)=>(data.progress[a.id]?.nextReview??0)-(data.progress[b.id]?.nextReview??0));
  if(mode==='mistakes')pool=pool.filter(p=>(data.progress[p.id]?.errors??0)>0 || data.review.includes(p.id) || (!!data.progress[p.id] && data.progress[p.id].nextReview<=now));
  if(!pool.length)throw new Error('No mistakes or saved review positions yet. Explore the map or complete a practice session.');
  // Choose from the least familiar / due half, rather than starving new positions.
  pool=shuffle(pool.slice(0,Math.max(10,Math.ceil(pool.length/2))),random);
  const scenario=RoundSimulationEngine.scenario(scenarioIndex);
  const events=mode==='round'?RoundSimulationEngine.events(scenario,this.dictionary):[];
  const count=mode==='round'?events.length:10;
  const langs=LanguageImmersionEngine.languages(count,level,settings,random);
  const questions:Question[]=Array.from({length:count},(_,i)=>{
   const id=mode==='round'?events[i].positionId:pool[i%pool.length].id;
   let language=langs[i];if(mode==='reverse'||mode==='speak'||mode==='placement')language=mode==='reverse'?settings.native:settings.target;
   const audio=['listen','listen-locate','multi','voice','round'].includes(mode)&&!(mode==='round'&&settings.roundMode==='reverse');
   if(audio && settings.audioLanguage!=='adaptive')language=settings.audioLanguage;
   const aliasCandidates=this.dictionary.aliases(id,language);const alias=(level>=1 || mode==='voice'||mode==='round') && aliasCandidates.length>0 && random()<.4;
   const name=alias?aliasCandidates[Math.floor(random()*aliasCandidates.length)].name:this.dictionary.name(id,language);
   const text=mode==='round'?events[i][language].replace('{name}',name):mode==='voice'?calloutMessage(language,['one','two','enemy','last','pushing','spotted'][Math.floor(random()*(level===0?2:6))],name):level===3&&mode==='choice'?calloutMessage(language,'context',name):name;
   const answerLanguage=mode==='placement'?settings.native:mode==='reverse'||mode==='speak'||(mode==='round'&&settings.roundMode==='reverse')?settings.target:language===settings.target?settings.native:settings.target;
   const roundMode=settings.roundMode;
   const limitMs=mode==='speed'?level===0?10000:level===1?7000:4500:mode==='round'?(roundMode==='training'||roundMode==='reverse'?0:roundMode==='normal'?9000:4500):level>=2&&!['flashcards','speak','multi','placement'].includes(mode)?level===3?5000:8000:0;
   const sequence=mode==='multi'?Array.from({length:3},(_,j)=>pool[(i+j)%pool.length].id):undefined;
   return {id:`q-${i}`,positionId:id,language,answerLanguage,text,alias,audio,locate:['locate','listen-locate'].includes(mode)||(level===3&&mode==='choice')||(mode==='round'&&roundMode!=='reverse'),input:mode==='speak'||(mode==='round'&&roundMode==='reverse'),options:shuffle([id,...shuffle(ids.filter(other=>other!==id),random).slice(0,3)],random),limitMs,sequence};
  });
  return {id:crypto.randomUUID(),mapId:settings.mapId,mode,startedAt:now,endedAt:null,level,questions,answers:[],index:0,status:'active',...(mode==='round'?{roundMode:settings.roundMode,scenarioId:scenario.id}:{})};
 }
 check(q:Question,selected:string,sequenceIndex=0) {return q.input?this.dictionary.matches(q.positionId,selected,q.answerLanguage):selected===(q.sequence?.[sequenceIndex]??q.positionId);}
 answer(session:TrainingSession,selected:string,reactionMs:number,at=Date.now(),timedOut=false):TrainingAnswer {
  const q=session.questions[session.index];if(!q || session.status!=='active')throw new Error('Session has no active question.');
  const sequenceIndex=q.sequence?session.answers.filter(a=>a.questionId===q.id).length:0;
  if(sequenceIndex>=(q.sequence?.length??1) || session.answers.some(a=>a.questionId===q.id&&a.sequenceIndex===sequenceIndex))throw new Error('Answer already recorded.');
  return {questionId:q.id,positionId:q.sequence?.[sequenceIndex]??q.positionId,selected,correct:!timedOut&&this.check(q,selected,sequenceIndex),reactionMs:Math.max(0,Math.round(reactionMs)),at,mode:session.mode,alias:q.alias,audio:q.audio,round:session.mode==='round',timedOut,sequenceIndex,aided:false};
 }
}
export class ListeningTrainingEngine {
 static utterances(q:Question,dictionary:PositionDictionaryService) {return q.sequence?q.sequence.map(id=>dictionary.name(id,q.language)):[q.text];}
}
export class ProgressTrackingService {
 static record(data:AppData,sessionId:string,answer:TrainingAnswer):AppData {
  const next=structuredClone(data);const s=next.sessions.find(s=>s.id===sessionId);if(!s||s.status!=='active')throw new Error('Session is not active.');
  if(s.answers.some(a=>a.questionId===answer.questionId&&a.sequenceIndex===answer.sequenceIndex))throw new Error('Duplicate answer.');
  s.answers.push(answer);next.progress[answer.positionId]=SpacedRepetitionEngine.review(next.progress[answer.positionId],answer);
  if(!answer.correct&&!next.review.includes(answer.positionId))next.review.push(answer.positionId);
  if(answer.correct&&SpacedRepetitionEngine.mastered(next.progress[answer.positionId]))next.review=next.review.filter(id=>id!==answer.positionId);
  const q=s.questions[s.index];if(!q.sequence || s.answers.filter(a=>a.questionId===q.id).length>=q.sequence.length)s.index++;
  if(s.index>=s.questions.length){s.status='complete';s.endedAt=answer.at;next.activeSessionId=null;}
  return next;
 }
}
export function achievements(data:AppData,ids:string[]) {
 const s=StatisticsService.calculate(data,ids);const a=allAnswers(data);return [
 {id:'first',name:'First Callout',description:'Answer one callout correctly.',earned:a.some(a=>a.correct)},
 {id:'fast',name:'Fast Reaction',description:'Five correct speed answers under 2 seconds.',earned:a.filter(a=>a.mode==='speed'&&a.correct&&a.reactionMs<2000).length>=5},
 {id:'perfect',name:'Perfect Round',description:'Complete a round without mistakes.',earned:data.sessions.some(s=>s.mode==='round'&&s.status==='complete'&&s.answers.length>0&&s.answers.every(a=>a.correct))},
 {id:'listening',name:'Listening Expert',description:'At least 20 audio answers at 90% accuracy.',earned:s.audio.length>=20&&s.audio.filter(a=>a.correct).length/s.audio.length>=.9},
 {id:'master',name:'Mirage Master',description:'Master every position in the verified pack.',earned:s.total>0&&s.learned===s.total},
 {id:'ready',name:'Match Ready',description:'Reach 85% calculated readiness.',earned:CommunicationReadinessCalculator.calculate(data,ids)>=85},
 ];
}
