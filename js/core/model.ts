export type Language = 'en' | 'uk';
export type Level = 0 | 1 | 2 | 3;
export type Mode = 'flashcards' | 'choice' | 'reverse' | 'locate' | 'speed' | 'listen' | 'listen-locate' | 'multi' | 'voice' | 'speak' | 'round' | 'mistakes' | 'placement';
export interface UserSettings {
  name: string; native: Language; target: Language; initial: 'beginner' | 'intermediate' | 'advanced';
  mapId: string; difficulty: 'auto' | Level; rate: number; volume: number; subtitles: boolean;
  audioMode:'recorded'|'system'|'off'; recordedRate:number; audioLanguage: 'adaptive' | Language; roundMode: 'training' | 'normal' | 'competitive' | 'reverse'; onboarding: boolean;
}
export interface GameMap { id: string; name: string; available: boolean; layers: {id:string; name:string}[] }
export interface Position { id: string; mapId: string; layerId:string; zone: 'A'|'B'|'Mid'; x:number; y:number; verified:boolean; sourceIds:string[] }
export interface PositionTranslation { positionId:string; language:Language; name:string; sourceId:string }
export interface PositionAlias { positionId:string; language:Language; name:string; sourceId:string; verified:boolean }
export interface PositionSource { id:string; title:string; url:string; checkedAt:string; notes:string }
export interface Dictionary { version:number; maps:GameMap[]; positions:Position[]; translations:PositionTranslation[]; aliases:PositionAlias[]; sources:PositionSource[] }
export interface LearningProgress {
  positionId:string; correct:number; errors:number; totalMs:number; lastReview:number; nextReview:number;
  interval:number; ease:number; repetitions:number; streak:number; types:Partial<Record<Mode,{correct:number;total:number}>>;
}
export interface Question { id:string; positionId:string; language:Language; answerLanguage:Language; text:string; alias:boolean; audio:boolean; locate:boolean; input:boolean; options:string[]; limitMs:number; sequence?:string[] }
export interface TrainingAnswer { questionId:string; positionId:string; selected:string; correct:boolean; reactionMs:number; at:number; mode:Mode; alias:boolean; audio:boolean; round:boolean; timedOut:boolean; sequenceIndex:number; aided:boolean }
export interface TrainingSession { id:string; mapId:string; mode:Mode; startedAt:number; endedAt:number|null; level:Level; questions:Question[]; answers:TrainingAnswer[]; index:number; status:'active'|'complete'; roundMode?:UserSettings['roundMode']; scenarioId?:string }
export interface RoundEvent { positionId:string; en:string; uk:string }
export interface RoundScenario { id:string; mapId:string; name:string; side:'CT'|'T'; events:RoundEvent[] }
export interface Achievement { id:string; name:string; description:string; earned:boolean }
export interface AppData { version:2; settings:UserSettings; progress:Record<string,LearningProgress>; sessions:TrainingSession[]; review:string[]; activeSessionId:string|null; dictionary:Dictionary|null }
export const defaultSettings:UserSettings = {name:'Player',native:'uk',target:'en',initial:'beginner',mapId:'mirage',difficulty:'auto',rate:1,volume:0.8,subtitles:false,audioMode:'recorded',recordedRate:1,audioLanguage:'adaptive',roundMode:'training',onboarding:false};
export const emptyData = ():AppData => ({version:2,settings:{...defaultSettings},progress:{},sessions:[],review:[],activeSessionId:null,dictionary:null});
export const modes:Mode[]=['flashcards','choice','reverse','locate','speed','listen','listen-locate','multi','voice','speak','round','mistakes','placement'];
