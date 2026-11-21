import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AudioCalloutService } from '../js/services/audio.ts';
import { BrowserVoiceService } from '../js/services/voice.ts';
import { defaultSettings, emptyData, modes, type Language, type UserSettings } from '../js/core/model.ts';
import { dictionary, scenarios, PositionDictionaryService } from '../js/core/dictionary.ts';
import { buildAudioCatalog, normalizeAudioText, validateAudioManifest } from '../js/core/audio-catalog.ts';
import { exerciseAudio } from '../js/core/exercise-audio.ts';
import { LearningEngine } from '../js/core/engines.ts';
import { migrateData } from '../js/core/migration.ts';
import { validateData } from '../js/core/validation.ts';
const bundledManifest=validateAudioManifest(JSON.parse(await readFile('assets/audio/manifest.json','utf8')));
// In-memory metadata only: service tests do not require or recreate voice files.
const manifest=validateAudioManifest({version:1,generatedAt:'test-fixture',languages:{en:{status:'ready',voice:'en_US-ryan-medium',phrases:230}},entries:buildAudioCatalog(dictionary,scenarios).filter(p=>p.language==='en').map(p=>({...p,fingerprint:'0'.repeat(64),sha256:'0'.repeat(64),duration:1,sampleRate:22050,channels:1,codec:'vorbis',peakDb:-3,voice:'en_US-ryan-medium'}))});
const dict=new PositionDictionaryService();
class FakeSystem extends BrowserVoiceService {
 calls:{texts:string[];language:Language;settings:UserSettings}[]=[];works=true;
 async prepare(){} voices(){return [];} available(){return this.works;}
 async speak(texts:string[],language:Language,settings:UserSettings){this.calls.push({texts,language,settings});this.lastError=this.works?null:'no-local-voice';return this.works;}
 cancel(){}
}
class FakeMedia {
 src:string;preload='';volume=1;playbackRate=1;preservesPitch=false;currentTime=0;loads=0;plays=0;pauses=0;defer=false;reject=false;codec=true;
 onended:(()=>void)|null=null;onerror:(()=>void)|null=null;
 constructor(src:string){this.src=src;}load(){this.loads++;}pause(){this.pauses++;}canPlayType(){return this.codec?'probably':'';}
 play(){this.plays++;if(this.reject)return Promise.reject(Object.assign(new Error('Autoplay blocked'),{name:'NotAllowedError'}));if(!this.defer)queueMicrotask(()=>this.onended?.());return Promise.resolve();}
}
function setup({missing=false,defer=false,reject=false,codec=true}={}){const media:FakeMedia[]=[];const system=new FakeSystem();const service=new AudioCalloutService({baseURL:'/trainer/',system,fetcher:(async()=>missing?new Response('',{status:404}):Response.json(manifest)) as typeof fetch,createAudio:url=>{const m=new FakeMedia(url);m.defer=defer;m.reject=reject;m.codec=codec;media.push(m);return m as unknown as HTMLAudioElement;}});return {service,system,media};}
const request={positionId:'mirage.window',text:'One Window!'};
test('prepared catalog covers all verified English names, aliases and every generated exercise/round prompt',()=>{
 const catalog=buildAudioCatalog(dictionary,scenarios);assert.equal(catalog.filter(p=>p.language==='en').length,230);assert.equal(manifest.entries.length,230);
 const keys=new Set(manifest.entries.map(e=>`${e.language}|${e.positionId}|${normalizeAudioText(e.text)}`));
 for(const native of ['en','uk'] as const)for(const level of [0,1,2,3] as const)for(const mode of modes){const d=emptyData();d.settings.native=native;d.settings.target=native==='uk'?'en':'uk';d.settings.difficulty=level;if(mode==='mistakes')d.review=dictionary.positions.map(p=>p.id);
  for(const random of [()=>.05,()=>.4,()=>.95]){const session=new LearningEngine(dict).start(d,mode,1,1000,random);for(const q of session.questions){const audio=exerciseAudio(q,mode,dict,d.settings);for(const r of audio.requests)if(audio.language==='en')assert.ok(keys.has(`en|${r.positionId}|${normalizeAudioText(r.text)}`),`${mode}: ${r.text}`);}}
 }
 for(const e of manifest.entries){assert.equal(e.voice,'en_US-ryan-medium');assert.equal(e.codec,'vorbis');assert.equal(e.sampleRate,22050);assert.ok(e.peakDb<0);}
});
test('catalog excludes unverified positions, unverified aliases and unavailable maps',()=>{const d=structuredClone(dictionary);d.positions[0].verified=false;d.aliases[0].verified=false;const catalog=buildAudioCatalog(d,scenarios);assert.ok(catalog.every(e=>e.positionId!==d.positions[0].id));assert.ok(catalog.every(e=>!e.text.includes("Sniper's Nest")));assert.ok(catalog.every(e=>e.mapId==='mirage'));assert.equal(new Set(catalog.map(p=>p.id)).size,catalog.length);});
test('every synchronized recording has its manifest checksum and an Ogg header',async()=>{for(const entry of bundledManifest.entries){const bytes=await readFile('assets/audio/'+entry.file);assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}});
test('Ryan playback is selected by position/language, applies volume and never reapplies processing speed',async()=>{const {service,system,media}=setup();system.works=false;await service.prepare();assert.equal(service.findByPosition('mirage.window','en')?.text,'Window');assert.equal(await service.play([request],'en',{...defaultSettings,rate:1.5,volume:.45}),true);assert.equal(media[0].src,'/trainer/assets/audio/generated/en/mirage/window/one--primary.ogg');assert.equal(media[0].playbackRate,1);assert.equal(media[0].volume,.45);assert.equal(service.lastSource,'recorded');assert.equal(system.calls.length,0);});
test('recording speed changes only through the explicit recording-speed preference',async()=>{const {service,media}=setup();await service.prepare();await service.play([request],'en',{...defaultSettings,recordedRate:1.25,rate:.5});assert.equal(media[0].playbackRate,1.25);assert.equal(media[0].preservesPitch,true);});
test('preloading does not play sound and sequence playback reuses cached clips in order',async()=>{const {service,media}=setup();const requests=[request,{positionId:'mirage.connector',text:'Two Connector!'}];await service.preload(requests,'en');assert.equal(media.length,2);assert.equal(media.reduce((n,m)=>n+m.plays,0),0);assert.equal(await service.play(requests,'en',defaultSettings),true);assert.equal(media.length,2);assert.deepEqual(media.map(m=>m.plays),[1,1]);assert.deepEqual(media.map(m=>m.loads),[1,1]);});
test('a new call stops previous recording; cancellation never falls back to late system speech',async()=>{const {service,media,system}=setup({defer:true});await service.prepare();const previous=service.play([request],'en',defaultSettings);assert.equal(media[0].plays,1);const next=service.play([{positionId:'mirage.connector',text:'Connector'}],'en',defaultSettings);assert.equal(await previous,false);assert.ok(media[0].pauses>=1);assert.equal(media[0].currentTime,0);media[1].onended?.();assert.equal(await next,true);assert.equal(system.calls.length,0);});
test('Ukrainian, missing recordings and unsupported Vorbis use the system fallback with the correct language',async()=>{const {service,system}=setup();await service.prepare();assert.equal(await service.speak(['Вікно'],'uk',defaultSettings,['mirage.window']),true);assert.equal(system.calls[0].language,'uk');assert.equal(service.lastSource,'system');await service.play([{...request,positionId:'not-in-pack'}],'en',defaultSettings);assert.equal(system.calls.length,2);const unsupported=setup({codec:false});await unsupported.service.prepare();assert.equal(await unsupported.service.play([request],'en',defaultSettings),true);assert.equal(unsupported.system.calls.length,1);});
test('system-only bypasses recordings; off and zero volume prevent all playback',async()=>{const {service,media,system}=setup();await service.prepare();assert.equal(await service.play([request],'en',{...defaultSettings,audioMode:'system'}),true);assert.equal(media.length,0);assert.equal(system.calls.length,1);assert.equal(await service.play([request],'en',{...defaultSettings,audioMode:'off'}),false);assert.equal(service.lastError,'disabled');assert.equal(await service.play([request],'en',{...defaultSettings,volume:0}),false);assert.equal(service.lastError,'muted');assert.equal(system.calls.length,1);});
test('browser autoplay denial is reported honestly; missing manifest still permits system fallback',async()=>{const denied=setup({reject:true});await denied.service.prepare();assert.equal(await denied.service.play([request],'en',defaultSettings),false);assert.equal(denied.service.lastError,'not-allowed');assert.equal(denied.system.calls.length,0);const missing=setup({missing:true});assert.equal(await missing.service.play([request],'en',defaultSettings),true);assert.equal(missing.service.lastSource,'system');});
test('manifest rejects unsafe file paths and duplicates; old preferences migrate to Ryan at 1x',()=>{const bad=structuredClone(manifest);bad.entries[0].file='../../model.onnx';assert.throws(()=>validateAudioManifest(bad));const duplicate=structuredClone(manifest);duplicate.entries.push(duplicate.entries[0]);assert.throws(()=>validateAudioManifest(duplicate));const old:any=emptyData();delete old.settings.audioMode;delete old.settings.recordedRate;const next=validateData(migrateData(old),dictionary);assert.equal(next.settings.audioMode,'recorded');assert.equal(next.settings.recordedRate,1);assert.equal(old.settings.audioMode,undefined);});
test('reverse production exposes pronunciation only as an explicit aided hint',()=>{const d=emptyData();d.settings.roundMode='reverse';const session=new LearningEngine(dict).start(d,'round');assert.ok(session.questions.every(q=>!q.audio));const prompt=exerciseAudio(session.questions[0],'round',dict,d.settings);assert.equal(prompt.revealsAnswer,true);assert.equal(prompt.language,d.settings.target);});

test('empty prepared audio pack falls back to the system without creating a recording',async()=>{const system=new FakeSystem();const service=new AudioCalloutService({system,fetcher:(async()=>Response.json({...manifest,entries:[]})) as typeof fetch,createAudio:()=>{throw new Error('No recording should be opened');}});assert.equal(await service.play([request],'en',defaultSettings),true);assert.equal(service.recordedCount('en'),0);assert.equal(service.lastSource,'system');assert.equal(system.calls.length,1);});
