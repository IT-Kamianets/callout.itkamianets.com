import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserVoiceService } from '../js/services/voice.ts';
import { defaultSettings } from '../js/core/model.ts';
class FakeSynthesis extends EventTarget {
 list:any[]=[];spoken:any[]=[];error:string|null=null;
 getVoices(){return this.list;}
 cancel(){}
 speak(utterance:any){this.spoken.push(utterance);queueMicrotask(()=>this.error?utterance.onerror({error:this.error}):utterance.onend());}
}
class FakeUtterance {text:string;constructor(text:string){this.text=text;}}
function install(synth:FakeSynthesis){Object.assign(globalThis,{window:{speechSynthesis:synth},SpeechSynthesisUtterance:FakeUtterance});}
const local=(lang:string)=>({name:lang+' local',lang,localService:true});
test('TTS waits for asynchronous voice loading, chooses uk-UA and applies actual settings',async()=>{const synth=new FakeSynthesis();install(synth);const voice=new BrowserVoiceService();assert.equal(voice.available('uk'),false);const result=voice.speak(['Вікно','Палац'],'uk',{...defaultSettings,rate:.8,volume:.6});synth.list=[local('en-US'),local('uk-UA')];synth.dispatchEvent(new Event('voiceschanged'));assert.equal(await result,true);assert.equal(synth.spoken.length,2);assert.equal(synth.spoken[0].lang,'uk-UA');assert.equal(synth.spoken[0].voice.lang,'uk-UA');assert.equal(synth.spoken[0].rate,.8);assert.equal(synth.spoken[0].volume,.6);assert.deepEqual(synth.spoken.map(u=>u.text),['Вікно','Палац']);});
test('missing Ukrainian voice never substitutes a Russian or remote voice',async()=>{const synth=new FakeSynthesis();synth.list=[local('ru-RU'),{name:'Remote UK',lang:'uk-UA',localService:false}];install(synth);const voice=new BrowserVoiceService();assert.equal(await voice.speak(['Вікно'],'uk',defaultSettings),false);assert.equal(voice.lastError,'no-local-voice');assert.equal(synth.spoken.length,0);});
test('known local voice starts inside the initiating gesture, before an async wait',async()=>{const synth=new FakeSynthesis();synth.list=[local('en-US')];install(synth);const result=new BrowserVoiceService().speak(['Window'],'en',defaultSettings);assert.equal(synth.spoken.length,1);assert.equal(await result,true);});
test('muted, unsupported and browser-blocked playback return explicit failures',async()=>{const synth=new FakeSynthesis();synth.list=[local('uk-UA')];install(synth);const voice=new BrowserVoiceService();assert.equal(await voice.speak(['Вікно'],'uk',{...defaultSettings,volume:0}),false);assert.equal(voice.lastError,'muted');synth.error='not-allowed';assert.equal(await voice.speak(['Вікно'],'uk',defaultSettings),false);assert.equal(voice.lastError,'not-allowed');Object.assign(globalThis,{window:{}});assert.equal(await voice.speak(['Window'],'en',defaultSettings),false);assert.equal(voice.lastError,'unsupported');});
test('leaving while voices load cancels pending speech instead of playing on another screen',async()=>{const synth=new FakeSynthesis();install(synth);const voice=new BrowserVoiceService();const pending=voice.speak(['Вікно'],'uk',defaultSettings);voice.cancel();synth.list=[local('uk-UA')];synth.dispatchEvent(new Event('voiceschanged'));assert.equal(await pending,false);assert.equal(synth.spoken.length,0);});
