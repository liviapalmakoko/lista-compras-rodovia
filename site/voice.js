// O reconhecimento de voz é fornecido pelo navegador, não por uma API própria.
export function splitSpokenItems(transcript){
 return transcript.split(/\bmais\b/iu).map(text=>text.replace(/^[\s,.;:!?]+|[\s,.;:!?]+$/gu,'').trim()).filter(Boolean);
}
export function speechSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
export function createRecognition(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition)return null;
 const recognition=new Recognition();recognition.lang='pt-BR';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
 return recognition;
}
