import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const origin='https://callout.test/';
test('production HTML and app-linked assets exist without external runtime requests',async()=>{
 const html=await readFile('dist/index.html','utf8');
 assert.ok(!html.includes('/js/main.ts'));
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(match[1].startsWith('http'))assert.fail('Unexpected remote app resource');
  await stat('dist/'+match[1].replace(/^\.\//,'').replace(/^\//,''));
 }
 for(const path of ['dist/assets/maps/mirage.svg','dist/assets/callout.svg','dist/404.html','dist/CNAME','dist/docs/metrics.md','dist/manifest.webmanifest','dist/sw.js'])await stat(path);
 const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));assert.equal(manifest.name,'Callout');
});
test('production service worker precaches existing resources and serves navigation plus map while offline',async()=>{
 const handlers={};const storage=new Map();const deleted=[];let claimed=false;
 const resolveUrl=value=>new URL(typeof value==='string'?value:value.url,origin).href;
 const cache={
  async addAll(urls){for(const url of urls){const path=new URL(url,origin).pathname;const content=await readFile('dist/'+(path==='/'?'index.html':path.slice(1)));storage.set(resolveUrl(url),new Response(content));}},
  async match(request){return storage.get(resolveUrl(request))?.clone();}
 };
 const caches={open:async()=>cache,keys:async()=>['unrelated-app','callout-static-old'],delete:async key=>{deleted.push(key);return true;}};
 const self={location:{origin:new URL(origin).origin},clients:{claim:async()=>{claimed=true;}},addEventListener(name,handler){handlers[name]=handler;}};
 const code=await readFile('dist/sw.js','utf8');runInNewContext(code,{self,caches,URL,fetch:async()=>{throw new Error('Offline');}});
 let install;handlers.install({waitUntil:promise=>{install=promise;}});await install;
 let activate;handlers.activate({waitUntil:promise=>{activate=promise;}});await activate;
 assert.deepEqual(deleted,['callout-static-old']);assert.ok(claimed);
 for(const [path,mode] of [['assets/maps/mirage.svg','cors'],['new-unvisited-route','navigate'],['index.html','navigate']]){
  let response;handlers.fetch({request:{method:'GET',url:origin+path,mode},respondWith:promise=>{response=promise;}});
  const result=await response;assert.equal(result.status,200);const body=await result.text();assert.ok(body.includes(path.endsWith('.svg')?'<svg':'Callout'));
 }
 let intercepted=false;handlers.fetch({request:{method:'GET',url:'https://external.test/track',mode:'cors'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
});

test('production supports an empty audio library and excludes generator/model/WAV files',async()=>{
 const {readdir}=await import('node:fs/promises');const {createHash}=await import('node:crypto');
 const manifest=JSON.parse(await readFile('dist/assets/audio/manifest.json','utf8'));
 assert.ok(Array.isArray(manifest.entries));
 for(const entry of manifest.entries){const bytes=await readFile('dist/assets/audio/'+entry.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(bytes.subarray(0,4).toString(),'OggS');}
 const files=await readdir('dist',{recursive:true});assert.ok(files.every(p=>!/(\.onnx(?:\.json)?$|\.wav$|\.py$|\.venv)/i.test(p)));
 const worker=await readFile('dist/sw.js','utf8');for(const entry of manifest.entries)assert.ok(worker.includes('assets/audio/'+entry.file));
});
