import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestTimedClips,parseTranscriptSegments} from '../model.js';
test('different topics create distinct source-faithful clips',()=>{
 const input=[
 {start:0,end:32,text:'I grew up as a child and remember my childhood games'},
 {start:32,end:62,text:'We played outside the old schoolyard'},
 {start:63,end:94,text:'My first job was working in a local office'},
 {start:95,end:124,text:'My work career changed after this experience'}];
 const clips=suggestTimedClips(input);
 assert.equal(clips.length,2);
 assert.deepEqual(clips.map(x=>x.branch),['childhood','work']);
 assert.deepEqual(clips.map(x=>[x.start,x.end]),[[0,62],[63,124]]);
 assert.equal(clips.map(x=>x.text).join(' '),input.map(x=>x.text).join(' '));
});
test('invalid segments produce no clips',()=>assert.deepEqual(suggestTimedClips([{text:'no timestamp'}]),[]));
test('timestamped transcript parsing retains time',()=>assert.deepEqual(
 parseTranscriptSegments('[00:05] Hello\n[01:20] School started\n[01:03:15] Goodnight').map(x=>x.start),[5,80,3795]));
