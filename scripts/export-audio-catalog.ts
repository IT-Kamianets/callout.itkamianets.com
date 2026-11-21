import { dictionary, scenarios } from '../js/core/dictionary.ts';
import { validateDictionary } from '../js/core/validation.ts';
import { buildAudioCatalog } from '../js/core/audio-catalog.ts';
console.log(JSON.stringify({version:1,dictionaryVersion:dictionary.version,phrases:buildAudioCatalog(validateDictionary(dictionary),scenarios)}));
