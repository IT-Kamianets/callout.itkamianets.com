import { defineConfig } from 'vite';
import { resolve, join, relative, dirname } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validateAudioManifest } from './js/core/audio-catalog.ts';
import { createHash } from 'node:crypto';
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);}
export default defineConfig({
 base:'./',
 build:{rollupOptions:{input:{main:resolve('index.html'),error:resolve('404.html')}}},
 plugins:[{name:'static-resources-and-offline',closeBundle(){
  copyFileSync('CNAME','dist/CNAME');cpSync('assets/maps','dist/assets/maps',{recursive:true});copyFileSync('assets/callout.svg','dist/assets/callout.svg');cpSync('docs','dist/docs',{recursive:true});
  const audio=validateAudioManifest(JSON.parse(readFileSync('assets/audio/manifest.json','utf8')));
  for(const entry of audio.entries){const destination=join('dist/assets/audio',entry.file);mkdirSync(dirname(destination),{recursive:true});copyFileSync(join('assets/audio',entry.file),destination);}
  mkdirSync('dist/assets/audio',{recursive:true});copyFileSync('assets/audio/manifest.json','dist/assets/audio/manifest.json');
  const resources=files('dist').filter(p=>!p.endsWith('/sw.js'));const urls=resources.map(p=>'./'+relative('dist',p).replaceAll('\\','/'));
  const hash=createHash('sha256');for(const file of resources)hash.update(readFileSync(file));const version=hash.digest('hex').slice(0,12);
  writeFileSync('dist/sw.js',`const CACHE='callout-static-${version}';const URLS=${JSON.stringify(['./',...urls])};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('callout-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request);if(cached)return cached;try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return await cache.match('./index.html');throw error;}}));});`);
 }}]
});
