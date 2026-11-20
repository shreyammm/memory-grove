import {newVault,unlockVault,randomId} from './crypto.js';
import {database,hasVault,getMeta,initializeVault,createFamilyVault,getPreference,setPreference,getPrivatePreference,setPrivatePreference,saveDraft,readDraft,clearDraft,appendEvent,appendEventBatch,loadEvents,saveAsset,loadAsset,backupVault,readArchive,restoreArchive,mergeArchive,inspectVaultIntegrity,storageUsage} from './db.js';
import {BRANCHES,PROMPTS,branchFor,projectEvents,searchMemories,suggestBranch,suggestChapters,sourceHits,parseTranscriptSegments,suggestTimedClips,followupFor,formatTime,formatDate} from './model.js';
import {treeArt,miniPlant,ornaments} from './art.js';

const app=document.getElementById('app');
const state={key:null,view:'home',data:null,selectedPerson:'',memoryId:'',search:'',branch:'all',personFilter:'all',dialog:null,toast:'',busy:false,autoDownload:false,actor:'A family member',language:'both',capture:{},recorder:null,stream:null,recordFinalizing:false,recordStarted:0,recordTimer:null,recordFile:null,recordAsset:null,recordAssets:[],failedRecording:null,recordMode:'audio',transcription:null,transcriptionCancel:null,autoTranscribe:true,photoFiles:[],uploadedFile:null,uploadedAsset:null,uploadedAssets:[],photoAssets:[],draftTimer:null,answer:'',answerQuery:'',answerSources:[],chapterSuggestions:[],restoreFile:null,shareFile:null,setupError:'',aiBusy:false,installPrompt:null};
const fileUrls=new Map();
const icons={home:'⌂',tree:'♧',family:'♧',archive:'▤',record:'◉',album:'▧',ask:'✧',people:'♙',settings:'⚙',lock:'♧',back:'←',plus:'+',mic:'◉',video:'▣',camera:'▧',download:'↓',arrow:'↗',flower:'✿',book:'▤',audio:'♫'};
const E = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSize=n=>n<1024?`${n} B`:n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
const firstName=name=>(name||'').trim().split(/\s+/)[0]||'Someone';
const dayStamp=()=>new Date().toISOString().slice(0,10);
const toast=msg=>{state.toast=msg;const node=document.getElementById('toast');if(node){node.textContent=msg;node.classList.add('show');setTimeout(()=>{if(state.toast===msg){state.toast='';node.classList.remove('show');}},4500);}else render();};
const opts=(arr,value='')=>arr.map(o=>`<option value="${E(o.value)}" ${String(o.value)===String(value)?'selected':''}>${E(o.label)}</option>`).join('');
const branchSelect=(value='childhood')=>opts(BRANCHES.map(b=>({value:b.id,label:`${b.symbol} ${b.name}`})),value);
const personChecks=(selected=[])=>state.data.people.map(p=>`<label class="check-option"><input type="checkbox" name="personIds" value="${p.id}" ${selected.includes(p.id)?'checked':''}><span>${E(p.name)}</span></label>`).join('');
const selectPeople=(sel='all')=>`<option value="all">All people</option>${state.data.people.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${E(p.name)}</option>`).join('')}`;
const nav=[['home','The grove','home'],['trees','Life trees','tree'],['timeline','Life timeline','book'],['family','Family roots','family'],['archive','Memory archive','archive'],['capture','Add a story','record'],['album','Photo album','album'],['ask','Ask the grove','ask'],['people','Our people','people'],['settings','Privacy & keepsakes','settings']];
const aButton=(action,label,cls='btn btn-primary',extra='')=>`<button class="${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`;
const viewButton=(view,label,cls='btn btn-primary')=>`<button class="${cls}" data-nav="${view}" type="button">${label}</button>`;
const personName=id=>state.data.people.find(p=>p.id===id)?.name||'Family member';
const latestText=m=>(m.transcripts?.length?m.transcripts[m.transcripts.length-1].text:'');
const datePretty=s=>s?formatDate(s):'Undated';
const empty=(title,text,button='')=>`<div class="empty-state">${miniPlant()}<h3>${E(title)}</h3><p>${E(text)}</p>${button}</div>`;
const personAvatar=(p,size='')=>`<div class="avatar ${size}" ${p?.portrait?'data-avatar="'+p.portrait.id+'"':''}>${p?.portrait?`<img alt="Portrait of ${E(p.name)}" data-asset-src="${p.portrait.id}" />`:`<span>${E((p?.name||'?').slice(0,1).toUpperCase())}</span>`}</div>`;

