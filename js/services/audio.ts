import type { Language, UserSettings } from '../core/model.ts';
import { normalizeAudioText, validateAudioManifest, type AudioEntry, type AudioManifest } from '../core/audio-catalog.ts';
import { BrowserVoiceService } from './voice.ts';
export interface AudioRequest { positionId:string; text:string; phraseId?:string }
interface AudioDependencies { baseURL?:string; fetcher?:typeof fetch; createAudio?:(url:string)=>HTMLAudioElement; system?:BrowserVoiceService }
/** The application only sees the synchronized static pack, never a local model or generator path. */
export class AudioCalloutService {
 private system:BrowserVoiceService;private fetcher:typeof fetch;private createAudio:(url:string)=>HTMLAudioElement;private baseURL:string;
 private manifest:AudioManifest|null=null;private loaded=false;private loading:Promise<void>|null=null;
 private cache=new Map<string,HTMLAudioElement>();private generation=0;private stopCurrent:(()=>void)|null=null;
 lastError:string|null=null;lastSource:'recorded'|'system'|'mixed'|'none'='none';
 constructor(deps:AudioDependencies={}){this.system=deps.system??new BrowserVoiceService();this.fetcher=deps.fetcher??fetch;this.createAudio=deps.createAudio??(url=>new Audio(url));this.baseURL=(deps.baseURL??'./').replace(/\/?$/,'/');}
 voices(){return this.system.voices();}
 recordedCount(language:Language){return this.manifest?.entries.filter(e=>e.language===language).length??0;}
 available(language:Language,settings?:UserSettings){if(settings?.audioMode==='off')return false;return (settings?.audioMode!=='system'&&this.recordedCount(language)>0)||this.system.available(language);}
 async prepare(){await Promise.all([this.loadManifest(),this.system.prepare()]);}
 private async loadManifest(){
  if(this.loaded)return;if(this.loading)return this.loading;
  this.loading=(async()=>{const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),2500);
   try{const response=await this.fetcher(this.baseURL+'assets/audio/manifest.json',{signal:abort.signal});if(!response.ok)throw new Error('Audio manifest unavailable');this.manifest=validateAudioManifest(await response.json());}
   catch{this.manifest=null;}finally{clearTimeout(timeout);this.loaded=true;this.loading=null;}
  })();return this.loading;
 }
 findByPosition(positionId:string,language:Language,variant='name'){return this.manifest?.entries.find(e=>e.positionId===positionId&&e.language===language&&e.variant===variant&&!e.alias);}
 private find(request:AudioRequest,language:Language){return this.manifest?.entries.find(e=>e.language===language&&(!request.positionId||e.positionId===request.positionId)&&(!request.phraseId||e.id===request.phraseId)&&normalizeAudioText(e.text)===normalizeAudioText(request.text));}
 private media(entry:AudioEntry){
  const url=this.baseURL+'assets/audio/'+entry.file;let audio=this.cache.get(url);
  if(!audio){audio=this.createAudio(url);audio.preload='auto';audio.load();this.cache.set(url,audio);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value!);}
  return audio;
 }
 async preload(requests:AudioRequest[],language:Language){await this.loadManifest();for(const request of requests.slice(0,16)){const entry=this.find(request,language);if(entry)try{this.media(entry);}catch{/* Playback has a system fallback. */}}}
 cancel(){this.generation++;this.stopCurrent?.();this.stopCurrent=null;this.system.cancel();}
 async speak(texts:string[],language:Language,settings:UserSettings,positionIds?:string[]){
  return this.play(texts.map((text,i)=>({text,positionId:positionIds?.[i]??''})),language,settings);
 }
 async play(requests:AudioRequest[],language:Language,settings:UserSettings):Promise<boolean>{
  this.cancel();const token=this.generation;this.lastError=null;this.lastSource='none';
  if(settings.audioMode==='off'){this.lastError='disabled';return false;}if(settings.volume<=0){this.lastError='muted';return false;}
  if(!this.loaded&&settings.audioMode!=='system')await this.loadManifest();if(token!==this.generation)return false;
  const sources=new Set<'recorded'|'system'>();
  for(const request of requests){
   if(token!==this.generation)return false;const entry=settings.audioMode!=='system'?this.find(request,language):undefined;
   let success=false;
   if(entry){success=await this.playRecording(entry,settings);if(token!==this.generation)return false;if(success)sources.add('recorded');else if(this.lastError==='not-allowed')return false;}
   if(!success){success=await this.system.speak([request.text],language,settings);if(token!==this.generation)return false;if(success){sources.add('system');this.lastError=null;}else{this.lastError=this.system.lastError;return false;}}
  }
  this.lastSource=sources.size>1?'mixed':sources.has('recorded')?'recorded':sources.has('system')?'system':'none';return requests.length>0;
 }
 private playRecording(entry:AudioEntry,settings:UserSettings):Promise<boolean>{
  let media:HTMLAudioElement;try{media=this.media(entry);if(media.canPlayType&&media.canPlayType('audio/ogg; codecs="vorbis"')===''){this.lastError='unsupported-codec';return Promise.resolve(false);}}catch{this.lastError='unsupported';return Promise.resolve(false);}
  media.volume=settings.volume;media.playbackRate=settings.recordedRate??1;media.preservesPitch=true;
  try{media.currentTime=0;}catch{}
  return new Promise(resolve=>{
   let finished=false;let watchdog:ReturnType<typeof setTimeout>;
   const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(watchdog);media.onended=null;media.onerror=null;this.stopCurrent=null;if(!ok)media.pause();resolve(ok);};
   this.stopCurrent=()=>{finish(false);try{media.currentTime=0;}catch{}};
   media.onended=()=>finish(true);media.onerror=()=>{this.lastError='playback-error';finish(false);};
   watchdog=setTimeout(()=>{this.lastError='timeout';finish(false);},Math.max(10000,entry.duration/(settings.recordedRate??1)*1000+6000));
   try{Promise.resolve(media.play()).catch(error=>{this.lastError=error?.name==='NotAllowedError'?'not-allowed':'playback-error';finish(false);});}catch{this.lastError='playback-error';finish(false);}
  });
 }
}
