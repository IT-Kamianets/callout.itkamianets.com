import type { Language, Mode, Question, UserSettings } from './model.ts';
import { PositionDictionaryService } from './dictionary.ts';
import type { AudioRequest } from '../services/audio.ts';
/** A single mapping used for playback/preloading in every exercise mode. */
export function exerciseAudio(q:Question,mode:Mode,dictionary:PositionDictionaryService,settings:UserSettings):{language:Language;requests:AudioRequest[];revealsAnswer:boolean}{
 if(q.input||mode==='flashcards'){
  const language=q.input?q.answerLanguage:settings.target;
  return {language,requests:[{positionId:q.positionId,text:dictionary.name(q.positionId,language)}],revealsAnswer:q.input};
 }
 return {language:q.language,requests:q.sequence?q.sequence.map(positionId=>({positionId,text:dictionary.name(positionId,q.language)})):[{positionId:q.positionId,text:q.text}],revealsAnswer:false};
}
