#!/usr/bin/env python3
"""Build and validate the project's actual callout catalog with local Piper models."""
import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from datetime import datetime, timezone

SCRIPT_VERSION = 1
DEFAULT_PROJECT = Path('/home/dima/work/callout.itkamianets.com')
DEFAULT_ROOT = Path('/home/dima/callout-voices')
RECIPE = {'version': SCRIPT_VERSION, 'pitch': .95, 'tempo': 1.26, 'effective_speed': .95*1.26,
          'normalization': {'I': -18, 'TP': -2, 'LRA': 7, 'short_clip_peak': -3},
          'codec': 'libvorbis', 'quality': 5, 'channels': 1, 'piper_length_scale': 1}

def generation_fingerprint(phrase, model_signature, recipe, toolchain):
    signature={'phrase':phrase,'model':model_signature,'recipe':recipe,'toolchain':toolchain}
    return hashlib.sha256(json.dumps(signature,sort_keys=True,ensure_ascii=False).encode()).hexdigest()

def run(command):
    result = subprocess.run([str(x) for x in command], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{command[0]} exited {result.returncode}: {result.stderr[-2500:]}')
    return result

def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024*1024), b''): digest.update(chunk)
    return digest.hexdigest()

def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', dir=path.parent, suffix='.json.tmp', delete=False) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n'); handle.flush(); os.fsync(handle.fileno()); temporary = handle.name
    os.replace(temporary, path)

def probe(path):
    return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',path]).stdout)

def validate_audio(path):
    if not path.is_file() or path.stat().st_size < 100: raise RuntimeError(f'Empty or missing audio: {path}')
    data = probe(path); stream = next((s for s in data['streams'] if s['codec_type']=='audio'), None)
    if not stream or stream['codec_name'] != 'vorbis' or 'ogg' not in data['format']['format_name']:
        raise RuntimeError(f'Not OGG Vorbis: {path}')
    duration = float(data['format'].get('duration',stream.get('duration',0)))
    if duration <= .05 or not math.isfinite(duration): raise RuntimeError(f'Invalid duration: {path}')
    decoded=run(['ffmpeg','-hide_banner','-nostdin','-i',path,'-af','volumedetect','-f','null','-'])
    peak_match=re.search(r'max_volume:\s*([-\d.]+) dB',decoded.stderr)
    if not peak_match: raise RuntimeError(f'Cannot measure peak: {path}')
    peak=float(peak_match.group(1))
    if peak>=0: raise RuntimeError(f'Clipping detected: {path}: {peak} dBFS')
    return {'duration':duration,'sampleRate':int(stream['sample_rate']),'channels':stream['channels'],'codec':'vorbis','peakDb':peak}

def process_audio(wav_path, output):
    stream=next(s for s in probe(wav_path)['streams'] if s['codec_type']=='audio')
    rate=int(stream['sample_rate'])
    base=f'asetrate={rate}*0.95,aresample={rate},atempo=1.26'
    analysis=run(['ffmpeg','-hide_banner','-nostdin','-i',wav_path,'-af',base+',loudnorm=I=-18:TP=-2:LRA=7:print_format=json','-f','null','-'])
    match=re.search(r'\{\s*"input_i".*?\}',analysis.stderr,re.S)
    loudness=json.loads(match.group()) if match else {}
    keys=['input_i','input_tp','input_lra','input_thresh','target_offset']
    if all(k in loudness and math.isfinite(float(loudness[k])) for k in keys):
        normalization='loudnorm=I=-18:TP=-2:LRA=7:'+':'.join(f'{key}={loudness[source]}' for key,source in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])+':linear=true'
        method='two-pass loudnorm'
    else:
        # EBU integrated loudness is undefined for very short names. Peak-normalize those.
        measured=run(['ffmpeg','-hide_banner','-nostdin','-i',wav_path,'-af',base+',volumedetect','-f','null','-'])
        peak_match=re.search(r'max_volume:\s*([-\d.]+) dB',measured.stderr)
        if not peak_match: raise RuntimeError('Cannot normalize a silent Piper output')
        gain=min(18,-3-float(peak_match.group(1)));normalization=f'volume={gain}dB';method='short-clip peak normalization'
    run(['ffmpeg','-v','error','-nostdin','-y','-i',wav_path,'-af',base+','+normalization,'-ar',rate,'-ac','1','-c:a','libvorbis','-q:a','5',output])
    return rate,method

