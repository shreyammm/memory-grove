// The browser downloads speech-model weights, but never uploads family recordings.
import { BrowserWhisper } from 'browser-whisper';
let engine;
export function startLocalTranscription(file,onProgress){
  engine ||= new BrowserWhisper({model:'whisper-tiny'});
  const stream=engine.transcribe(file,{onProgress});
  return {segments:stream,cancel:()=>stream.cancel()};
}
