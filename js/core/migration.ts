import { dictionary, PositionDictionaryService, scenarios } from './dictionary.ts';
/** Upgrade the previous English/Russian snapshot without dropping progress or stable IDs. */
export function migrateData(input:unknown):unknown {
 if(!input||typeof input!=='object'||Array.isArray(input))return input;
 const original=input as Record<string,any>;if(original.version===2){if(original.settings&&typeof original.settings==='object'&&(original.settings.audioMode===undefined||original.settings.recordedRate===undefined)){const updated=structuredClone(original);updated.settings.audioMode??='recorded';updated.settings.recordedRate??=1;return updated;}return input;}if(original.version!==1)return input;
 const d=structuredClone(original);const dict=new PositionDictionaryService(dictionary);
 const legacyLanguage=(lang:unknown)=>lang==='ru'?'uk':lang;
 if(d.settings&&typeof d.settings==='object'){
  for(const key of ['native','target','audioLanguage'])d.settings[key]=legacyLanguage(d.settings[key]);
 }
 const known=new Set(dictionary.positions.map(p=>p.id));
 if(d.dictionary!==null){
  if(!d.dictionary||!Array.isArray(d.dictionary.positions))throw new Error('Invalid legacy dictionary');
  if(d.dictionary.positions.some((p:any)=>!known.has(p.id)))throw new Error('The old dictionary contains custom positions. Export it and add reviewed Ukrainian translations before migrating.');
 }
 d.dictionary=null; // Use the corrected built-in radar/translation pack; personal progress is separate.
 if(Array.isArray(d.sessions))for(const s of d.sessions){
  if(!Array.isArray(s.questions))continue;
  const oldQuestions=new Map<string,any>();
  for(const q of s.questions){
   oldQuestions.set(q.id,{...q});const oldLanguage=q.language;
   q.language=legacyLanguage(q.language);q.answerLanguage=legacyLanguage(q.answerLanguage);
   if(oldLanguage==='ru'&&known.has(q.positionId)){
    const name=dict.name(q.positionId,'uk');const event=scenarios.find(x=>x.id===s.scenarioId)?.events.find(x=>x.positionId===q.positionId);
    q.text=s.mode==='round'&&event?event.uk.replace('{name}',name):s.mode==='voice'?`Один: ${name}!`:name;
    q.alias=false;
   }
  }
  if(Array.isArray(s.answers))for(const answer of s.answers){
   const old=oldQuestions.get(answer.questionId);
   // Old-language listening evidence is not Ukrainian listening evidence.
   if(old?.language==='ru')answer.audio=false;
   if(old?.alias&&old.language==='ru')answer.alias=false;
   // A correctly typed historical name may be relabelled; wrong free-text input is retained verbatim.
   if(old?.input&&old.answerLanguage==='ru'&&answer.correct&&known.has(answer.positionId))answer.selected=dict.name(answer.positionId,'uk');
  }
 }
 d.version=2;if(d.settings&&typeof d.settings==='object'){d.settings.audioMode??='recorded';d.settings.recordedRate??=1;}return d;
}
