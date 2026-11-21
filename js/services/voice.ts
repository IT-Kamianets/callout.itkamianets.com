import type { Language, UserSettings } from '../core/model.ts';
export interface VoiceCalloutService { speak(texts:string[],language:Language,settings:UserSettings):Promise<boolean>; cancel():void; available(language:Language):boolean }
/** Uses installed device voices only. No microphone, remote voice or language substitution. */
export class BrowserVoiceService implements VoiceCalloutService {
 private done:(()=>void)|null=null;
 private cancelWait:(()=>void)|null=null;
 private generation=0;
 lastError:string|null=null;
 private synthesis(){return typeof window!=='undefined'&&'speechSynthesis' in window?window.speechSynthesis:null;}
 voices(){try{return this.synthesis()?.getVoices()??[];}catch{return [];}}
 available(language:Language){return this.voices().some(v=>v.localService&&v.lang.toLowerCase().replace('_','-').split('-')[0]===language);}
 async prepare(timeoutMs=1500):Promise<void>{
  const synth=this.synthesis();if(!synth||this.voices().length)return;
  await new Promise<void>(resolve=>{
   let timeout:ReturnType<typeof setTimeout>;
   const finish=()=>{clearTimeout(timeout);synth.removeEventListener('voiceschanged',check);this.cancelWait=null;resolve();};
   const check=()=>{if(this.voices().length)finish();};
   this.cancelWait=finish;synth.addEventListener('voiceschanged',check);timeout=setTimeout(finish,timeoutMs);check();
  });
 }
 cancel(){this.generation++;this.done?.();this.done=null;this.cancelWait?.();this.cancelWait=null;try{this.synthesis()?.cancel();}catch{}}
 async speak(texts:string[],language:Language,settings:UserSettings):Promise<boolean>{
  this.cancel();const token=this.generation;this.lastError=null;const synth=this.synthesis();
  if(!synth){this.lastError='unsupported';return false;}
  // Keep the immediate path synchronous until speak() for browsers requiring a user gesture.
  if(!this.available(language))await this.prepare();
  if(token!==this.generation)return false;
  const voice=this.voices().find(v=>v.localService&&v.lang.toLowerCase().replace('_','-').split('-')[0]===language);
  if(!voice){this.lastError='no-local-voice';return false;}
  if(settings.volume===0){this.lastError='muted';return false;}
  return new Promise(resolve=>{
   let index=0,cancelled=false;let watchdog:ReturnType<typeof setTimeout>;
   const finish=(success:boolean)=>{clearTimeout(watchdog);cancelled=true;this.done=null;resolve(success);};
   this.done=()=>finish(false);
   const next=()=>{if(cancelled)return;clearTimeout(watchdog);if(index>=texts.length){finish(true);return;}
    const utterance=new SpeechSynthesisUtterance(texts[index++]);utterance.lang=language==='en'?'en-US':'uk-UA';utterance.voice=voice;utterance.rate=settings.rate;utterance.volume=settings.volume;
    utterance.onend=next;utterance.onerror=event=>{this.lastError=event.error||'playback-error';finish(false);};
    watchdog=setTimeout(()=>{this.lastError='timeout';finish(false);synth.cancel();},12000);
    try{synth.speak(utterance);}catch{this.lastError='playback-error';finish(false);}
   };next();
  });
 }
}
