export const BRANCHES = [
  {id:'childhood',name:'Childhood',hindi:'बचपन',symbol:'✿',color:'#bc806a',hint:'First homes, games and little adventures'},
  {id:'family',name:'Family & love',hindi:'परिवार',symbol:'❀',color:'#bd9b58',hint:'The people who made life feel like home'},
  {id:'learning',name:'Learning',hindi:'सीखना',symbol:'✧',color:'#7e9a7d',hint:'Schools, mentors and first discoveries'},
  {id:'work',name:'Work & purpose',hindi:'काम',symbol:'✺',color:'#b47e5f',hint:'The things we built and believed in'},
  {id:'journeys',name:'Journeys',hindi:'सफ़र',symbol:'◈',color:'#7f9997',hint:'Places, migrations and new beginnings'},
  {id:'traditions',name:'Traditions',hindi:'परंपराएँ',symbol:'❁',color:'#ac8d68',hint:'Recipes, festivals, songs and rituals'},
  {id:'turning',name:'Turning points',hindi:'मोड़',symbol:'✳',color:'#8d879f',hint:'Decisions that changed everything'},
  {id:'wisdom',name:'Wisdom & legacy',hindi:'सीख',symbol:'☼',color:'#b28d51',hint:'What we want future generations to know'}
];
export const PROMPTS = [
  {branch:'childhood',en:'What did the house you grew up in sound and smell like?',hi:'बचपन के घर की कौन-सी आवाज़ें और खुशबू आज भी याद हैं?'},
  {branch:'childhood',en:'What mischief did you get into as a child?',hi:'बचपन में आपने कौन-सी शरारतें की थीं?'},
  {branch:'family',en:'How did your parents or grandparents show love?',hi:'आपके माता-पिता या दादा-दादी प्यार कैसे जताते थे?'},
  {branch:'family',en:'Tell me about a person who changed your life.',hi:'किस व्यक्ति ने आपकी ज़िंदगी बदल दी?'},
  {branch:'learning',en:'Who was the teacher who believed in you?',hi:'किस शिक्षक ने आप पर विश्वास किया?'},
  {branch:'work',en:'What was your first job, and what did it teach you?',hi:'आपकी पहली नौकरी क्या थी और उससे क्या सीखा?'},
  {branch:'journeys',en:'What did it feel like to leave home for the first time?',hi:'पहली बार घर छोड़ते समय कैसा लगा था?'},
  {branch:'journeys',en:'Which journey do you remember most clearly?',hi:'कौन-सी यात्रा आपको सबसे साफ़ याद है?'},
  {branch:'traditions',en:'Which family recipe should never be forgotten?',hi:'परिवार की कौन-सी रेसिपी कभी नहीं भूलनी चाहिए?'},
  {branch:'traditions',en:'How did your family celebrate your favorite festival?',hi:'आपके घर में पसंदीदा त्योहार कैसे मनाया जाता था?'},
  {branch:'turning',en:'When did you realize your life was about to change?',hi:'कब महसूस हुआ कि आपकी ज़िंदगी बदलने वाली है?'},
  {branch:'wisdom',en:'What would you like your great-grandchildren to know?',hi:'आप अपने परपोते-पोतियों को क्या बताना चाहेंगे?'}
];
export const branchFor = id => BRANCHES.find(b=>b.id===id)||BRANCHES[0];
export function projectEvents(events){
  const people=new Map(),memories=new Map(),relations=new Map(),history=new Map();
  let family={name:'Our family',motto:'Every story belongs.'};
  const addHistory=(id,event)=>{if(!history.has(id))history.set(id,[]);history.get(id).push(event);};
  // Two-pass projection ensures an original always exists before its attachments,
  // even when two devices have different clocks or legacy events share a millisecond.
  // No imported transcript, photograph, note or correction may silently disappear.
  for(const evt of events){
    const p=evt.payload||{};
    switch(evt.type){
      case 'family.create': family={...family,...p};break;
      case 'person.create':people.set(p.id,{...p,createdAt:evt.at});addHistory(p.id,evt);break;
      case 'memory.create':memories.set(p.id,{...p,createdAt:evt.at,attachments:[],moments:[],transcripts:[],notes:[]});addHistory(p.id,evt);break;
    }
  }
  for(const evt of events){
    const p=evt.payload||{};
    switch(evt.type){
      case 'family.revise': family={...family,...p.patch};break;
      case 'person.revise':if(people.has(p.id)){people.set(p.id,{...people.get(p.id),...p.patch});addHistory(p.id,evt);}break;
      case 'person.photo':if(people.has(p.personId)){people.set(p.personId,{...people.get(p.personId),portrait:p.asset});addHistory(p.personId,evt);}break;
      case 'relation.add':relations.set(p.id,p);break;
      case 'memory.revise':if(memories.has(p.id)){const m=memories.get(p.id);Object.assign(m,p.patch);addHistory(p.id,evt);}break;
      case 'memory.attach':if(memories.has(p.id)){memories.get(p.id).attachments.push({...p.asset,addedAt:evt.at,actor:evt.actor});addHistory(p.id,evt);}break;
      case 'memory.transcript':if(memories.has(p.id)){memories.get(p.id).transcripts.push({text:p.text,language:p.language,at:evt.at,actor:evt.actor,kind:p.kind||'transcript',assetId:p.assetId||null});addHistory(p.id,evt);}break;
      case 'memory.moment':if(memories.has(p.id)){memories.get(p.id).moments.push({...p,at:evt.at});addHistory(p.id,evt);}break;
      case 'memory.note':if(memories.has(p.id)){memories.get(p.id).notes.push({text:p.text,actor:evt.actor,at:evt.at});addHistory(p.id,evt);}break;
    }
  }
  return {family,people:[...people.values()],memories:[...memories.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),relations:[...relations.values()],history,events};
}
export function searchMemories(memories,query,people,branch='all',personId='all') {
  const q=query.trim().toLocaleLowerCase();const byId=new Map(people.map(p=>[p.id,p.name]));
  return memories.filter(m=>{
    if(branch!=='all'&&m.branch!==branch)return false;
    if(personId!=='all' && !(m.personIds||[]).includes(personId))return false;
    if(!q)return true;
    const text=[m.title,m.story,m.location,m.dateLabel,m.tags?.join(' '),m.transcripts?.map(t=>t.text).join(' '),m.notes?.map(n=>n.text).join(' '),m.moments?.map(x=>x.text).join(' '),(m.personIds||[]).map(id=>byId.get(id)).join(' ')].join(' ').toLocaleLowerCase();
    return text.includes(q)||q.split(/\s+/).every(word=>text.includes(word));
  });
}
const CLUES={childhood:/child|schoolyard|grew up|बचपन|खेल|नानी घर/i,family:/family|mother|father|wedding|grandparent|marriage|प्यार|परिवार|शादी|माँ|पापा/i,learning:/learn|school|teacher|study|college|पढ़|स्कूल|सिख/i,work:/work|job|office|career|काम|नौकरी|दफ़्तर/i,journeys:/travel|journey|moved|train|city|migration|सफ़र|यात्रा|रेल|शहर/i,traditions:/festival|recipe|cook|diwali|holi|पूजा|त्योहार|खाना|होली|दिवाली/i,turning:/changed|decision|loss|turning|different|बदल|फ़ैसला/i,wisdom:/advice|remember|lesson|wish|life taught|सीख|सलाह|याद रखना/i};
export function suggestBranch(text){const matches=Object.entries(CLUES).map(([id,re])=>({id,count:(text.match(new RegExp(re.source,'gi'))||[]).length})).sort((a,b)=>b.count-a.count);return matches[0]?.count?matches[0].id:'wisdom';}
export function sourceHits(data,query){
  const tokens=query.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>2);
  if(!tokens.length)return [];
  const hits=[];
  for(const m of data.memories){
    const fields=[{label:'story',text:m.story||''},{label:'title',text:m.title||''},...m.transcripts.flatMap(t=>{const segments=parseTranscriptSegments(t.text);return segments.length?segments.map(seg=>({label:`transcript ${formatTime(seg.start)}`,text:seg.text,start:seg.start,assetId:t.assetId})):[{label:'transcript',text:t.text,assetId:t.assetId}];}),...m.moments.map(x=>({label:`clip ${formatTime(x.start)}`,text:x.text||x.title||'',start:x.start,assetId:x.assetId}))];
    for(const field of fields){
      const lower=field.text.toLocaleLowerCase();let score=tokens.reduce((n,t)=>n+(lower.includes(t)?1:0),0);
      if(!score)continue;
      const first=lower.indexOf(tokens.find(t=>lower.includes(t))||'');
      const snippet=field.text.slice(Math.max(0,first-70),Math.max(0,first-70)+260);
      hits.push({memory:m,label:field.label,text:snippet,score:score+(field.label==='transcript'?0.1:0),start:field.start,assetId:field.assetId});
    }
  }
  return hits.sort((a,b)=>b.score-a.score).slice(0,8);
}
export function formatTime(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0));return s>=3600?`${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export const formatDate=d=>d?new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Date unknown';
// Source-faithful local chapter suggestions. These are editable suggestions, not AI-generated facts.
export function suggestChapters(text) {
  const source=(text||'').trim();if(!source)return [];
  let parts=source.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  if(parts.length===1){
    const sentences=(source.match(/[^.!?।]+[.!?।]?/g)||[source]).map(x=>x.trim()).filter(Boolean);
    const groupSize=sentences.length>9?3:sentences.length>4?2:1;
    parts=[];
    for(let i=0;i<sentences.length;i+=groupSize)parts.push(sentences.slice(i,i+groupSize).join(' '));
  }
  const output=[];
  for(let i=0;i<parts.length;i++){
    const chunk=parts[i];
    if(chunk.length<42 && parts.length>1){if(output.length)output[output.length-1].text+=' '+chunk;else if(parts[i+1])parts[i+1]=chunk+' '+parts[i+1];continue;}
    const branch=suggestBranch(chunk);
    const words=chunk.replace(/^["“'\s]+/,'').split(/\s+/).slice(0,7).join(' ');
    const title=words.length>58?words.slice(0,57)+'…':words+(chunk.length>words.length?'…':'');
    output.push({title:title||`Chapter ${i+1}`,branch,text:chunk});
    if(output.length>=12)break;
  }
  return output;
}
export function parseTranscriptSegments(text) {
  const segments=[];
  for(const line of (text||'').split(/\r?\n/)){
    const match=line.match(/^\s*\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s*(.*)/);
    if(match){const seconds=(Number(match[1]||0)*3600)+(Number(match[2])*60)+Number(match[3]);if(Number.isFinite(seconds)&&Number(match[3])<60)segments.push({start:seconds,text:match[4]});}
  }
  return segments;
}
export function followupFor(text,name='them') {
  const source=(text||'').toLocaleLowerCase();
  const year=(source.match(/\b(?:18|19|20)\d{2}\b/)||[])[0];
  if(/diwali|holi|festival|recipe|त्योहार|दिवाली|खाना/.test(source))return 'Who taught you those traditions, and how did they change over time?';
  if(/school|teacher|पढ़|स्कूल|शिक्षक/.test(source))return 'Can you remember one particular day in that classroom?';
  if(/move|train|travel|journey|सफ़र|यात्रा|रेल/.test(source))return 'What did you carry with you, and what did you leave behind?';
  if(/grandma|grandfather|mother|father|nani|dadi|नानी|दादी|माँ|पिता/.test(source))return 'What was a tiny habit of theirs that you remember vividly?';
  if(year)return `What did a typical day look like around ${year}?`;
  if(source.trim().length>25)return 'What happened just before that, and how did you feel in the moment?';
  return `What is the first place ${name} remembers calling home?`;
}