function render(){
  if(!state.key){app.innerHTML=(state.setupError==='unlock'?unlockPage():state.setupError==='restore'?restorePage():onboardPage());return;}
  if(!state.data)return;
  app.innerHTML=`<div class="shell"><aside class="sidebar">
    <button class="brand" data-nav="home" aria-label="Memory Grove home"><span class="brand-stamp">✿</span><span><strong>memory grove</strong><small>OUR STORIES, STILL GROWING</small></span></button>
    <div class="side-rule"></div><div class="nav-caption">YOUR FAMILY'S PLACE</div>
    <nav class="side-nav" aria-label="Main navigation">${nav.map(([id,label,icon])=>`<button type="button" data-nav="${id}" class="nav-link ${id===state.view?'active':''}"><span class="nav-symbol">${icons[icon]}</span>${label}${id==='capture'?'<span class="nav-tiny">+</span>':''}</button>`).join('')}</nav>
    <div class="side-bottom"><div class="privacy-caption"><span class="privacy-dot"></span> PRIVATE · ON THIS DEVICE</div><button class="sidebar-lock" data-action="lock" type="button">⌁ &nbsp; Lock your grove</button><div class="sidebar-flower">${miniPlant()}</div></div>
  </aside><div class="main-wrap"><header class="topbar"><button class="mobile-menu" data-action="toggle-menu" aria-label="Open menu">☰</button><span class="top-breadcrumb">MEMORY GROVE <span> / </span> ${E(nav.find(x=>x[0]===state.view)?.[1]||'The grove')}</span><div class="top-actions"><span class="status"><span></span> Saved on this device</span><button class="round-action" data-action="show-backup" aria-label="Backup your grove" title="Back up your grove">↓</button>${aButton('new-memory','+ Preserve a memory','btn btn-small btn-dark')}</div></header>
  <main class="view ${state.view==='home'?'home-view':''}">${viewContent()}</main><footer class="app-footer">Handmade for the stories that deserve to stay. <span>✿</span> <a href="./privacy.html" target="_blank" rel="noopener">Privacy promise</a> · Your memories belong to your family.</footer></div></div>
  ${state.dialog?dialogContent():''}<div class="toast ${state.toast?'show':''}" role="status" id="toast">${E(state.toast)}</div>`;
  hydrateAssets();
  if(state.view==='settings') updateUsage();
  if(state.view==='capture'&&state.recorder) refreshRecordIndicator();
}
function onboardPage(){
  return `<main class="folio-page"><div class="folio">
    <figure class="folio-art"><img src="./assets/courtyard.webp" alt="A grandmother and a young woman sharing a quiet moment beneath a flowering tree"></figure>
    <section class="folio-form"><header><p class="folio-brand">Memory Grove</p><h1>Start your <em>family archive.</em></h1><p>Keep the sound of a voice, the faces in a photograph, and the stories only your family knows.</p></header>
      <form data-form="onboard" class="form-stack">
        <label>Family archive name<input name="family" placeholder="e.g. Mehta family" required maxlength="100"></label>
        <label>Whose stories will you start with?<input name="person" placeholder="e.g. Papa or Nani" required maxlength="100"></label>
        <div class="folio-passwords"><label>Passphrase<input name="passphrase" type="password" placeholder="10+ characters" required minlength="10" autocomplete="new-password" aria-describedby="key-help"></label>
        <label>Confirm passphrase<input name="confirm" type="password" required autocomplete="new-password"></label></div>
        <small id="key-help">Save this in your password manager. You’ll need it to open your archive, and it can’t be reset.</small>
        <button class="btn btn-primary wide" type="submit">Create family archive <span>→</span></button>
      </form>
      <p class="folio-storage">Stories are saved on this device. To keep a second copy, save an encrypted backup to your own cloud drive.</p>
      <button class="text-action" data-action="restore-start">Open an existing backup →</button>
    </section></div></main>`;
}
function unlockPage(){
  return `<div class="entry-page"><div class="unlock-card"><div class="unlock-symbol">✿</div><div class="eyebrow">YOUR PRIVATE FAMILY ARCHIVE</div><h1>Welcome back<br><em>to the grove.</em></h1><p>Enter your passphrase to open your memories on this device.</p><form data-form="unlock" class="form-stack"><label>Grove passphrase<input name="passphrase" type="password" required autofocus autocomplete="current-password"></label><button class="btn btn-primary wide" type="submit">Unlock the grove →</button></form><p class="note">Your passphrase never leaves your device. We cannot recover it.</p></div></div>`;
}
function viewContent(){switch(state.view){case 'home':return homeView();case 'trees':return treesView();case 'timeline':return timelineView();case 'family':return familyView();case 'archive':return archiveView();case 'capture':return captureView();case 'album':return albumView();case 'ask':return askView();case 'people':return peopleView();case 'settings':return settingsView();case 'detail':return detailView();default:return homeView();}}
const pageHeading=(eyebrow,title,sub,action='')=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${action?`<div class="heading-action">${action}</div>`:''}</div>`;
function homeView(){
  const {family,people,memories}=state.data;
  const countPhoto=memories.reduce((n,m)=>n+m.attachments.filter(a=>a.mime?.startsWith('image/')).length,0)+people.filter(p=>p.portrait).length;
  const featured=memories.slice(0,3);
  const who=people.find(p=>p.id===state.selectedPerson)||people[0];
  return `<section class="home-hero"><div class="hero-copy"><div class="eyebrow">✦ &nbsp; ${E(family.name.toUpperCase())}'S PRIVATE GROVE</div><h1>Our stories,<br><em>still growing.</em></h1><div class="delicate-rule">✿ <span></span> ❀</div><p>A home for the voices, faces, little moments, and extraordinary lives that make a family.</p><div class="hero-buttons">${viewButton('capture','+ Preserve a memory')}${viewButton('trees','Wander the life trees ↗','btn btn-outline')}</div><div class="hero-foot">✿ &nbsp; Every story you plant makes the grove grow.</div></div><div class="hero-painting"><img class="courtyard-home" src="./assets/courtyard.webp" alt="Two generations sharing stories in a garden"></div></section>
  <section class="stats-band"><div><span class="stat-icon">✿</span><strong>${people.length}</strong><small>${people.length===1?'person':'people'} remembered</small></div><div><span class="stat-icon">❧</span><strong>${memories.length}</strong><small>${memories.length===1?'story':'stories'} preserved</small></div><div><span class="stat-icon">♫</span><strong>${memories.reduce((n,m)=>n+m.attachments.filter(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/')).length,0)}</strong><small>voices & films</small></div><div><span class="stat-icon">▧</span><strong>${countPhoto}</strong><small>photographs</small></div></section>
  <section class="home-lower"><div class="home-prompt"><div class="card-topline">A LITTLE QUESTION TO BEGIN WITH <span>✧</span></div><div class="prompt-art">${miniPlant()}</div><h2>“${E(PROMPTS[(new Date().getDate())%PROMPTS.length].en)}”</h2><p>Sometimes the smallest question opens the most beautiful story.</p><button class="text-action" data-nav="capture">Capture this story →</button></div><div class="recent-box"><div class="section-title"><div><div class="eyebrow">FROM YOUR FAMILY'S ARCHIVE</div><h2>Recently planted</h2></div>${viewButton('archive','View all stories →','text-action')}</div>${featured.length?featured.map(m=>memoryRow(m)).join(''):empty('The first story is waiting','Record a voice, write a memory, or save an old photograph.',viewButton('capture','Plant your first story','btn btn-outline'))}</div></section>
  <div class="tiny-bottom-quote">“A family is a tree of stories, and every voice is a new leaf.”</div>`;
}
function memoryRow(m){return `<button class="memory-row" data-detail="${m.id}"><span class="row-flower" style="--branch:${branchFor(m.branch).color}">${branchFor(m.branch).symbol}</span><span><b>${E(m.title)}</b><small>${E((m.personIds||[]).map(personName).join(' · ')||'A family memory')} &nbsp; · &nbsp; ${E(m.dateLabel||datePretty(m.createdAt))}</small></span><span class="row-arrow">↗</span></button>`;}
function treesView(){
  const people=state.data.people;
  const chosen=people.find(p=>p.id===state.selectedPerson)||people[0];
  const stories=state.data.memories.filter(m=>m.personIds?.includes(chosen?.id));
  const clips=stories.flatMap(memory=>(memory.moments||[]).filter(moment=>moment.assetId&&moment.branch)
    .map(moment=>({memory,moment})));
  const displayedClips=state.branch==='all'?clips:clips.filter(x=>x.moment.branch===state.branch);
  return `${pageHeading('✿ THE LIVING ARCHIVE','One life, <em>many branches.</em>','Every person has a tree. Each memory becomes a bloom, and the tree grows with every story.',aButton('new-person','+ Add a person','btn btn-outline'))}<div class="person-strip">${people.map(p=>`<button data-person-tree="${p.id}" class="person-chip ${chosen?.id===p.id?'selected':''}">${personAvatar(p,'small')} ${E(p.name)}</button>`).join('')}</div>
  <div class="tree-workspace"><div class="tree-portrait"><div class="tree-kicker">THE LIFE TREE OF</div><h2>${E(chosen?.name||'Your loved one')}</h2><div class="tree-info">${E(chosen?.born||'')} ${chosen?.born&&chosen?.died?'–':''} ${E(chosen?.died||'')} ${chosen?.bio?`<span>·</span> ${E(chosen.bio)}`:''}</div><div class="tree-illustration">${treeArt({seed:10})}<div class="tree-seal">${stories.length} ${stories.length===1?'memory':'memories'}<small>and growing</small></div></div><div class="tree-note">✿ &nbsp; Choose a branch to discover the stories growing there.</div></div>
  <div class="branch-panel"><div class="eyebrow">EIGHT CHAPTERS OF A LIFE</div><h3>Follow a branch</h3><div class="branch-grid">${BRANCHES.map(b=>{const n=stories.filter(m=>m.branch===b.id).length+clips.filter(x=>x.moment.branch===b.id).length;return `<button class="branch-tile ${state.branch===b.id?'chosen':''}" data-branch-tree="${b.id}"><span class="branch-emblem" style="--flower:${b.color}">${b.symbol}</span><span class="branch-text"><b>${b.name}</b><small>${E(b.hindi)} &nbsp; · &nbsp; ${n} ${n===1?'story':'stories'}</small></span><span class="branch-arrow">→</span></button>`;}).join('')}</div></div></div>
  <div class="section-title tree-stories"><div><div class="eyebrow">BLOOMS ON THIS TREE</div><h2>${state.branch==='all'?'All of '+firstName(chosen?.name)+"'s stories":branchFor(state.branch).name}</h2></div>${state.branch!=='all'?aButton('clear-branch','View all branches','text-action'):''}</div>
  <div class="story-grid">${(state.branch==='all'?stories:stories.filter(m=>m.branch===state.branch)).length?(state.branch==='all'?stories:stories.filter(m=>m.branch===state.branch)).map(memoryCard).join(''):empty('This branch is ready to bloom','Add a story to bring this part of the tree to life.',viewButton('capture','Add a memory','btn btn-outline'))}</div><div class="section-title tree-stories"><div><div class="eyebrow">MOMENTS FROM LONG INTERVIEWS</div><h2>Listen by chapter</h2></div></div>
  <div class="story-grid">${displayedClips.length?displayedClips.map(({memory,moment})=>`<button class="story-card clip-card" data-detail="${memory.id}" data-detail-asset="${E(moment.assetId)}" data-detail-start="${moment.start}" data-detail-end="${moment.end}"><div class="story-content"><div class="story-branch">${branchFor(moment.branch).symbol} ${branchFor(moment.branch).name} · ${formatTime(moment.start)}–${formatTime(moment.end)}</div><h3>${E(moment.title)}</h3><p>${E((moment.text||'').slice(0,180))}</p><div class="story-meta">From ${E(memory.title)} <span>▶ Listen ↗</span></div></div></button>`).join(''):empty('No time-linked clips on this branch yet','Import and transcribe an interview, or mark a timestamped moment in a memory.')}</div>`;
}
function memoryCard(m){
  const image=m.attachments.find(a=>a.mime?.startsWith('image/'));
  return `<button class="story-card" data-detail="${m.id}">${image?`<div class="story-photo"><img data-asset-src="${image.id}" alt="${E(image.caption||m.title)}"></div>`:`<div class="story-illustration" style="--story-color:${branchFor(m.branch).color}">${miniPlant()}<span>${branchFor(m.branch).symbol}</span></div>`}<div class="story-content"><div class="story-branch">${branchFor(m.branch).symbol} ${branchFor(m.branch).name}</div><h3>${E(m.title)}</h3><p>${E((m.story||latestText(m)||'A memory waiting to be told.').slice(0,135))}</p><div class="story-meta">${E(m.dateLabel||datePretty(m.createdAt))} <span>↗</span></div></div></button>`;
}
function timelineView(){
  const choices=state.data.people,person=choices.find(p=>p.id===state.selectedPerson)||choices[0];
  const records=state.data.memories.filter(m=>m.personIds?.includes(person?.id));
  const year=m=>{const match=(m.dateLabel||'').match(/(?:18|19|20)\d{2}/);return match?Number(match[0]):null;};
  records.sort((a,b)=>(year(a)??9999)-(year(b)??9999)||a.createdAt.localeCompare(b.createdAt));
  return `${pageHeading('❧ MOMENTS IN TIME','A life in <em>seasons.</em>','Follow a loved one’s memories through time. Approximate dates are welcome.',viewButton('capture','+ Add a memory'))}<div class="person-strip">${choices.map(p=>`<button class="person-chip ${person?.id===p.id?'selected':''}" data-person-timeline="${p.id}">${personAvatar(p,'small')} ${E(p.name)}</button>`).join('')}</div><div class="timeline-page"><div class="timeline-intro"><div class="eyebrow">THE LIFE OF</div><h2>${E(person?.name||'Someone loved')}</h2><p>Not every memory has a date. The ones that do appear in their time; the others wait lovingly at the end.</p>${miniPlant()}</div><div class="timeline-list">${records.length?records.map(m=>`<button class="timeline-point" data-detail="${m.id}"><span class="timeline-marker">${branchFor(m.branch).symbol}</span><div class="timeline-date">${E(m.dateLabel||'DATE UNKNOWN')}</div><h3>${E(m.title)}</h3><p>${E((m.story||latestText(m)||branchFor(m.branch).hint).slice(0,190))}</p><span class="timeline-more">Read this memory ↗</span></button>`).join(''):empty('A life waiting to be remembered','Add stories to shape the timeline.',viewButton('capture','Record a chapter','btn btn-outline'))}</div></div>`;
}
function familyView(){
  const {people,relations}=state.data;
  const parentRelations=relations.filter(r=>r.kind==='parent');
  const parentsOf=id=>parentRelations.filter(r=>r.personBId===id).map(r=>r.personAId);
  const childrenOf=id=>[...new Set(parentRelations.filter(r=>r.personAId===id).map(r=>r.personBId))];
  const partnersOf=id=>relations.filter(r=>r.kind==='partner'&&(r.personAId===id||r.personBId===id)).map(r=>r.personAId===id?r.personBId:r.personAId);
  const roots=people.filter(p=>!parentsOf(p.id).length);
  const genealogyNode=(p,seen=new Set(),depth=0)=>{
    if(!p)return '';
    const children=depth<8&&!seen.has(p.id)?childrenOf(p.id).map(id=>people.find(x=>x.id===id)).filter(Boolean):[];
    const visited=new Set([...seen,p.id]);
    return `<li><div class="genealogy-card"><button class="lineage-profile" data-person-detail="${p.id}">${personAvatar(p)}<b>${E(p.name)}</b><small>${E(p.born||'Family member')}</small></button>${partnersOf(p.id).length?`<div class="genealogy-partners">♡ ${partnersOf(p.id).map(personName).map(E).join(' · ')}</div>`:''}</div>${children.length?`<ul>${children.map(child=>genealogyNode(child,visited,depth+1)).join('')}</ul>`:''}</li>`;
  };
  return `${pageHeading('❧ ROOTS & RELATIONSHIPS','The roots that <em>connect us.</em>','Trace parents, children, partners and siblings through generations. Add what you know; no original is overwritten.',aButton('add-relation','+ Add a relationship'))}<div class="lineage-intro"><div class="lineage-flower">${miniPlant()}</div><div><b>${E(state.data.family.name)}</b><p>Tap someone to add their portrait, details or story. The genealogy grows as you add parents, partners and children.</p></div></div><div class="genealogy-scroll"><div class="genealogy-forest">${roots.length?`<ul class="genealogy-level">${roots.map(p=>genealogyNode(p)).join('')}</ul>`:empty('A circle of roots','Add a person to start your family history.')}</div></div><div class="relationship-section"><div class="section-title"><h2>Family connections</h2>${aButton('add-relation','+ New connection','btn btn-outline btn-small')}</div>${relations.length?relations.map(r=>`<div class="relation-row"><span>❧</span><b>${E(personName(r.personAId))}</b> <small>${r.kind==='parent'?'is a parent of':r.kind==='partner'?'is a partner of':'is a sibling of'}</small> <b>${E(personName(r.personBId))}</b></div>`).join(''):`<p class="muted">No relationships recorded yet. Begin with a parent, partner or sibling.</p>`}</div>`;
}

function archiveView(){
  const records=searchMemories(state.data.memories,state.search,state.data.people,state.branch,state.personFilter);
  return `${pageHeading('▤ AN ARCHIVE OF LIVED LIVES','A thousand little <em>forevers.</em>','Find the sound of a voice, a recipe, a place, a story—or a moment you almost forgot.',viewButton('capture','+ Add a memory'))}<div class="archive-tools"><label class="search-wrap"><span>⌕</span><input id="archive-search" data-live-search="1" value="${E(state.search)}" placeholder="Search stories, people, Hindi or English transcripts…" aria-label="Search memories"></label><select id="branch-filter" aria-label="Filter by life branch"><option value="all">All branches</option>${branchSelect(state.branch)}</select><select id="person-filter" aria-label="Filter by person">${selectPeople(state.personFilter)}</select></div><div class="archive-resultline" id="archive-count">${records.length} ${records.length===1?'memory':'memories'} in your collection</div><div class="story-grid archive-grid" id="archive-cards">${records.length?records.map(memoryCard).join(''):empty('Nothing matches yet','Try different words, branches, or family members.',viewButton('capture','Plant a new story','btn btn-outline'))}</div>`;
}
function albumView(){
  const images=[];
  for(const p of state.data.people) if(p.portrait) images.push({asset:p.portrait,person:p,kind:'portrait'});
  for(const m of state.data.memories)for(const a of m.attachments)if(a.mime?.startsWith('image/'))images.push({asset:a,memory:m,kind:'memory'});
  return `${pageHeading('▧ THE FAMILY ALBUM','A gallery of <em>belonging.</em>','The photographs we took, the faces we recognize, the moments we can almost step into.',viewButton('capture','+ Save a photograph'))}<div class="album-top"><span>✿ &nbsp; ${images.length} ${images.length===1?'photograph':'photographs'} preserved as originals</span><span>Archival quality · Full resolution kept</span></div>${images.length?`<div class="photo-masonry">${images.map(({asset,memory,person})=>`<button data-action="open-image" data-asset-id="${asset.id}" class="album-tile"><img data-asset-src="${asset.id}" alt="${E(asset.caption||memory?.title||person?.name||'Family photograph')}"><div class="album-caption"><b>${E(asset.caption||memory?.title||person?.name||'Family photograph')}</b><small>${E(memory?(memory.personIds||[]).map(personName).join(' · '):'Family portrait')}</small></div></button>`).join('')}</div>`:empty('An album waiting for its first photograph','Start with an old family portrait or a photo that holds a story.',viewButton('capture','Add a photograph','btn btn-outline'))}`;
}
function peopleView(){return `${pageHeading('♧ THE PEOPLE WE CARRY','Every person <em>is a universe.</em>','A family grove begins with its people. Add a portrait, a life detail, or a story to any person.',aButton('new-person','+ Add a person'))}<div class="people-grid">${state.data.people.map(p=>{const n=state.data.memories.filter(m=>m.personIds?.includes(p.id)).length;return `<button class="person-card" data-person-detail="${p.id}"><div class="person-card-top">${personAvatar(p,'large')}<span>❀</span></div><h3>${E(p.name)}</h3><div class="person-dates">${E(p.born||'')} ${p.died?' – '+E(p.died):''}</div><p>${E(p.bio||'A life full of stories still to be discovered.')}</p><div class="person-card-foot"><span>${n} ${n===1?'story':'stories'}</span><span>Explore life ↗</span></div></button>`;}).join('')}</div><div class="people-bottom-note">❧ &nbsp; Every addition becomes part of the record; corrections are saved as new chapters, never replacements.</div>`;}
function captureView(){
  const c=state.capture;
  const linkedRecordings=[...state.recordAssets,...state.uploadedAssets].filter(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/'));
  return `${pageHeading('◉ PRESERVE A MOMENT','Every story <em>begins somewhere.</em>','Record a voice, film a conversation, write down a memory, or gather photographs. You can mix them together.')}<div class="capture-layout"><div class="capture-form"><div class="section-counter">01 / THE STORY <small class="draft-state" id="draft-save-hint">Drafts save privately as you type</small></div><div class="form-stack"><label>Give this memory a title <span>*</span><input data-draft="title" value="${E(c.title||'')}" placeholder="e.g. Nani's first Diwali in Delhi" maxlength="180"></label><label>Whose story is this? <span>*</span></label><div class="person-checks">${personChecks(c.personIds||[state.selectedPerson])}</div><div class="two-fields"><label>A chapter of life<select data-draft="branch">${branchSelect(c.branch||'childhood')}</select></label><label>When did it happen?<input data-draft="dateLabel" value="${E(c.dateLabel||'')}" placeholder="e.g. Summer 1972, or around 1990"></label></div><label>Where did it happen?<input data-draft="location" value="${E(c.location||'')}" placeholder="A city, a home, a village, anywhere"></label><label>Tell the story (optional)<textarea data-draft="story" rows="6" placeholder="Write naturally. Tell it in English, Hindi, or any language you love…">${E(c.story||'')}</textarea></label><label>Keywords or traditions (optional)<input data-draft="tags" value="${E(c.tags||'')}" placeholder="e.g. Holi, childhood, Lucknow (comma separated)"></label></div>
  <div class="section-counter second-counter">02 / THE ORIGINAL MOMENT</div><div class="recorder-card"><div class="record-heading"><span class="record-ring">◉</span><div><h3>Keep their voice.</h3><p>Audio and video are preserved as their original files, encrypted on this device.</p></div></div><div class="mode-switch"><button data-mode="audio" class="${state.recordMode==='audio'?'selected':''}">♫ &nbsp; Voice recording</button><button data-mode="video" class="${state.recordMode==='video'?'selected':''}">▣ &nbsp; Video recording</button></div><div class="record-deck"><div class="record-wave ${state.recorder?.state==='recording'?'live':''}">${Array.from({length:29},(_,i)=>`<i style="--h:${12+((i*19)%43)}px;--delay:${i*43}ms"></i>`).join('')}</div><div class="record-status" id="record-status">${state.recorder?.state==='recording'?'Recording · 0:00':state.recordAssets.length?'Recording safely preserved for this story':'Ready when you are'}</div><div class="record-actions">${state.recorder?.state==='recording'?aButton('stop-record','■ &nbsp; Stop recording','btn btn-record stop'):aButton('start-record',state.recordAssets.length?'◉ &nbsp; Record another':'◉ &nbsp; Start recording','btn btn-record')}</div>${state.recordAssets.map(a=>`<p class="file-attached">✓ ${E(a.name)} (${fmtSize(a.size)}) <button data-action="download-record" data-original-asset="${a.id}" class="text-action">↓ Save original</button></p>`).join('')}${state.failedRecording?`<p class="record-failed">⚠ The recording could not be encrypted. Download the original immediately. <button data-action="recover-record" class="btn btn-outline btn-small">↓ Save unencrypted original</button> <button data-action="dismiss-failed-record" class="text-action">I saved it elsewhere — continue</button></p>`:''}</div><label class="file-attach">Or add an existing recording <input id="upload-media" type="file" accept="audio/*,video/*" multiple hidden><span>Browse voice notes or videos ↗</span></label><p class="note warning-note">Large videos can be imported in encrypted chunks, but this preview cannot yet restore a .grove backup larger than 1.2 GB. Keep the original video in Files or another independent backup. Available browser space and playback memory still matter.</p>${state.uploadedAssets.map(a=>`<p class="file-attached">✓ ${E(a.name)} (${fmtSize(a.size)})</p>`).join('')}</div>
  <div class="photo-attachment"><div class="attachment-icon">▧</div><div><b>Add photographs</b><p>Preserve full-resolution originals. Old and new photos are welcome.</p><label class="text-action photo-picker">+ Choose photographs<input id="upload-photos" type="file" accept="image/*" multiple hidden></label>${state.photoAssets.length?`<small class="photo-names">${state.photoAssets.length} photo(s) encrypted and added to this draft</small><div class="draft-photo-grid">${state.photoAssets.map(a=>`<div><img data-asset-src="${a.id}" alt="Photo prepared for this memory"><input data-photo-caption="${a.id}" value="${E(a.caption||'')}" placeholder="Who, where, when?" aria-label="Photo caption"></div>`).join('')}</div><p class="photo-interview">✧ Photo interview: Who is in the picture? What happened just before it was taken? Who else might remember?</p>`:''}</div></div>
  <div class="transcription-option"><label><input id="auto-transcribe" type="checkbox" ${state.autoTranscribe?'checked':''}> Transcribe imported audio/video locally and suggest timestamped tree clips</label><p class="note">First use downloads a speech model (about 120 MB). Audio is processed on your device, not sent to our servers. Keep this page open while it runs; slow or memory-limited phones may be unable to complete it.</p>${state.transcription?`<div class="transcription-progress" role="status"><b>${E(state.transcription.status||'Processing interview…')}</b>${state.transcription.running?`<button data-action="cancel-transcription" class="text-action">Stop processing</button>`:''}</div>`:''}${c.autoTranscripts?.length?`<p class="file-attached">✓ ${c.autoTranscripts.reduce((sum,x)=>sum+x.segments.length,0)} timestamped transcript passages ready. Clips will appear in the life trees after you plant this memory.</p>`:''}</div>
  <div class="section-counter second-counter">03 / THE WORDS THEY SPOKE</div><div class="form-stack"><label>Transcript (optional)<textarea data-draft="transcript" rows="6" placeholder="Add the spoken words here, in Hindi, English, or both. You can also add a transcript later.">${E(c.transcript||'')}</textarea></label><div class="transcript-tools"><select data-draft="language" aria-label="Transcript language"><option value="both" ${c.language==='both'?'selected':''}>Hindi + English</option><option value="en" ${c.language==='en'?'selected':''}>English</option><option value="hi" ${c.language==='hi'?'selected':''}>हिन्दी</option><option value="other" ${c.language==='other'?'selected':''}>Other language</option></select>${aButton('dictate-local','✧ Try private on-device dictation','btn btn-outline btn-small')}</div>${linkedRecordings.length?`<label class="form-label">Which original recording do these timestamps refer to?<select data-draft="transcriptAssetId"><option value="">First available recording</option>${opts(linkedRecordings.map(a=>({value:a.id,label:a.name})),c.transcriptAssetId||'')}</select></label>`:''}<p class="note">For time-linked transcripts, begin lines with timestamps like [02:14] or [01:02:14]. They become links into the original recording. Local dictation works only where your browser supports offline speech recognition. Otherwise type or paste a transcript. Nothing is silently sent to a transcription server.</p></div>
  <div class="capture-submit"><div><b>Nothing gets lost in an edit.</b><small>Original media and the first telling stay intact. Future changes create additional history.</small></div>${aButton('save-memory','✿ &nbsp; Plant this memory','btn btn-primary',state.busy?'disabled':'')}</div></div><aside class="capture-aside"><div class="prompt-box"><div class="eyebrow">✿ A CONVERSATION STARTER</div><h3>Not sure where to begin?</h3><div class="prompt-quote">“${E(PROMPTS[(new Date().getDay()+3)%PROMPTS.length].en)}”</div><span>${E(PROMPTS[(new Date().getDay()+3)%PROMPTS.length].hi)}</span>${aButton('next-prompt','Another question ↻','text-action')} ${aButton('followup','✧ Follow-up from this story','text-action')}</div><div class="side-story-note">${miniPlant()}<h3>Let them wander.</h3><p>Some of the loveliest memories start as tangents. Record the whole conversation, then add the moments and chapters you discover afterward.</p></div><div class="safety-box">♧ &nbsp; <b>Protected as you go</b><p>Your recordings live inside your encrypted grove. Turn on automatic original downloads in Privacy & keepsakes for a second copy after each recording.</p></div></aside></div>`;
}
function renderTranscript(text,assetId){
  const lines=String(text||'').split(/\r?\n/);
  return lines.map(line=>{
    const parsed=parseTranscriptSegments(line)[0];
    if(parsed && assetId)return `<div class="transcript-line"><button data-seek="${E(assetId)}" data-time="${parsed.start}" class="transcript-time">${formatTime(parsed.start)} ↗</button><span>${E(parsed.text)}</span></div>`;
    return `<p>${E(line)||'&nbsp;'}</p>`;
  }).join('');
}
function detailView(){
  const m=state.data.memories.find(m=>m.id===state.memoryId);
  if(!m)return empty('This memory is not here','Try opening another story.',viewButton('archive','Browse stories'));
  const recordings=m.attachments.filter(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/'));
  const images=m.attachments.filter(a=>a.mime?.startsWith('image/'));
  const hist=state.data.history.get(m.id)||[];
  return `<button class="text-action back-link" data-nav="archive">← Back to the archive</button><div class="memory-head"><div class="eyebrow">${branchFor(m.branch).symbol} &nbsp; ${E(branchFor(m.branch).name.toUpperCase())} &nbsp; · &nbsp; ${E(m.dateLabel||'A FAMILY STORY')}</div><h1>${E(m.title)}</h1><div class="detail-sub"><span>❧ &nbsp; ${(m.personIds||[]).map(id=>E(personName(id))).join(' · ')}</span>${m.location?`<span>⌖ &nbsp; ${E(m.location)}</span>`:''}<span>First preserved ${formatDate(m.createdAt)}</span></div><div class="detail-actions">${aButton('prepare-backup','Save a backup','btn btn-outline btn-small')}${aButton('organize-story','✧ Discover chapters','btn btn-outline btn-small')}${aButton('edit-memory','✎ Add a correction','btn btn-outline btn-small')}${aButton('add-photo','▧ Add a photo','btn btn-outline btn-small')}${aButton('add-transcript','▤ Add transcript','btn btn-outline btn-small')}${aButton('add-note','+ Family note','btn btn-outline btn-small')}</div></div><div class="detail-columns"><div class="detail-main">${m.sourceMemoryId?`<div class="source-origin">✧ This chapter grew from another recording. <button class="text-action" data-detail="${m.sourceMemoryId}">Open the uncut original →</button></div>`:''}${m.story?`<div class="story-prose"><div class="section-counter">THE STORY AS IT WAS TOLD</div><p>${E(m.story).replaceAll('\n','<br>')}</p></div>`:''}
  ${recordings.length?`<section class="detail-section"><div class="section-counter">ORIGINAL VOICE & FILM</div>${recordings.map(a=>`<div class="media-object"><div class="media-heading"><span>${a.mime.startsWith('video/')?'▣':'♫'}</span><div><b>${E(a.name)}</b><small>${fmtSize(a.size)} · Original ${a.mime.startsWith('video/')?'video':'audio'}</small></div><button class="text-action" data-download-asset="${a.id}">Save ↓</button></div>${a.mime.startsWith('video/')?`<video controls playsinline preload="metadata" data-asset-src="${a.id}" data-play-id="${a.id}"></video>`:`<audio controls preload="metadata" data-asset-src="${a.id}" data-play-id="${a.id}"></audio>`}</div>`).join('')}<div class="small-actions">${aButton('add-moment','+ Mark a timestamped moment','btn btn-outline btn-small')}</div></section>`:''}
  ${images.length?`<section class="detail-section"><div class="section-counter">PHOTOGRAPHS FROM THIS STORY</div><div class="detail-photos">${images.map(a=>`<button data-action="open-image" data-asset-id="${a.id}"><img alt="${E(a.caption||m.title)}" data-asset-src="${a.id}"><span>${E(a.caption||'View original ↗')}</span></button>`).join('')}</div></section>`:''}
  ${m.transcripts.length?`<section class="detail-section"><div class="section-counter">WORDS WORTH KEEPING</div>${m.transcripts.map((t,i)=>`<details class="transcript-entry" ${i===m.transcripts.length-1?'open':''}><summary>Transcript ${i+1} · ${E(t.language||'mixed languages')} <small>${formatDate(t.at)}</small></summary><div class="transcript-text">${renderTranscript(t.text,t.assetId||recordings[0]?.id)}</div></details>`).join('')}</section>`:''}
  ${m.moments.length?`<section class="detail-section"><div class="section-counter">MOMENTS TO REVISIT</div>${m.moments.map(x=>`<div class="moment-row"><button class="moment-clock" data-seek="${E(x.assetId||recordings[0]?.id)}" data-time="${Number(x.start)||0}">${formatTime(x.start)} ↗</button><div><b>${E(x.title||'A special moment')}</b><p>${E(x.text||'')}</p></div></div>`).join('')}</section>`:''}
  ${m.notes.length?`<section class="detail-section"><div class="section-counter">FAMILY MARGINALIA</div>${m.notes.map(n=>`<blockquote class="family-note"><p>${E(n.text)}</p><footer>— ${E(n.actor)} · ${formatDate(n.at)}</footer></blockquote>`).join('')}</section>`:''}
  ${!m.story&&!m.transcripts.length&&!recordings.length&&!images.length?empty('Every memory deserves a place','Add a photograph, a transcript or an original recording.'):''}</div>
  <aside class="detail-aside"><div class="detail-aside-card"><div class="eyebrow">✿ A LIVING RECORD</div><h3>Every telling remains.</h3><p>Corrections and additions become new entries. No family member can erase an original through this app.</p><div class="small-actions">${aButton('edit-memory','+ Add a correction','text-action')}</div></div><div class="history-card"><h3>Story history <span>${hist.length}</span></h3>${hist.map((e,i)=>`<div class="history-row"><div class="history-dot"></div><div><b>${E(({ 'memory.create':'Original memory', 'memory.attach':'Original media added', 'memory.revise':'Correction added', 'memory.transcript':'Transcript contributed', 'memory.note':'Family note added', 'memory.moment':'Timestamp marked'})[e.type]||e.type)}</b><small>${E(e.actor)} · ${formatDate(e.at)}</small>${e.payload?.reason?`<small>Reason: ${E(e.payload.reason)}</small>`:''}${(e.type==='memory.create'||e.type==='memory.revise')?`<details class="history-version"><summary>Read this version</summary><p>${E(e.type==='memory.create'?e.payload.story||'No written story':e.payload.patch?.story||'No written story')}</p></details>`:''}</div></div>`).join('')}</div></aside></div>`;
}
function askView(){
  return `${pageHeading('✧ FOLLOW THE THREAD','Ask the <em>grove.</em>','Find memories across voices and generations. Answers are grounded in words your family actually preserved.')}
  <div class="ask-layout"><div class="ask-panel"><div class="ask-illustration">${miniPlant()}<span>THE FAMILY'S LIVING INDEX</span></div><h2>What do you want to remember?</h2><p>Search the stories and transcripts in your encrypted archive, right here on your device.</p><form data-form="ask" class="ask-form"><label class="search-wrap"><span>✧</span><input name="question" placeholder="e.g. What did Nani remember about moving to Delhi?" value="${E(state.answerQuery)}" required></label><button type="submit" class="btn btn-primary">Find the stories →</button></form><div class="suggested-questions">${['What were our family traditions?','Who talked about their childhood?','What did people learn from their parents?'].map(q=>`<button data-question="${E(q)}">${E(q)} ↗</button>`).join('')}</div>
  ${state.answerQuery?`<div class="answer-box"><div class="section-counter">SOURCE-GROUNDED RESULTS</div>${state.answer?`<div class="ai-answer"><div class="eyebrow">✧ ON-DEVICE AI SUMMARY</div><p>${E(state.answer)}</p><small>Check the original passages below. Summaries can make mistakes.</small></div>`:''}${state.answerSources.length?`<h3>Found in ${state.answerSources.length} passages</h3>${state.answerSources.map((h,i)=>`<button class="source-hit" data-detail="${h.memory.id}" ${h.start!==undefined?`data-detail-start="${h.start}"${h.assetId?` data-detail-asset="${E(h.assetId)}"`:''}`:""}><div><span class="source-number">${String(i+1).padStart(2,'0')}</span><span class="source-type">${E(h.label)}</span></div><h4>${E(h.memory.title)}</h4><p>“${E(h.text)}”</p><small>Open original memory ↗</small></button>`).join('')}${aButton('compose-ai','✧ Compose from these sources (on-device AI)','btn btn-outline btn-small',state.aiBusy?'disabled':'')}`:`<p>No matching passages found. Try a name, location, tradition or shorter question.</p>`}</div>`:''}</div><aside class="ask-side"><div class="prompt-box"><div class="eyebrow">WHAT THE GROVE KNOWS</div><h3>Only what you give it.</h3><p>Your archive is never sent to Memory Grove or an external AI service.</p><div class="small-gold-line"></div><p>Search works offline in Hindi and English. Optional summarization is available only when your browser already provides a local language model.</p></div><div class="ask-foot">✿ &nbsp; A source is more precious than a guess.</div></aside></div>`;
}
async function updateUsage(){try{const value=await storageUsage();const el=document.getElementById('storage-status');if(el)el.textContent=value?`${fmtSize(value.usage)} used · ${fmtSize(value.quota)} available quota · ${value.persisted?'persistent storage granted':'browser may clear data under pressure'}`:'Storage quota unavailable in this browser.';}catch{}}
function settingsView(){
  return `${pageHeading('♧ FAMILY STEWARDSHIP','Keep them <em>safe. Keep them yours.</em>','No account. No cloud subscription. No tracking. Your family decides how stories are shared and preserved.')}
  <div class="settings-grid"><section class="settings-card featured-setting"><div class="settings-card-icon">♧</div><div class="eyebrow">YOUR FAMILY'S DIGITAL HEIRLOOM</div><h2>Back up the whole grove.</h2><p>Download a password-protected archive containing the complete family history, all original recordings, videos, photographs, transcripts and timestamps. Keep copies in at least two safe places.</p><div class="setting-actions">${aButton('prepare-backup','Save to Files or a cloud drive')}${aButton('export-vault','Download backup','btn btn-outline')}${aButton('merge-start','Import family updates ↗','btn btn-outline')}</div><p class="note">Anyone with the archive and passphrase can read it. Send the archive and passphrase separately.</p></section>
  <section class="settings-card"><div class="settings-card-icon">♫</div><h3>Keep originals independently</h3><p>After recording, optionally save an unencrypted original to your device's Downloads. The app also saves an encrypted copy in the grove.</p><label class="switch-row"><span>Automatically download recordings</span><input id="auto-download" type="checkbox" ${state.autoDownload?'checked':''}><i></i></label><p class="note">Especially useful for priceless interviews. Back up those files yourself, too.</p></section>
  <section class="settings-card"><div class="settings-card-icon">❧</div><h3>Family exchange</h3><p>Send a trusted relative an encrypted copy. They can add stories on their own device and send updates back. Importing adds history, never replaces it.</p>${aButton('share-start','✉ &nbsp; Prepare family invitation','btn btn-outline')}<p class="note">This is file-based sharing, not a live invite link or automatic sync.</p></section>
  <section class="settings-card"><div class="settings-card-icon">▤</div><h3>Readable keepsake</h3><p>Export a human-readable Markdown book of names, stories, transcripts, timestamps and history. Media originals remain separately available from the encrypted archive.</p>${aButton('export-readable','↓ &nbsp; Download story book','btn btn-outline')}<p class="note warning-note">Readable exports are not encrypted. Keep them private.</p></section>
  <section class="settings-card"><div class="settings-card-icon">⚙</div><h3>Space & preservation</h3><p id="storage-status">Checking this device's storage…</p>${aButton('persist-storage','Request persistent storage','btn btn-outline btn-small')}${aButton('check-integrity','✓ Verify every saved original','btn btn-outline btn-small')}<p class="note">Browser storage is not permanent backup. Clearing site data or losing a device can remove local stories.</p></section>
  <section class="settings-card"><div class="settings-card-icon">✿</div><h3>Names & conversation</h3><label class="form-label">How your contributions are credited<input id="actor-name" value="${E(state.actor)}" maxlength="80"></label><label class="form-label">Default prompt language<select id="prompt-language"><option value="both" ${state.language==='both'?'selected':''}>English & Hindi</option><option value="en" ${state.language==='en'?'selected':''}>English</option><option value="hi" ${state.language==='hi'?'selected':''}>Hindi</option></select></label>${aButton('edit-family','Update family name','text-action')}</section><section class="settings-card"><div class="settings-card-icon">⌂</div><h3>Take the grove home</h3><p>Install this website to your Home Screen for an app-like experience. Once installed and loaded, its essential pages can open offline.</p>${aButton('install-app','↗ &nbsp; Install Memory Grove','btn btn-outline')}<p class="note">On iPhone, open the website in Safari and choose Share → Add to Home Screen.</p></section></div>
  <div class="privacy-long"><div class="eyebrow">THE PROMISE OF THE GROVE</div><h2>A story is a gift, <em>never something to erase.</em></h2><div class="privacy-columns"><div><b>Encrypted by your passphrase</b><p>Stories and original media are encrypted before saving in this browser. Only people with the passphrase can open them.</p></div><div><b>Corrections, not replacements</b><p>Our interface never deletes an original. Edits become new history, visible alongside earlier contributions.</p></div><div><b>Honest about the limits</b><p>A person who controls a device or archive can destroy or alter local storage. There is no server-backed enforcement or recovery.</p></div></div><div class="activity-line"><b>${state.data.events.length}</b> permanent history entries in this grove ${aButton('show-log','View history ↗','text-action')}</div></div>`;
}
function dialogContent(){
  const d=state.dialog;
  let body='';let title='';let subtitle='';
  switch(d.type){
    case 'backup-file':
      title='Keep a second copy';
      subtitle='This encrypted file contains your stories, photos and original recordings.';
      body=`<p>Choose a cloud drive or copy the download there. On a new device, select “Open an existing backup” and enter your grove passphrase.</p>
        <p class="note">Save a fresh copy after adding stories. Each backup includes changes up to the time you make it.</p>
        <div class="setting-actions">${navigator.canShare?.({files:[d.file]})?aButton('share-backup-file','Choose where to save'):''}${aButton('save-backup-file','Download backup','btn btn-outline')}</div>`;
      break;
    case 'person':title=d.id?'Add to their life':'Welcome another life';subtitle='A name is the beginning of a hundred stories.';{
      const p=state.data?.people.find(x=>x.id===d.id)||{};
      body=`<form data-form="person" class="form-stack"><label>Full name <span>*</span><input name="name" required value="${E(p.name||'')}" maxlength="100" placeholder="How should they be remembered?"></label><div class="two-fields"><label>Born (approximate is fine)<input name="born" value="${E(p.born||'')}" placeholder="e.g. 1948"></label><label>Passed away (optional)<input name="died" value="${E(p.died||'')}" placeholder="e.g. 2021"></label></div><label>A little about them<textarea name="bio" rows="4" placeholder="A beloved aunt, a wonderful cook, an explorer…">${E(p.bio||'')}</textarea></label>${d.id?`<label class="form-label">Reason for correction <input name="reason" placeholder="e.g. Confirmed year with family"></label>`:''}<button class="btn btn-primary wide" type="submit">${d.id?'Save another version':'✿ Add this person'} →</button></form>${d.id?`<div class="modal-foot-action"><label class="text-action">+ Add a portrait<input type="file" id="portrait-upload" accept="image/*" hidden></label></div>`:''}`;
    }break;
    case 'relation':title='Connect two branches';subtitle='Tell the grove how two people are related.';body=`<form data-form="relation" class="form-stack"><label>First person<select name="personA">${opts(state.data.people.map(p=>({value:p.id,label:p.name})))}</select></label><label>Relationship<select name="kind"><option value="parent">is a parent of</option><option value="partner">is a partner of</option><option value="sibling">is a sibling of</option></select></label><label>Second person<select name="personB">${opts(state.data.people.map(p=>({value:p.id,label:p.name})),state.data.people[1]?.id)}</select></label><button type="submit" class="btn btn-primary wide">Add relationship →</button></form>`;break;
    case 'person-detail':{
      const p=state.data.people.find(x=>x.id===d.id);title=p?.name||'A life';subtitle=`${E(p?.born||'')} ${p?.died?'– '+E(p.died):''}`;
      const mem=state.data.memories.filter(m=>m.personIds?.includes(p?.id));
      body=`<div class="modal-person">${personAvatar(p,'large')}<p>${E(p?.bio||'Every life is a story worth keeping.')}</p></div><div class="modal-person-actions">${aButton('edit-person','✎ Add a correction','btn btn-outline btn-small')}${aButton('person-tree','Explore their tree →','btn btn-primary btn-small')}</div><div class="section-counter">THEIR STORIES · ${mem.length}</div>${mem.length?mem.slice(0,6).map(memoryRow).join(''):'<p class="muted">No memories attached yet.</p>'}<label class="text-action portrait-add">+ Add a portrait<input id="portrait-upload" type="file" accept="image/*" hidden></label><div class="profile-history"><div class="section-counter">LIFE DETAIL HISTORY</div>${(state.data.history.get(p.id)||[]).map(e=>`<details><summary>${E(e.type.replace('.',' · '))} · ${formatDate(e.at)}</summary><pre>${E(JSON.stringify(e.payload,null,2))}</pre></details>`).join('')}</div>`;
    }break;
    case 'organize':{
      const m=state.data.memories.find(x=>x.id===state.memoryId);
      title='Discover the chapters';subtitle='An offline first pass groups the original words into possible chapters. Review, edit or uncheck each one. No recording or original story will be changed.';
      body=`<div class="organize-note"><b>Original preserved:</b> ${E(m?.title)}. No timestamps are guessed; add exact time-linked moments separately.</div>${aButton('ai-organize','✧ Improve suggestions using on-device AI','btn btn-outline btn-small')}<form data-form="organize" class="form-stack chapter-form">${state.chapterSuggestions.length?state.chapterSuggestions.map((ch,i)=>`<div class="chapter-suggestion"><label class="chapter-include"><input type="checkbox" name="include-${i}" checked> Plant chapter ${i+1}</label><label>Chapter title<input name="title-${i}" value="${E(ch.title)}" required></label><label>Life branch<select name="branch-${i}">${branchSelect(ch.branch)}</select></label><label>Original words<textarea name="text-${i}" rows="4">${E(ch.text)}</textarea></label></div>`).join(''):'<p>There are no written words or transcripts to organize yet. Add a transcript first.</p>'}<button type="submit" class="btn btn-primary wide" ${!state.chapterSuggestions.length?'disabled':''}>Plant selected chapters →</button></form>`;
    }break;
    case 'edit-memory':{
      const m=state.data.memories.find(x=>x.id===state.memoryId);title='Add a correction';subtitle='The original wording stays in the story history. A corrected version is shown to readers.';
      body=`<form data-form="edit-memory" class="form-stack"><label>Title<input name="title" required value="${E(m?.title)}"></label><label>Story<textarea name="story" rows="6">${E(m?.story||'')}</textarea></label><label>Life branch<select name="branch">${branchSelect(m?.branch)}</select></label><label>Approximate date<input name="dateLabel" value="${E(m?.dateLabel||'')}"></label><label>Reason for correction <span>*</span><input name="reason" required placeholder="e.g. Added context after talking with grandpa"></label><button class="btn btn-primary wide">Append correction →</button></form>`;
    }break;
    case 'transcript':{
      const m=state.data.memories.find(x=>x.id===state.memoryId);
      const originals=m?.attachments.filter(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/'))||[];
      title='Keep their words';subtitle='Every transcript version is preserved with its contributor and date.';
      body=`<form data-form="transcript" class="form-stack"><label>Transcript<textarea name="text" rows="9" required placeholder="In their own words…"></textarea></label><label>Language<select name="language"><option value="both">Mixed / Hindi & English</option><option value="hi">Hindi</option><option value="en">English</option><option value="other">Other language</option></select></label>${originals.length?`<label>Original recording for timestamp links<select name="assetId"><option value="">First original recording</option>${opts(originals.map(a=>({value:a.id,label:a.name})))}</select></label>`:''}<button class="btn btn-primary wide">Preserve transcript →</button></form>`;
    }break;
    case 'moment':{
      const m=state.data.memories.find(x=>x.id===state.memoryId);const recordings=m?.attachments.filter(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/'))||[];
      title='Mark a moment';subtitle='Create a timestamp-linked scene without cutting or changing the original recording.';
      body=`<form data-form="moment" class="form-stack"><label>Which recording?<select name="assetId">${opts(recordings.map(a=>({value:a.id,label:a.name})))}</select></label><label>Give this moment a name<input name="title" required placeholder="e.g. The story of the old mango tree"></label><div class="two-fields"><label>Start (mm:ss)<input name="start" required placeholder="02:14" pattern="[0-9]+(:[0-5][0-9])?"></label><label>End (optional)<input name="end" placeholder="03:06" pattern="[0-9]+(:[0-5][0-9])?"></label></div><label>What happens here?<textarea name="text" rows="3" placeholder="A short description or a quote"></textarea></label><button class="btn btn-primary wide">Keep this moment →</button></form>`;
    }break;
    case 'note':title='A note in the margins';subtitle='Add a recollection, clarification or reflection. Everyone’s contributions stay visible.';body=`<form data-form="note" class="form-stack"><label>Your family note<textarea name="text" required rows="6" placeholder="I remember this day too…"></textarea></label><button class="btn btn-primary wide">Add family note →</button></form>`;break;
    case 'photo':title='Add a photograph';subtitle='The full-resolution file will be preserved alongside this story.';body=`<form data-form="photo" class="form-stack"><label>Choose image files<input name="photos" type="file" accept="image/*" multiple required></label><label>Caption (optional)<input name="caption" placeholder="Who, where, when"></label><button class="btn btn-primary wide">Preserve photographs →</button></form>`;break;
    case 'merge':title='Welcome their stories home';subtitle='Import an encrypted archive from a relative. New entries are appended, and existing entries are never replaced.';body=`<form data-form="merge" class="form-stack"><label>Family archive (.grove)<input name="archive" type="file" accept=".grove,application/json" required></label><label>Passphrase for their archive<input type="password" name="password" required></label><button class="btn btn-primary wide">Merge family memories →</button></form><p class="note">The archive can come from another device with a different passphrase. Existing stories are checked for conflicting versions.</p>`;break;
    case 'share':title='Invite someone to the grove';subtitle='In a local-first home, an invitation is a protected copy you exchange privately.';body=`<div class="share-steps"><div><b>1</b><p>Download your encrypted family archive.</p></div><div><b>2</b><p>Send the .grove file to someone you trust, using your own messaging or file-sharing app.</p></div><div><b>3</b><p>Share the passphrase separately. They restore it, add stories, then send their encrypted archive back to merge.</p></div></div>${aButton('export-vault','↓ &nbsp; Prepare encrypted invitation','btn btn-primary wide')}<p class="note">Anyone who knows the passphrase and has the archive can access its contents. Revoking an already shared copy is not possible without a managed server.</p>`;break;
    case 'family':title='Name your grove';subtitle='The name can grow with your family; previous names remain in the event log.';body=`<form data-form="family" class="form-stack"><label>Family grove name<input name="name" value="${E(state.data.family.name)}" required maxlength="100"></label><label>Motto (optional)<input name="motto" value="${E(state.data.family.motto||'')}" maxlength="160"></label><button class="btn btn-primary wide">Save new name →</button></form>`;break;
    case 'install':title='A little grove on your Home Screen';subtitle='No app store, no purchase, no account.';body=`<div class="share-steps"><div><b>1</b><p>Open the public Memory Grove website in Safari on your iPhone.</p></div><div><b>2</b><p>Tap Share (the square with an arrow) and choose <b>Add to Home Screen</b>.</p></div><div><b>3</b><p>Choose <b>Open as Web App</b> if offered. Open the new icon and set up or restore your encrypted grove.</p></div></div><p class="note">Each browser or installed app may have separate local storage. Use an encrypted backup to move family stories between them.</p>`;break;
    case 'log':title='The history of the grove';subtitle='An additive ledger of the changes this device knows about. Entries cannot be deleted through Memory Grove.';body=`<div class="log-list">${state.data.events.slice().reverse().map(evt=>`<div class="log-entry"><b>${E(evt.type.replace('.',' · '))}</b><small>${E(evt.actor)} · ${formatDate(evt.at)}</small><code>${E(evt.id.slice(0,14))}…</code><details class="log-payload"><summary>Inspect contribution</summary><pre>${E(JSON.stringify(evt.payload,null,2))}</pre></details></div>`).join('')}</div>`;break;
    case 'image':title='An original photograph';subtitle='Preserved at the resolution it was received.';body=`<div class="full-image"><img id="lightbox-image" data-asset-src="${d.id}" alt="Family photograph"></div><div class="modal-foot-action"><button class="btn btn-outline" data-download-asset="${d.id}">↓ Save full-resolution original</button></div>`;break;
    case 'restore':title='Restore your family grove';subtitle='Open an encrypted archive saved by Memory Grove. You will need its passphrase.';body=`<form data-form="restore" class="form-stack"><label>Encrypted .grove archive<input type="file" name="archive" accept=".grove,application/json" required></label><label>Original archive passphrase<input type="password" name="password" required></label><button class="btn btn-primary wide">Restore private archive →</button></form><p class="note">Restores only into an empty browser vault. If a grove already exists, use Import family updates.</p>`;break;
  }
  return `<div class="modal-screen" role="presentation" data-action="close-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${E(title)}"><button class="modal-close" data-action="close-modal" aria-label="Close dialog">×</button><div class="modal-flower">✿</div><div class="eyebrow">MEMORY GROVE</div><h2>${E(title)}</h2><p class="modal-sub">${E(subtitle)}</p>${body}</section></div>`;
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const safeFilename=s=>String(s||'memory').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,75);
async function reload(){state.data=projectEvents(await loadEvents(state.key));if(!state.data.people.some(p=>p.id===state.selectedPerson))state.selectedPerson=state.data.people[0]?.id||'';render();}
async function event(type,payload){await appendEvent(state.key,type,payload,state.actor);await reload();}
async function hydrateAssets(){
  const els=[...app.querySelectorAll('[data-asset-src]')];
  for(const el of els){
    const id=el.dataset.assetSrc;
    try{if(!fileUrls.has(id)){
      let mime='application/octet-stream';
      for(const m of state.data.memories){const a=m.attachments.find(a=>a.id===id);if(a){mime=a.mime;break;}}
      const draftPhoto=state.photoAssets.find(a=>a.id===id);if(draftPhoto)mime=draftPhoto.mime;
      const person=state.data.people.find(p=>p.portrait?.id===id);if(person)mime=person.portrait.mime;
      fileUrls.set(id,URL.createObjectURL(await loadAsset(state.key,id,mime)));
    }
    if(el.isConnected)el.src=fileUrls.get(id);
    }catch(err){if(el.isConnected){el.title=err.message;el.classList.add('missing-asset');}}
  }
}
function clearUrls(){for(const u of fileUrls.values())URL.revokeObjectURL(u);fileUrls.clear();}
function closeDialog(){state.dialog=null;render();}
function openDialog(type,extra={}){state.dialog={type,...extra};render();}
function changeView(view){if(state.recordFinalizing){toast('Finishing your recording first. Please try again once it is preserved.');return;}if(state.recorder?.state==='recording'&&!confirm('A recording is in progress. Leave this page and stop it?'))return;if(state.recorder?.state==='recording')stopRecording();state.view=view;state.dialog=null;if(view==='capture'&&!state.capture.personIds)state.capture={branch:'childhood',personIds:[state.selectedPerson],language:'both'};render();window.scrollTo({top:0,behavior:'instant'});}
function showDetail(id){state.memoryId=id;state.dialog=null;state.view='detail';render();window.scrollTo(0,0);}
function activeRecordFile(){return state.recordFile||state.uploadedFile;}
async function ensureFileSize(file){const available=await storageUsage();
  if(available?.quota && available.quota-available.usage < file.size*1.65)
    throw new Error('This device appears to have insufficient browser storage for the whole original. Keep the original in Files or your cloud drive and free up storage before importing.');}
async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Recording is unavailable here. Open the PWA via HTTPS on a supported browser, or upload a recording.');
  if(state.recorder?.state==='recording'||state.recordFinalizing)throw new Error('The last recording is still being saved. Finish that save before starting another.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:state.recordMode==='video'?{facingMode:'user'}:false});
  state.stream=stream;
  const desired=state.recordMode==='video'?['video/mp4','video/webm;codecs=vp8,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm'];
  const mime=desired.find(m=>MediaRecorder.isTypeSupported(m));
  const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
  const chunks=[];let recordedBytes=0;
  recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);recordedBytes+=e.data.size;}if(recordedBytes>=245*1024*1024&&recorder.state==='recording'){toast('Recording nearing 250 MB limit; saving this segment. Start another to continue.');recorder.stop();}};
  recorder.onerror=e=>toast(e.error?.message||'Recording error.');
  recorder.onstop=async()=>{
    state.recordFinalizing=true;
    const kind=recorder.mimeType||mime||(state.recordMode==='video'?'video/webm':'audio/webm');
    const ext=kind.includes('mp4')?'mp4':kind.startsWith('audio/')?'webm':'webm';
    const original=new File([new Blob(chunks,{type:kind})],`Family-recording-${new Date().toISOString().replace(/[:.]/g,'-')}.${ext}`,{type:kind});
    state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;
    clearInterval(state.recordTimer);state.recordTimer=null;state.recorder=null;
    try{
      await ensureFileSize(original);
      state.recordFile=original;state.failedRecording=null;
      state.recordAsset=await saveAsset(state.key,original);state.recordAssets.push(state.recordAsset);
      await persistDraft();
      if(state.autoDownload)downloadBlob(original,original.name);
      toast('Recording preserved in your encrypted grove. Finish the story to link it to a memory.');
    }catch(err){state.failedRecording=original;toast(`Recording could not be saved to the grove: ${err.message}. Download the original immediately.`);}
    state.recordFinalizing=false;
    render();
  };
  for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(recorder.state==='recording')recorder.stop();},{once:true});
  recorder.start(1000);state.recorder=recorder;state.recordStarted=Date.now();state.recordTimer=setInterval(refreshRecordIndicator,500);render();
}
function stopRecording(){if(state.recorder?.state==='recording')state.recorder.stop();}
function refreshRecordIndicator(){const el=document.getElementById('record-status');if(el&&state.recorder?.state==='recording')el.textContent=`● Recording · ${formatTime((Date.now()-state.recordStarted)/1000)}`;}
async function transcribeImportedOriginal(file,asset){
  if(!state.autoTranscribe)return;
  state.transcription={running:true,status:'Preparing private speech recognition…',assetId:asset.id};
  render();
  let session;
  try{
    const {startLocalTranscription}=await import('./transcriber.js');
    session=startLocalTranscription(file,({stage,progress})=>{
      if(state.transcription?.assetId!==asset.id)return;
      const percentage=Number(progress);
      const formatted=Number.isFinite(percentage)?' · '+Math.round(percentage<=1?percentage*100:percentage)+'%':'';
      state.transcription.status=(stage||'Transcribing')+formatted;
      const node=document.querySelector('.transcription-progress b');
      if(node)node.textContent=state.transcription.status;
    });
    state.transcriptionCancel=()=>session.cancel();
    const segments=[];
    for await(const part of session.segments){
      if(!Number.isFinite(Number(part.start))||!Number.isFinite(Number(part.end))||!part.text?.trim())continue;
      segments.push({start:Number(part.start),end:Number(part.end),text:part.text.trim()});
      if(segments.length%5===0){
        state.transcription.status='Transcribed '+segments.length+' timestamped passages…';
        const node=document.querySelector('.transcription-progress b');if(node)node.textContent=state.transcription.status;
      }
    }
    if(!segments.length)throw new Error('No intelligible speech was found. Your original is still saved.');
    const saved=state.capture.autoTranscripts||[];
    state.capture.autoTranscripts=[...saved.filter(x=>x.assetId!==asset.id),{assetId:asset.id,segments}];
    await persistDraft();
    state.transcription={running:false,status:'✓ Transcript and topic clips ready for '+asset.name,assetId:asset.id};
    toast('✓ Interview transcribed locally. The chapter clips will be saved with this memory.');
  }catch(err){
    state.transcription={running:false,status:'Transcription unavailable: '+(err.message||'unsupported device')+'. The original was saved; a transcript can be added manually.',assetId:asset.id};
  }finally{
    state.transcriptionCancel=null;
    session?.dispose?.();
    render();
  }
}
async function saveMemory(){
  if(state.busy)return;
  if(state.recorder?.state==='recording'||state.recordFinalizing||state.transcription?.running)throw new Error('Finish or stop transcription and recording before planting this story.');
  if(state.failedRecording)throw new Error('A recording could not be stored. Save its original and resolve the failed recording before publishing.');
  const c=state.capture;const title=(c.title||'').trim();const people=c.personIds||[];
  if(!title)throw new Error('Give this memory a title before planting it.');
  if(!people.length)throw new Error('Choose at least one person whose story this is.');
  if(!c.story?.trim()&&!c.transcript?.trim()&&!c.autoTranscripts?.length&&!state.recordAssets.length&&!state.uploadedAssets.length&&!state.photoAssets.length)throw new Error('Add a story, photograph, voice recording, video or transcript.');
  state.busy=true;
  try{
    const mId=randomId();
    const payload={id:mId,title,personIds:people,branch:c.branch||'childhood',story:c.story||'',dateLabel:c.dateLabel||'',location:c.location||'',tags:(c.tags||'').split(',').map(x=>x.trim()).filter(Boolean)};
    const assets=[];
    assets.push(...state.recordAssets);
    assets.push(...state.uploadedAssets);
    for(const asset of state.photoAssets)assets.push(asset);
    const items=[{type:'memory.create',payload},...assets.map(asset=>({type:'memory.attach',payload:{id:mId,asset}}))];
    if(c.transcript?.trim())items.push({type:'memory.transcript',payload:{id:mId,text:c.transcript,language:c.language||'both',kind:'original',assetId:c.transcriptAssetId||assets.find(a=>a.mime?.startsWith('audio/')||a.mime?.startsWith('video/'))?.id||null}});
    for(const completed of (c.autoTranscripts||[])){
      const segments=completed.segments||[];
      const transcript=segments.map(x=>'['+formatTime(x.start)+'] '+x.text).join('\n');
      if(transcript)items.push({type:'memory.transcript',payload:{id:mId,text:transcript,language:'both',kind:'local-whisper',assetId:completed.assetId}});
      for(const clip of suggestTimedClips(segments)){
        items.push({type:'memory.moment',payload:{id:mId,assetId:completed.assetId,start:clip.start,end:clip.end,title:clip.title,text:clip.text,branch:clip.branch,kind:'automatically-suggested'}});
      }
    }
    await appendEventBatch(state.key,items,state.actor);
    clearTimeout(state.draftTimer);state.draftTimer=null;
    state.recordAsset=null;state.recordAssets=[];state.failedRecording=null;state.recordFile=null;state.uploadedFile=null;state.uploadedAsset=null;state.uploadedAssets=[];state.photoFiles=[];state.photoAssets=[];state.capture={};state.transcription=null;await clearDraft(state.key);state.memoryId=mId;state.view='detail';
    await reload();window.scrollTo(0,0);toast('✿ Memory saved on this device. Export an encrypted backup after important interviews.');
  }finally{state.busy=false;}
}
async function localDictation(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR||!('processLocally' in SR.prototype)||typeof SR.available!=='function')throw new Error('This browser does not offer verified on-device speech recognition. Please type or paste a transcript instead.');
  const lang=state.capture.language==='hi'?'hi-IN':'en-US';
  const availability=await SR.available({langs:[lang],processLocally:true});
  if(availability!=='available')throw new Error(`The ${lang} offline language pack is not installed. This app will not send family audio to an online dictation service.`);
  const rec=new SR();rec.lang=lang;rec.processLocally=true;rec.continuous=true;rec.interimResults=false;
  rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){state.capture.transcript=((state.capture.transcript||'')+' '+e.results[i][0].transcript).trim();const field=document.querySelector('[data-draft="transcript"]');if(field)field.value=state.capture.transcript;}};
  rec.onerror=e=>toast('Private dictation stopped: '+e.error);
  rec.start();toast('Private on-device dictation started. Speak naturally, then stop from the browser microphone control.');
}
async function enhanceChaptersWithAI(){
  const LM=window.LanguageModel;
  if(!LM?.availability||!LM?.create||(await LM.availability())!=='available')throw new Error('An already-installed on-device language model is required. The offline chapter suggestions are still available.');
  const m=state.data.memories.find(x=>x.id===state.memoryId);const source=(m?.story||latestText(m)||'').slice(0,9000);
  if(!source)throw new Error('Add written words or a transcript first.');
  const session=await LM.create();let response;
  try{response=await session.prompt(`Suggest up to 6 meaningful chapters for this family oral-history text. Reply ONLY with a JSON array of objects {"title":"short title","branch":"one of childhood,family,learning,work,journeys,traditions,turning,wisdom","quote":"an exact, continuous substring from the source"}. Do not invent dates, events, or timestamps. Source:\n${source}`);}finally{session.destroy?.();}
  let parsed;try{parsed=JSON.parse(String(response).replace(/^```(?:json)?/,'').replace(/```$/,'').trim());}catch{throw new Error('The local model did not return usable chapters. You can edit the offline suggestions instead.');}
  const valid=(Array.isArray(parsed)?parsed:[]).slice(0,6).filter(x=>x&&typeof x.title==='string'&&typeof x.quote==='string'&&source.includes(x.quote)&&BRANCHES.some(b=>b.id===x.branch)).map(x=>({title:x.title.slice(0,140),branch:x.branch,text:x.quote}));
  if(!valid.length)throw new Error('The suggestions could not be verified against the original words. Offline suggestions remain available.');
  state.chapterSuggestions=valid;openDialog('organize');toast('Verified on-device suggestions ready for your review.');
}
async function localAIAnswer(){
  const LM=window.LanguageModel;
  if(!LM?.availability||!LM?.create)throw new Error('An on-device language model is not available in this browser. Source-grounded search still works offline.');
  if((await LM.availability())!=='available')throw new Error('This browser does not currently have an on-device model ready. No remote AI service will be used.');
  const sources=state.answerSources.map((x,i)=>`[${i+1}] ${x.memory.title} (${x.label}): ${x.text}`).join('\n');
  const session=await LM.create();
  try{
    state.answer=await session.prompt(`You are helping a family search its private family archive. Use ONLY the quoted evidence below. If there is insufficient evidence, say so. Write up to 140 words, with bracketed source numbers like [1] for factual claims. No inventions.\nQuestion: ${state.answerQuery}\nSources:\n${sources}`);
  }finally{session.destroy?.();}
  render();
}
function readableBook(){
  const d=state.data;
  const lines=[`# ${d.family.name} — Our Story Book`,'',`Exported ${new Date().toLocaleString()}`,'','This readable copy is unencrypted. Keep it private.','', '## People',''];
  for(const p of d.people)lines.push(`### ${p.name}`,`${p.born||'Date unknown'}${p.died?' – '+p.died:''}`,p.bio||'','');
  lines.push('## Family stories','');
  for(const m of d.memories){
    lines.push(`### ${m.title}`,`**Chapter:** ${branchFor(m.branch).name}  `,`**When:** ${m.dateLabel||'Unknown'}  `,`**Where:** ${m.location||'Not recorded'}  `,`**People:** ${(m.personIds||[]).map(personName).join(', ')}`,`**Tags:** ${(m.tags||[]).join(', ')}`,'',m.story||'','');
    for(const a of m.attachments)lines.push(`- Original media: ${a.name} (${a.mime}; ${a.size} bytes; encrypted archive contains the file)`);
    if(m.transcripts.length)for(const [i,t] of m.transcripts.entries())lines.push('',`#### Transcript ${i+1} (${t.language}; ${t.actor})`,'',t.text,'');
    if(m.moments.length)for(const x of m.moments)lines.push(`- [${formatTime(x.start)}${x.end?'–'+formatTime(x.end):''}] ${x.title}: ${x.text||''}`);
    for(const n of m.notes)lines.push('',`> ${n.text} — ${n.actor}, ${n.at}`);
    lines.push('');
  }
  lines.push('## Append-only history','');for(const e of d.events)lines.push(`- ${e.at} · ${e.type} · ${e.actor} · ${e.id}`);
  return lines.join('\n');
}
const parseSeconds=v=>{const parts=String(v).split(':').map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts.length===2?parts[0]*60+parts[1]:parts[0];};
async function persistDraft(){
  if(!state.key)return;
  await saveDraft(state.key,{...state.capture,recordAssets:state.recordAssets,uploadedAssets:state.uploadedAssets,photoAssets:state.photoAssets,recordMode:state.recordMode});
  const hint=document.getElementById('draft-save-hint');if(hint)hint.textContent='✓ Private draft saved on this device';
}
function scheduleDraft(){clearTimeout(state.draftTimer);state.draftTimer=setTimeout(()=>persistDraft().catch(e=>console.warn('Draft save failed',e)),450);}
async function restoreDraft(){
  const draft=await readDraft(state.key);
  if(draft){const {recordAssets,uploadedAssets,photoAssets,recordMode,...content}=draft;state.capture=content;state.recordAssets=recordAssets||[];state.uploadedAssets=uploadedAssets||[];state.photoAssets=photoAssets||[];state.recordMode=recordMode||'audio';}
  else state.capture={branch:'childhood',personIds:[state.selectedPerson],language:'both'};
}
async function handleAction(action,node){
  switch(action){
    case 'toggle-menu':document.querySelector('.sidebar')?.classList.toggle('sidebar-open');break;
    case 'lock':
      if(state.recorder?.state==='recording'||state.recordFinalizing)throw new Error('Stop the recording and let it finish saving before locking your grove.');
      if(state.failedRecording&&!confirm('An unsaved recording will be lost if you lock now. Save the original first. Continue?'))return;
      state.dialog=null;state.key=null;state.data=null;state.setupError='unlock';clearUrls();render();break;
    case 'new-memory':changeView('capture');break;
    case 'new-person':openDialog('person');break;
    case 'edit-person':openDialog('person',{id:state.dialog?.id});break;
    case 'person-tree':state.selectedPerson=state.dialog.id;state.branch='all';changeView('trees');break;
    case 'add-relation':if(state.data.people.length<2)throw new Error('Add at least two people before recording a relationship.');openDialog('relation');break;
    case 'organize-story':{const m=state.data.memories.find(x=>x.id===state.memoryId);state.chapterSuggestions=suggestChapters(m?.story||latestText(m));openDialog('organize');}break;
    case 'ai-organize':await enhanceChaptersWithAI();break;
    case 'edit-memory':openDialog('edit-memory');break;
    case 'add-photo':openDialog('photo');break;
    case 'add-transcript':openDialog('transcript');break;
    case 'add-moment':openDialog('moment');break;
    case 'add-note':openDialog('note');break;
    case 'close-modal':closeDialog();break;
    case 'close-backdrop':closeDialog();break;
    case 'clear-branch':state.branch='all';render();break;
    case 'start-record':await startRecording();break;
    case 'stop-record':stopRecording();break;
    case 'cancel-transcription':state.transcriptionCancel?.();if(state.transcription)state.transcription.status='Stopping local transcription…';break;
    case 'save-memory':await saveMemory();break;
    case 'recover-record':if(state.failedRecording)downloadBlob(state.failedRecording,state.failedRecording.name);break;
    case 'dismiss-failed-record':
      if(state.failedRecording&&confirm('Only continue if you have saved the original recording independently. It was not encrypted or added to this grove. Discard the unsaved in-memory copy?')){state.failedRecording=null;render();}
      break;
    case 'download-record':{const a=state.recordAssets.find(a=>a.id===node.dataset.originalAsset);if(a)downloadBlob(await loadAsset(state.key,a.id,a.mime),a.name);}break;
    case 'dictate-local':await localDictation();break;
    case 'followup':{const q=followupFor((state.capture.story||'')+' '+(state.capture.transcript||''),personName((state.capture.personIds||[])[0]));const current=document.querySelector('.prompt-quote');const hi=document.querySelector('.prompt-box>span');if(current)current.textContent=`“${q}”`;if(hi)hi.textContent='A question suggested from the words you have written, processed on this device.';}break;
    case 'next-prompt':{
      const current=document.querySelector('.prompt-quote');const hi=document.querySelector('.prompt-box>span');
      state.promptIndex=((state.promptIndex??(new Date().getDay()+3))+1)%PROMPTS.length;
      if(current)current.textContent=`“${PROMPTS[state.promptIndex].en}”`;
      if(hi)hi.textContent=PROMPTS[state.promptIndex].hi;
    }break;
    case 'compose-ai':state.aiBusy=true;try{await localAIAnswer();}finally{state.aiBusy=false;}break;
    case 'prepare-backup':{
      const key=state.key;
      await inspectVaultIntegrity(key);
      const archive=await backupVault();
      if(!key || state.key!==key)break;
      const name=safeFilename(state.data.family.name)+'-'+dayStamp()+'.grove';
      const file=new File([JSON.stringify(archive)],name,{type:'application/octet-stream'});
      openDialog('backup-file',{file});
    }break;
    case 'save-backup-file':{
      const file=state.dialog.file;
      downloadBlob(file,file.name);
      toast('Check Downloads for your archive, then keep a copy in your cloud drive.');
    }break;
    case 'share-backup-file':{
      try{await navigator.share({files:[state.dialog.file]});}
      catch(error){if(error.name!=='AbortError')toast('Use Download backup below to save the file.');}
    }break;
    case 'export-vault':{
      await inspectVaultIntegrity(state.key);
      const archive=await backupVault();
      downloadBlob(new Blob([JSON.stringify(archive)],{type:'application/octet-stream'}),`${safeFilename(state.data.family.name)}-${dayStamp()}.grove`);
      toast('Encrypted backup requested. Confirm the file appears in Downloads, then copy it somewhere else.');
    }break;
    case 'export-readable':downloadBlob(new Blob([readableBook()],{type:'text/markdown;charset=utf-8'}),`${safeFilename(state.data.family.name)}-stories-${dayStamp()}.md`);toast('Readable story book downloaded. This copy is not encrypted.');break;
    case 'show-backup':state.view='settings';render();window.scrollTo(0,0);break;
    case 'merge-start':openDialog('merge');break;
    case 'share-start':openDialog('share');break;
    case 'edit-family':openDialog('family');break;
    case 'install-app':if(state.installPrompt){await state.installPrompt.prompt();const choice=await state.installPrompt.userChoice;state.installPrompt=null;toast(choice?.outcome==='accepted'?'Installation accepted. Open Memory Grove from your Home Screen.':'You can install it later from your browser menu.');}else openDialog('install');break;
    case 'show-log':openDialog('log');break;
    case 'restore-start':state.setupError='restore';render();break;
    case 'back-to-onboard':state.setupError='';render();break;
    case 'check-integrity':{
      const status=await inspectVaultIntegrity(state.key);
      toast('✓ Verified '+status.events+' history entries and '+status.assets+' original files ('+fmtSize(status.bytes)+'). This is not an independent backup.');
    }break;
    case 'persist-storage':{
      if(!navigator.storage?.persist)throw new Error('This browser does not support requesting persistent storage. Use frequent encrypted backups.');
      const persisted=await navigator.storage.persist();toast(persisted?'Persistent storage granted. Still keep independent backups.':'Request not granted by the browser. Keep independent backups.');updateUsage();
    }break;
    case 'open-image':openDialog('image',{id:node.dataset.assetId});break;
  }
}
async function onForm(form){
  const f=new FormData(form),v=k=>String(f.get(k)||'').trim();
  switch(form.dataset.form){
    case 'onboard':{
      if(v('passphrase').length<10)throw new Error('Use a passphrase with at least 10 characters.');
      if(v('passphrase')!==v('confirm'))throw new Error('The passphrases do not match.');
      const {key,meta}=await newVault(v('passphrase'));
      const actor=firstName(v('person'));
      const pId=await createFamilyVault(meta,key,v('family'),v('person'),actor);
      state.key=key;state.actor=actor;state.selectedPerson=pId;
      state.setupError='';await reload();await restoreDraft();toast('Your private grove has been planted.');
    }break;
    case 'unlock':{
      state.key=await unlockVault(v('passphrase'),await getMeta());
      state.actor=await getPrivatePreference(state.key,'actor','A family member');state.autoDownload=await getPreference('auto-download',false);state.language=await getPreference('language','both');
      state.setupError='';try{await reload();await restoreDraft();}catch(err){state.key=null;state.setupError='unlock';render();throw err;}
    }break;
    case 'restore':{
      const file=f.get('archive');if(!(file instanceof File)||!file.size)throw new Error('Choose your .grove backup.');
      const result=await restoreArchive(await readArchive(file),v('password'));
      state.key=result.key;state.setupError='';state.actor=await getPrivatePreference(state.key,'actor','A family member');state.autoDownload=false;await reload();await restoreDraft();toast(`Restored ${result.count} history entries and ${result.media} originals.`);
    }break;
    case 'person':{
      const patch={name:v('name'),born:v('born'),died:v('died'),bio:v('bio')};if(!patch.name)throw new Error('Enter a name.');
      if(state.dialog.id)await event('person.revise',{id:state.dialog.id,patch,reason:v('reason')||'Additional family information'});
      else {const id=randomId();await event('person.create',{id,...patch});state.selectedPerson=id;}
      closeDialog();toast('This person’s story has grown.');
    }break;
    case 'relation':{
      if(v('personA')===v('personB'))throw new Error('Choose two different people.');
      if(state.data.relations.some(r=>r.kind===v('kind')&&r.personAId===v('personA')&&r.personBId===v('personB')))throw new Error('This connection has already been recorded.');
      await event('relation.add',{id:randomId(),personAId:v('personA'),personBId:v('personB'),kind:v('kind')});closeDialog();toast('Family connection preserved.');
    }break;
    case 'organize':{
      const original=state.data.memories.find(m=>m.id===state.memoryId);
      const source=original?.story||latestText(original)||'';
      const chapterItems=[];
      for(let i=0;i<state.chapterSuggestions.length;i++){
        if(!f.get(`include-${i}`))continue;
        const title=v(`title-${i}`),branch=v(`branch-${i}`),story=v(`text-${i}`);
        if(!title||!story)throw new Error('Every selected chapter needs a title and its source words.');
        if(!BRANCHES.some(x=>x.id===branch))throw new Error('Select a valid branch.');
        // Chapter text may be an edited memory; its provenance remains linked to source.
        chapterItems.push({type:'memory.create',payload:{id:randomId(),title,personIds:[...(original.personIds||[])],branch,story,dateLabel:original.dateLabel||'',location:original.location||'',tags:original.tags||[],sourceMemoryId:original.id}});
      }
      if(chapterItems.length)await appendEventBatch(state.key,chapterItems,state.actor);
      await reload();closeDialog();toast(`Planted ${chapterItems.length} chapters. The original remains untouched.`);
    }break;
    case 'edit-memory':{
      const patch={title:v('title'),story:v('story'),branch:v('branch'),dateLabel:v('dateLabel')};
      await event('memory.revise',{id:state.memoryId,patch,reason:v('reason')});closeDialog();toast('Correction appended. The original remains in history.');
    }break;
    case 'transcript':await event('memory.transcript',{id:state.memoryId,text:v('text'),language:v('language'),kind:'additional',assetId:v('assetId')||null});closeDialog();toast('Transcript added without replacing earlier versions.');break;
    case 'note':await event('memory.note',{id:state.memoryId,text:v('text')});closeDialog();toast('Family note preserved.');break;
    case 'moment':{
      const start=parseSeconds(v('start')),end=v('end')?parseSeconds(v('end')):undefined;
      if(!Number.isFinite(start)||(end!==undefined&&end<=start))throw new Error('Enter a valid timestamp; the end must follow the start.');
      await event('memory.moment',{id:state.memoryId,assetId:v('assetId'),title:v('title'),text:v('text'),start,end});closeDialog();toast('Timestamp linked to the original recording.');
    }break;
    case 'photo':{
      const files=[...form.querySelector('input[type=file]').files];if(!files.length)throw new Error('Choose an image.');
      for(const file of files){if(!file.type.startsWith('image/'))throw new Error('Choose only image files.');await ensureFileSize(file);const asset=await saveAsset(state.key,file);asset.caption=v('caption');await appendEvent(state.key,'memory.attach',{id:state.memoryId,asset},state.actor);}
      await reload();closeDialog();toast('Original photographs safely added.');
    }break;
    case 'merge':{
      const file=f.get('archive');if(!(file instanceof File)||!file.size)throw new Error('Choose a .grove archive.');
      const result=await mergeArchive(await readArchive(file),v('password'),state.key);await reload();closeDialog();toast(`Added ${result.count} new history entries and ${result.media} original media files.`);
    }break;
    case 'family':await event('family.revise',{patch:{name:v('name'),motto:v('motto')}});closeDialog();toast('Family name updated in the append-only history.');break;
    case 'ask':state.answerQuery=v('question');state.answerSources=sourceHits(state.data,state.answerQuery);state.answer='';render();break;
  }
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state.key&&state.view==='capture')persistDraft().catch(()=>{});});
window.addEventListener('beforeunload',e=>{
  if(state.recorder?.state==='recording'||state.recordFinalizing||state.failedRecording){e.preventDefault();e.returnValue='';}
});
app.addEventListener('submit',async e=>{const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();if(state.busy)return;const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;try{await onForm(form);}catch(err){console.error(err);toast(err.message||'Something went wrong.');}finally{if(submit?.isConnected)submit.disabled=false;}});
app.addEventListener('click',async e=>{
  const navButton=e.target.closest('[data-nav]');if(navButton){changeView(navButton.dataset.nav);return;}
  const detail=e.target.closest('[data-detail]');if(detail){showDetail(detail.dataset.detail);if(detail.dataset.detailStart!==undefined){
    const players=[...document.querySelectorAll('[data-play-id]')];
    const p=players.find(x=>x.dataset.playId===detail.dataset.detailAsset)||players[0];
    if(p){
      const start=Number(detail.dataset.detailStart)||0;
      const end=Number(detail.dataset.detailEnd);
      const seek=()=>{
        p.currentTime=start;
        if(Number.isFinite(end)&&end>start){
          const stop=()=>{if(p.currentTime>=end){p.pause();p.removeEventListener('timeupdate',stop);}};
          p.addEventListener('timeupdate',stop);
        }
        p.play().catch(()=>{});
      };
      if(p.readyState>=1)seek();else p.addEventListener('loadedmetadata',seek,{once:true});
    }
  }return;}
  const person=e.target.closest('[data-person-detail]');if(person){openDialog('person-detail',{id:person.dataset.personDetail});return;}
  const tm=e.target.closest('[data-person-timeline]');if(tm){state.selectedPerson=tm.dataset.personTimeline;render();return;}
  const tree=e.target.closest('[data-person-tree]');if(tree){state.selectedPerson=tree.dataset.personTree;state.branch='all';render();return;}
  const branch=e.target.closest('[data-branch-tree]');if(branch){state.branch=branch.dataset.branchTree;render();document.querySelector('.tree-stories')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const mode=e.target.closest('[data-mode]');if(mode){if(state.recorder?.state==='recording')return;state.recordMode=mode.dataset.mode;render();return;}
  const question=e.target.closest('[data-question]');if(question){state.answerQuery=question.dataset.question;state.answerSources=sourceHits(state.data,state.answerQuery);state.answer='';render();return;}
  const dl=e.target.closest('[data-download-asset]');if(dl){try{const id=dl.dataset.downloadAsset;let media;for(const m of state.data.memories)media=m.attachments.find(a=>a.id===id)||media;for(const p of state.data.people)if(p.portrait?.id===id)media=p.portrait;const blob=await loadAsset(state.key,id,media?.mime);downloadBlob(blob,media?.name||'Memory-Grove-original');}catch(err){toast(err.message);}return;}
  const seek=e.target.closest('[data-seek]');if(seek){const player=[...document.querySelectorAll('[data-play-id]')].find(el=>el.dataset.playId===seek.dataset.seek);if(player){player.currentTime=Number(seek.dataset.time)||0;player.play().catch(()=>{});player.scrollIntoView({behavior:'smooth',block:'center'});}return;}
  const action=e.target.closest('[data-action]');if(!action)return;
  if(action.dataset.action==='close-backdrop'&&e.target!==action)return;
  try{await handleAction(action.dataset.action,action);}catch(err){console.error(err);toast(err.message||'Unable to complete that action.');}
});
app.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.draft){state.capture[el.dataset.draft]=el.value;scheduleDraft();}
  if(el.dataset.photoCaption){const photo=state.photoAssets.find(a=>a.id===el.dataset.photoCaption);if(photo){photo.caption=el.value;scheduleDraft();}}
  if(el.id==='archive-search'){
    state.search=el.value;const results=searchMemories(state.data.memories,state.search,state.data.people,state.branch,state.personFilter);
    const cards=document.getElementById('archive-cards'),count=document.getElementById('archive-count');
    if(cards){cards.innerHTML=results.length?results.map(memoryCard).join(''):empty('Nothing matches yet','Try a different search.',viewButton('capture','Add a story','btn btn-outline'));hydrateAssets();}
    if(count)count.textContent=`${results.length} ${results.length===1?'memory':'memories'} in your collection`;
  }
});
app.addEventListener('change',async e=>{
  const el=e.target;
  try{
    if(el.name==='personIds'&&state.view==='capture'){
      const selected=new Set(state.capture.personIds||[]);if(el.checked)selected.add(el.value);else selected.delete(el.value);state.capture.personIds=[...selected];scheduleDraft();
    }
    if(el.id==='upload-photos'){state.photoFiles=[...el.files].filter(x=>x.type.startsWith('image/'));for(const file of state.photoFiles){await ensureFileSize(file);state.photoAssets.push(await saveAsset(state.key,file));}await persistDraft();render();}
    if(el.id==='upload-media'){
      const files=[...el.files];
      for(const file of files){
        if(!file.type.startsWith('audio/')&&!file.type.startsWith('video/'))throw new Error('Choose audio or video files.');
        await ensureFileSize(file);
        const asset=await saveAsset(state.key,file);
        state.uploadedAssets.push(asset);
        await persistDraft();render();
        if(state.autoTranscribe)await transcribeImportedOriginal(file,asset);
      }
    }
    if(el.id==='portrait-upload'){
      const file=el.files?.[0];if(!file)return;
      if(!file.type.startsWith('image/'))throw new Error('Choose an image for the portrait.');
      await ensureFileSize(file);const asset=await saveAsset(state.key,file);
      const personId=state.dialog?.id;if(!personId)throw new Error('Select a person first.');
      await event('person.photo',{personId,asset});closeDialog();toast('Portrait preserved in the family archive.');
    }
    if(el.id==='auto-transcribe'){state.autoTranscribe=el.checked;toast(state.autoTranscribe?'Private transcription enabled for future uploads.':'Automatic transcription disabled.');}
    if(el.id==='auto-download'){state.autoDownload=el.checked;await setPreference('auto-download',state.autoDownload);toast(`Automatic original downloads ${state.autoDownload?'enabled':'disabled'}.`);}
    if(el.id==='prompt-language'){state.language=el.value;await setPreference('language',el.value);toast('Prompt language saved.');}
    if(el.id==='actor-name'){state.actor=el.value.trim()||'A family member';await setPrivatePreference(state.key,'actor',state.actor);toast('Contributor name saved.');}
    if(el.id==='branch-filter'){state.branch=el.value;render();}
    if(el.id==='person-filter'){state.personFilter=el.value;render();}
  }catch(err){console.error(err);toast(err.message||'Unable to read that file.');}
});

function restorePage(){return `<div class="entry-page"><div class="unlock-card"><button class="text-action back-link" data-action="back-to-onboard">← Create a new grove instead</button><div class="unlock-symbol">❧</div><div class="eyebrow">RESTORE YOUR HISTORY</div><h1>Bring your grove <em>home.</em></h1><p>Your memories return as they were, with all encrypted originals and every contribution.</p><form data-form="restore" class="form-stack"><label>Encrypted archive (.grove)<input name="archive" type="file" accept=".grove,application/json" required></label><label>Archive passphrase<input name="password" type="password" required></label><button class="btn btn-primary wide">Restore my family stories →</button></form></div></div>`;}
// Entry restore is a separate route because the vault has not yet been unlocked.
// render() delegates here before its regular on-boarding template.
async function boot(){
  try{
    await database();
    if(await hasVault())state.setupError='unlock';
    const stored=await getPreference('auto-download',false);state.autoDownload=stored;
    if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline install unavailable:',err));
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;});
    render();
  }catch(err){app.innerHTML=`<div class="fatal"><h1>Memory Grove could not open</h1><p>${E(err.message)}</p><p>Use a modern browser with IndexedDB and Web Crypto, preferably over HTTPS.</p></div>`;}
}
boot();
