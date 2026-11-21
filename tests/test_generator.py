import importlib.util
import math
from pathlib import Path
import tempfile
import unittest
import wave
import struct

spec=importlib.util.spec_from_file_location('callout_generator',Path(__file__).resolve().parents[1]/'scripts/generate_callouts.py')
generator=importlib.util.module_from_spec(spec);spec.loader.exec_module(generator)

class GeneratorTests(unittest.TestCase):
    def test_fingerprint_changes_for_text_model_recipe_and_toolchain(self):
        phrase={'id':'en.mirage.window.name.primary','text':'Window'}
        model={'id':'en_US-ryan-medium','sha256':'original','configSha256':'config'}
        recipe=generator.RECIPE
        tools={'piper':'installed','ffmpeg':'installed'}
        original=generator.generation_fingerprint(phrase,model,recipe,tools)
        self.assertEqual(original,generator.generation_fingerprint(dict(phrase),dict(model),dict(recipe),dict(tools)))
        self.assertNotEqual(original,generator.generation_fingerprint({**phrase,'text':'One Window!'},model,recipe,tools))
        self.assertNotEqual(original,generator.generation_fingerprint(phrase,{**model,'sha256':'changed'},recipe,tools))
        self.assertNotEqual(original,generator.generation_fingerprint(phrase,model,{**recipe,'pitch':.9},tools))
        self.assertNotEqual(original,generator.generation_fingerprint(phrase,model,recipe,{**tools,'piper':'changed'}))

    def test_ffprobe_rate_is_used_instead_of_hardcoded_22050_and_output_decodes(self):
        with tempfile.TemporaryDirectory() as directory:
            raw=Path(directory)/'source.wav';output=Path(directory)/'processed.ogg'
            rate=48000
            with wave.open(str(raw),'wb') as wav:
                wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate)
                wav.writeframes(b''.join(struct.pack('<h',int(7000*math.sin(2*math.pi*220*i/rate))) for i in range(rate)))
            detected,_=generator.process_audio(raw,output)
            metadata=generator.validate_audio(output)
            self.assertEqual(detected,48000);self.assertEqual(metadata['sampleRate'],48000)
            self.assertEqual(metadata['codec'],'vorbis');self.assertLess(metadata['peakDb'],0)
            self.assertAlmostEqual(metadata['duration'],1/(.95*1.26),delta=.08)

    def test_empty_or_corrupt_audio_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'bad.ogg';output.write_bytes(b'')
            with self.assertRaises(RuntimeError):generator.validate_audio(output)
            output.write_bytes(b'not audio'*100)
            with self.assertRaises(RuntimeError):generator.validate_audio(output)

if __name__=='__main__':unittest.main()
