import type { Dictionary, Language, RoundScenario } from './model.ts';
export interface AudioPhrase { id:string; positionId:string; mapId:string; language:Language; text:string; variant:string; alias:boolean; file:string }
export interface AudioEntry extends AudioPhrase { fingerprint:string; sha256:string; duration:number; sampleRate:number; channels:number; codec:'vorbis'; peakDb:number; voice:string }
export interface AudioManifest { version:1; generatedAt:string; entries:AudioEntry[]; languages:Record<string,{status:string;voice:string|null;phrases:number}>; [key:string]:unknown }
/** Shared with the training engine and generator; this is not a second position dictionary. */
export const calloutTemplates:Record<Language,Record<string,string>>={
 en:{name:'{name}',one:'One {name}!',two:'Two {name}!',enemy:'Enemy {name}!',last:'Last one {name}!',pushing:"They're pushing {name}!",spotted:'Enemy spotted at {name}!',near:'Enemy near {name}!',watch:'Watch {name}!',context:'Enemy at {name}!'},
 uk:{name:'{name}',one:'Один: {name}!',two:'Двоє: {name}!',enemy:'Противник: {name}!',last:'Останній: {name}!',pushing:'Вони йдуть: {name}!',spotted:'Противник: {name}!',near:'Противник поруч: {name}!',watch:'Перевір: {name}!',context:'Противник: {name}!'}
};
export function calloutMessage(language:Language,variant:string,name:string){const template=calloutTemplates[language][variant];if(!template)throw new Error('Unknown message variant');return template.replace('{name}',name);}
const slug=(name:string)=>name.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
export const normalizeAudioText=(text:string)=>text.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function buildAudioCatalog(data:Dictionary,scenarios:RoundScenario[]):AudioPhrase[]{
 const phrases:AudioPhrase[]=[];const ids=new Set<string>();
 const sources=new Set(data.sources.map(s=>s.id));
 for(const position of data.positions.filter(p=>p.verified&&p.sourceIds.length&&p.sourceIds.every(id=>sources.has(id)))){
  if(!data.maps.some(m=>m.id===position.mapId&&m.available))continue;
  const localId=position.id.startsWith(position.mapId+'.')?position.id.slice(position.mapId.length+1):position.id;
  for(const language of ['en','uk'] as const){
   const primary=data.translations.find(t=>t.positionId===position.id&&t.language===language&&sources.has(t.sourceId));if(!primary)continue;
   const names=[{name:primary.name,key:'primary',alias:false},...data.aliases.filter(a=>a.positionId===position.id&&a.language===language&&a.verified&&sources.has(a.sourceId)).map(a=>({name:a.name,key:'alias-'+slug(a.name),alias:true}))];
   const add=(name:{name:string;key:string;alias:boolean},variant:string,text:string)=>{
    const id=`${language}.${position.id}.${variant}.${name.key}`;if(ids.has(id))throw new Error('Duplicate audio phrase ID: '+id);ids.add(id);
    phrases.push({id,positionId:position.id,mapId:position.mapId,language,text,variant,alias:name.alias,file:`generated/${language}/${position.mapId}/${localId}/${variant}--${name.key}.ogg`});
   };
   for(const name of names){
    for(const variant of Object.keys(calloutTemplates[language]))add(name,variant,calloutMessage(language,variant,name.name));
    for(const scenario of scenarios.filter(s=>s.mapId===position.mapId))scenario.events.forEach((event,i)=>{
     if(event.positionId!==position.id)return;const text=event[language].replace('{name}',name.name);
     if(!phrases.some(p=>p.language===language&&p.positionId===position.id&&p.text===text))add(name,`scenario-${scenario.id}-${i+1}`,text);
    });
   }
  }
 }
 return phrases.sort((a,b)=>a.id.localeCompare(b.id));
}
export function validateAudioManifest(input:unknown):AudioManifest{
 if(!input||typeof input!=='object')throw new Error('Invalid audio manifest');const m=input as AudioManifest;
 if(m.version!==1||!Array.isArray(m.entries)||m.entries.length>50000||!m.languages||typeof m.languages!=='object')throw new Error('Invalid audio manifest schema');
 const ids=new Set<string>();for(const e of m.entries){
  if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.positionId!=='string'||typeof e.mapId!=='string'||!['en','uk'].includes(e.language)||typeof e.text!=='string'||!e.text.trim()||e.text.length>1000||typeof e.variant!=='string'||typeof e.alias!=='boolean')throw new Error('Invalid audio phrase');ids.add(e.id);
  if(typeof e.file!=='string'||!/^generated\/(en|uk)\/[a-z0-9._-]+\/[a-z0-9._-]+\/[a-z0-9._-]+\.ogg$/.test(e.file)||e.file.includes('..')||e.file.split('/')[1]!==e.language)throw new Error('Unsafe audio file path');
  if(e.codec!=='vorbis'||!Number.isFinite(e.duration)||e.duration<=0||!Number.isFinite(e.sampleRate)||e.sampleRate<8000||!Number.isInteger(e.channels)||e.channels<1||!Number.isFinite(e.peakDb)||e.peakDb>=0||typeof e.voice!=='string'||!e.voice||!/^[a-f0-9]{64}$/.test(e.sha256)||!/^[a-f0-9]{64}$/.test(e.fingerprint))throw new Error('Invalid audio metadata');
 }
 return m;
}
