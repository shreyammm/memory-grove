import test from 'node:test';
import assert from 'node:assert/strict';
import {BRANCHES,projectEvents,searchMemories,suggestBranch,suggestChapters,sourceHits,formatTime} from '../model.js';
const events=[
 {id:'e1',type:'family.create',at:'2026-11-01T00:00:00Z',actor:'A',payload:{name:'The Sharma family'}},
 {id:'e2',type:'person.create',at:'2026-11-01T00:00:01Z',actor:'A',payload:{id:'p1',name:'Nani',born:'1944'}},
 {id:'e3',type:'memory.create',at:'2026-11-01T00:00:02Z',actor:'A',payload:{id:'m1',title:'First Diwali',personIds:['p1'],story:'पहली दिवाली घर में बहुत सुंदर थी।',branch:'traditions',dateLabel:'1972'}},
 {id:'e4',type:'memory.transcript',at:'2026-11-01T00:00:03Z',actor:'B',payload:{id:'m1',language:'hi',text:'The house was filled with lamps and laughter.'}},
 {id:'e5',type:'memory.revise',at:'2026-11-01T00:00:04Z',actor:'B',payload:{id:'m1',patch:{title:'Our first Diwali in Delhi',story:'दिवाली का त्योहार घर में सुंदर था।'},reason:'Recalled Delhi'}},
 {id:'e6',type:'memory.moment',at:'2026-11-01T00:00:05Z',actor:'A',payload:{id:'m1',title:'The lighting of lamps',start:83,assetId:'asset'}}
];
test('life trees and revisions derive from immutable contributions',()=>{
 const data=projectEvents(events);
 assert.equal(data.family.name,'The Sharma family');
 assert.equal(data.memories[0].title,'Our first Diwali in Delhi');
 assert.equal(data.history.get('m1').length,4);
 assert.equal(events[2].payload.story,'पहली दिवाली घर में बहुत सुंदर थी।');
 assert.equal(data.memories[0].moments[0].start,83);
});
test('offline search retrieves bilingual words, transcripts and people',()=>{
 const data=projectEvents(events);
 assert.equal(searchMemories(data.memories,'दिवाली',data.people).length,1);
 assert.equal(searchMemories(data.memories,'lamps',data.people).length,1);
 assert.equal(searchMemories(data.memories,'Nani',data.people).length,1);
 assert.equal(searchMemories(data.memories,'Nani',data.people,'work').length,0);
 assert.ok(sourceHits(data,'lamps').some(x=>x.label==='transcript'));
});
test('offline branch suggestions keep original source words',()=>{
 const original='I remember our childhood and the games we played. We played cricket outside until the sun went down. Our teacher used to sing with us. I remember our school every day. Diwali was a festival full of food and love.';
 const chapters=suggestChapters(original);
 assert.ok(chapters.length>=2);
 assert.ok(chapters.every(c=>BRANCHES.some(b=>b.id===c.branch)));
 assert.ok(chapters.every(c=>c.text.length));
 assert.equal(suggestBranch('हमने दिवाली का त्योहार मनाया'), 'traditions');
 assert.equal(formatTime(83),'1:23');
});

test('timestamped source passages retain the correct recording identity',()=>{
  const events=[
    {id:'p',at:'2026-11-20T10:00:00Z',type:'person.create',actor:'Family',payload:{id:'person',name:'Nani'}},
    {id:'m',at:'2026-11-20T10:01:00Z',type:'memory.create',actor:'Family',payload:{id:'memory',title:'Two interviews',personIds:['person'],story:'',branch:'family'}},
    {id:'a',at:'2026-11-20T10:02:00Z',type:'memory.transcript',actor:'Family',payload:{id:'memory',text:'[03:14] The old mango tree shaded our house.',language:'en',assetId:'second-recording'}},
    {id:'b',at:'2026-11-20T10:03:00Z',type:'memory.moment',actor:'Family',payload:{id:'memory',title:'A shared meal',text:'We cooked every Sunday.',start:70,assetId:'first-recording'}},
  ];
  const data=projectEvents(events);
  assert.equal(data.memories[0].transcripts[0].assetId,'second-recording');
  assert.equal(sourceHits(data,'mango')[0].assetId,'second-recording');
  assert.equal(sourceHits(data,'Sunday')[0].assetId,'first-recording');
});
test('media and transcripts never disappear when archive records arrive before their original',()=>{
  const at='2026-11-20T12:00:00.000Z';
  const history=[
    {id:'a-attach',at,type:'memory.attach',actor:'Nani',payload:{id:'m',asset:{id:'image1',name:'original.jpg',mime:'image/jpeg',size:5}}},
    {id:'b-transcript',at,type:'memory.transcript',actor:'Papa',payload:{id:'m',text:'हमारी कहानी',language:'hi'}},
    {id:'z-create',at,type:'memory.create',actor:'Nani',payload:{id:'m',title:'Life story',personIds:['p'],story:'',branch:'childhood'}},
  ];
  const projected=projectEvents(history);
  assert.equal(projected.memories.length,1);
  assert.equal(projected.memories[0].attachments[0].id,'image1');
  assert.equal(projected.memories[0].transcripts[0].text,'हमारी कहानी');
  assert.equal(projected.history.get('m').length,3);
});