def find_models(root, uk_model):
    result={};en=root/'en_US-ryan-medium.onnx'
    for language, model in [('en',en),('uk',Path(uk_model).expanduser() if uk_model else None)]:
        if model is None:
            for config in sorted(root.glob('*.onnx.json')):
                metadata=json.loads(config.read_text())
                if str(metadata.get('language',{}).get('code','')).replace('-','_').split('_')[0]=='uk': model=Path(str(config)[:-5]);break
        if model is None or not model.is_file() or not Path(str(model)+'.json').is_file():
            if language=='en': raise RuntimeError('Ryan model and .onnx.json must exist in '+str(root))
            continue
        config=Path(str(model)+'.json');metadata=json.loads(config.read_text())
        actual=str(metadata.get('language',{}).get('code','')).replace('-','_').split('_')[0]
        if actual!=language: raise RuntimeError(f'Model {model} is {actual}, expected {language}. Refusing cross-language synthesis.')
        if language=='en' and model.name!='en_US-ryan-medium.onnx': raise RuntimeError('English requires the final Ryan Medium model')
        result[language]={'path':model,'config':config,'id':model.stem,'sha256':sha(model),'configSha256':sha(config),'declaredSampleRate':metadata.get('audio',{}).get('sample_rate')}
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',type=Path,default=DEFAULT_PROJECT);parser.add_argument('--root',type=Path,default=DEFAULT_ROOT)
    parser.add_argument('--uk-model',help='Optional local Piper Ukrainian model; language metadata must be uk')
    parser.add_argument('--no-sync',action='store_true');parser.add_argument('--verify-only',action='store_true')
    args=parser.parse_args();root=args.root.resolve();project=args.project.resolve()
    for program in ['ffmpeg','ffprobe','node']:
        if not shutil.which(program): raise RuntimeError('Missing executable: '+program)
    from piper import PiperVoice
    piper_version=importlib.metadata.version('piper-tts')
    toolchain={'piper':piper_version,'ffmpeg':run(['ffmpeg','-version']).stdout.splitlines()[0]}
    models=find_models(root,args.uk_model)
    catalog=json.loads(run(['node','--experimental-strip-types',project/'scripts/export-audio-catalog.ts']).stdout)
    atomic_json(root/'catalog.json',catalog)
    old=json.loads((root/'manifest.json').read_text()) if (root/'manifest.json').exists() else {'entries':[]}
    old_entries={entry['id']:entry for entry in old.get('entries',[])}
    voices={};entries=[];generated=skipped=unavailable=failed=0;started=time.monotonic()
    for language in ['en','uk']:
        phrases=[p for p in catalog['phrases'] if p['language']==language]
        if language not in models:
            unavailable+=len(phrases);print(f'{language}: model unavailable, {len(phrases)} phrases use system/text fallback.',flush=True);continue
        model=models[language]
        model_signature={k:v for k,v in model.items() if k not in ['path','config']}
        for phrase in phrases:
            fingerprint=generation_fingerprint(phrase,model_signature,RECIPE,toolchain)
            relative=Path(phrase['file']);target=(root/relative).resolve()
            if not target.is_relative_to(root/'generated') or target.suffix!='.ogg': raise RuntimeError('Invalid output path')
            previous=old_entries.get(phrase['id'])
            try:
                if previous and previous.get('fingerprint')==fingerprint and target.is_file() and sha(target)==previous.get('sha256'):
                    validate_audio(target);entries.append(previous);skipped+=1;continue
                if args.verify_only: raise RuntimeError('Recording missing or outdated: '+phrase['id'])
                if language not in voices: voices[language]=PiperVoice.load(model['path'],config_path=model['config'])
                target.parent.mkdir(parents=True,exist_ok=True)
                with tempfile.TemporaryDirectory(prefix='callout-voice-') as temporary:
                    wav_path=Path(temporary)/'raw.wav';ogg_path=Path(temporary)/'processed.ogg'
                    with wave.open(str(wav_path),'wb') as wav: voices[language].synthesize_wav(phrase['text'],wav)
                    source_rate,method=process_audio(wav_path,ogg_path);metadata=validate_audio(ogg_path)
                    # Write into the destination filesystem and atomically replace only this phrase.
                    with tempfile.NamedTemporaryFile(dir=target.parent,suffix='.ogg.tmp',delete=False) as handle:
                        handle.write(ogg_path.read_bytes());handle.flush();os.fsync(handle.fileno());temporary_output=handle.name
                    os.replace(temporary_output,target)
                entries.append({**phrase,**metadata,'voice':model['id'],'fingerprint':fingerprint,'sha256':sha(target),'sourceSampleRate':source_rate,'normalization':method})
                generated+=1
                if generated%20==0: print(f'{language}: generated {generated}, skipped {skipped}',flush=True)
            except Exception as error:
                failed+=1;print(f'ERROR {phrase["id"]}: {error}',file=sys.stderr,flush=True)
    summary={'generated':generated,'skipped':skipped,'unavailable':unavailable,'failed':failed,'totalCatalog':len(catalog['phrases']),'seconds':round(time.monotonic()-started,2)}
    print(json.dumps(summary,indent=2),flush=True)
    if failed: raise RuntimeError(f'{failed} recordings failed; previous manifest has not been replaced')
    manifest={'version':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'recipe':RECIPE,'toolchain':toolchain,
              'models':{lang:{k:v for k,v in model.items() if k not in ['path','config']} for lang,model in models.items()},
              'languages':{lang:{'status':'ready' if lang in models else 'model-missing','voice':models.get(lang,{}).get('id'),'phrases':sum(p['language']==lang for p in catalog['phrases'])} for lang in ['en','uk']},
              'entries':entries,'statistics':summary}
    atomic_json(root/'manifest.json',manifest)
    if not args.no_sync: print(run(['node','--experimental-strip-types',project/'scripts/sync-audio.ts','--source',root]).stdout,flush=True)

if __name__=='__main__':
    try: main()
    except Exception as error: print('Generation failed:',error,file=sys.stderr);sys.exit(1)
