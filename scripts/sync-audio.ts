import { readFile, mkdir, copyFile, rename, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dictionary, scenarios } from '../js/core/dictionary.ts';
import { buildAudioCatalog, validateAudioManifest } from '../js/core/audio-catalog.ts';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export async function syncAudio(source=process.env.CALLOUT_VOICES_DIR??'/home/dima/callout-voices'){
 const destination=resolve(project,'assets/audio');let manifestPath=resolve(source,'manifest.json');let external=true;
 try{await stat(manifestPath);}catch{manifestPath=resolve(destination,'manifest.json');external=false;}
 const manifest=validateAudioManifest(JSON.parse(await readFile(manifestPath,'utf8')));
 if(manifest.entries.length&&!manifest.entries.some(e=>e.language==='en'&&e.voice==='en_US-ryan-medium'))throw new Error('Ryan audio pack is missing. Run voices:generate first.');
 const expected=buildAudioCatalog(dictionary,scenarios).filter(p=>p.language==='en');
 for(const phrase of manifest.entries.length?expected:[]){const entry=manifest.entries.find(e=>e.id===phrase.id);if(!entry||entry.text!==phrase.text||entry.positionId!==phrase.positionId)throw new Error('Audio pack is out of date: '+phrase.id+'. Run npm run voices:generate.');}
 let copied=0;
 for(const entry of manifest.entries){
  const from=resolve(external?source:destination,entry.file),to=resolve(destination,entry.file);
  const bytes=await readFile(from);if(digest(bytes)!==entry.sha256)throw new Error('Audio checksum mismatch: '+entry.id);
  if(entry.language==='en'&&entry.voice!=='en_US-ryan-medium')throw new Error('English pack must use Ryan Medium');
  if(external){let same=false;try{same=digest(await readFile(to))===entry.sha256;}catch{}
   if(!same){await mkdir(dirname(to),{recursive:true});await copyFile(from,to+'.sync-tmp');await rename(to+'.sync-tmp',to);copied++;}
  }
 }
 if(external){await mkdir(destination,{recursive:true});const temp=resolve(destination,'manifest.json.sync-tmp');await copyFile(manifestPath,temp);await rename(temp,resolve(destination,'manifest.json'));}
 return {entries:manifest.entries.length,copied,source:external?'generator':'bundled',directory:relative(project,destination)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flag=process.argv.indexOf('--source');console.log(JSON.stringify(await syncAudio(flag>=0?process.argv[flag+1]:undefined)));
}
