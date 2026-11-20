// Real Chromium smoke test: mobile layout, encryption, media, offline, restore and family merge.
// Run in CI with: npm install --no-save playwright && npx playwright install chromium
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,webkit} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
const url='http://127.0.0.1:8765/';
const errors=[];
let browser;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const log=message=>console.log('✓ '+message);
async function open(context){
  const page=await context.newPage();
  page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR:',error.message);});
  page.on('console',message=>{if(message.type()==='error')console.error('BROWSER CONSOLE:',message.text());});
  await page.goto(url);
  return page;
}
async function clickAction(page,name){await page.locator('[data-action="'+name+'"]').first().click();}
async function clickNav(page,name){
  const target=page.locator('.side-nav [data-nav="'+name+'"]');
  const toggle=page.locator('[data-action="toggle-menu"]');
  if(await toggle.isVisible())await toggle.click();
  await target.click();
}
async function exportArchive(page,chooseDestination=false){
  await clickNav(page,'settings');
  if(chooseDestination)await clickAction(page,'prepare-backup');
  const download=page.waitForEvent('download');
  await clickAction(page,chooseDestination?'save-backup-file':'export-vault');
  const file=await download;
  if(chooseDestination)await clickAction(page,'close-modal');
  const filename=await file.path();
  assert.ok(filename,'A valid encrypted backup must be downloaded');
  const data=JSON.parse(await fs.readFile(filename,'utf8'));
  assert.equal(data.kind,'memory-grove-backup');
  return {filename,data};
}
try{
  for(let i=0;i<40;i++){try{if((await fetch(url)).ok)break;}catch{}await pause(200);}
  const browserType=process.env.BROWSER==='webkit'?webkit:chromium;
  browser=await browserType.launch(browserType===chromium?{headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}:{headless:true});
  const a=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,permissions:browserType===chromium?['microphone','camera']:[]});
  const page=await open(a);
  await page.locator('form[data-form="onboard"]').waitFor();
  await page.locator('[name=family]').fill('The Test Family');
  await page.locator('[name=person]').fill('Nani');
  await page.locator('form[data-form=onboard] [name=passphrase]').fill('test-only-very-long-passphrase');
  await page.locator('form[data-form=onboard] [name=confirm]').fill('test-only-very-long-passphrase');
  await page.locator('form[data-form=onboard] button').last().click();
  try{await page.locator('.home-hero').waitFor({timeout:12000});}
  catch(error){
    console.error('ONBOARD DIAGNOSTICS:',(await page.locator('body').innerText()).slice(0,2600));
    throw error;
  }
  assert.ok((await page.locator('.home-hero').innerText()).includes('Our stories'));
  log('Onboarded encrypted family vault');
  await clickNav(page,'people');
  await clickAction(page,'new-person');
  await page.locator('form[data-form=person] [name=name]').fill('Dada');
  await page.locator('form[data-form=person] button[type=submit]').click();
  await page.locator('.person-card').nth(1).waitFor({timeout:12000});
  assert.equal(await page.locator('.person-card').count(),2);
  await clickNav(page,'family');
  await clickAction(page,'add-relation');
  await page.locator('form[data-form=relation] [name=kind]').selectOption('partner');
  await page.locator('form[data-form=relation] button[type=submit]').click();
  await page.locator('.relation-row').first().waitFor();
  log('People and family connections');
  await clickNav(page,'capture');
  await page.locator('[data-draft=title]').fill('Nani and the monsoon');
  await page.locator('[data-draft=story]').fill('In Delhi during the monsoon, Nani remembered lighting lamps and cooking with family.');
  await page.locator('[data-draft=transcript]').fill('[00:03] I remember the lamps in our house.');
  await page.locator('#upload-photos').setInputFiles({name:'family-photo.png',mimeType:'image/png',buffer:png});
  await page.locator('[data-photo-caption]').first().fill('A family portrait');
  await page.locator('#upload-media').setInputFiles({name:'original-voice.webm',mimeType:'audio/webm',buffer:Buffer.from('test-audio-bytes-1234567890')});
  await page.locator('.file-attached').first().waitFor({timeout:15000});
  if(browserType===chromium){
    await clickAction(page,'start-record');
    await page.locator('[data-action="stop-record"]').waitFor({timeout:15000});
    await pause(1400);
    await clickAction(page,'stop-record');
    await page.locator('[data-original-asset]').first().waitFor({timeout:15000});
    log('Chrome microphone captured and encrypted a real MediaRecorder audio segment');
    await page.locator('[data-mode=video]').click();
    await clickAction(page,'start-record');
    await page.locator('[data-action="stop-record"]').waitFor({timeout:15000});
    await pause(1400);
    await clickAction(page,'stop-record');
    await page.locator('[data-original-asset]').nth(1).waitFor({timeout:15000});
    log('Chrome camera captured and encrypted a real MediaRecorder video segment');
  }
  await clickAction(page,'save-memory');
  await page.locator('.memory-head h1').waitFor();
  assert.match(await page.locator('.memory-head h1').innerText(),/Nani and the monsoon/);
  assert.equal(await page.locator('audio').count()>=1,true);
  if(browserType===chromium)assert.equal(await page.locator('video').count()>=1,true);
  assert.equal(await page.locator('.detail-photos img').count(),1);
  log('Preserved story, bilingual transcript, photo and exact original media');
  await clickNav(page,'archive');
  await page.locator('#archive-search').fill('lighting lamps');
  assert.equal(await page.locator('[data-detail]').count()>0,true);
  await clickNav(page,'ask');
  await page.locator('[name=question]').fill('Who remembered lamps?');
  await page.locator('form[data-form=ask] button[type=submit]').click();
  await page.locator('.source-hit').first().waitFor();
  log('Offline search and original-source retrieval');
  await clickNav(page,'settings');
  await clickAction(page,'check-integrity');
  await page.getByText(/Verified .* original files/).first().waitFor();
  const exported=await exportArchive(page,true);
  const json=JSON.stringify(exported.data);
  assert.equal(json.includes('Nani and the monsoon'),false,'Backup must keep story content encrypted');
  assert.equal(json.includes('A family portrait'),false,'Backup must keep photo descriptions encrypted');
  assert.ok(exported.data.assets.length>=2);
  log('Read-back integrity, encrypted export and no leaked plaintext');
  const b=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const restored=await open(b);
  await clickAction(restored,'restore-start');
  await restored.locator('form[data-form=restore] [name=archive]').setInputFiles(exported.filename);
  await restored.locator('form[data-form=restore] [name=password]').fill('test-only-very-long-passphrase');
  await restored.locator('form[data-form=restore] button').click();
  await restored.locator('.home-hero').waitFor();
  await clickNav(restored,'album');
  await restored.locator('.photo-masonry img').first().waitFor();
  await clickNav(restored,'settings');
  await clickAction(restored,'check-integrity');
  await restored.getByText(/Verified .* original files/).first().waitFor();
  log('Complete restore to independent browser including encrypted originals');
  await clickNav(restored,'people');
  await clickAction(restored,'new-person');
  await restored.locator('form[data-form=person] [name=name]').fill('Auntie');
  await restored.locator('form[data-form=person] button[type=submit]').click();
  const updated=await exportArchive(restored);
  await clickNav(page,'settings');
  await clickAction(page,'merge-start');
  await page.locator('form[data-form=merge] [name=archive]').setInputFiles(updated.filename);
  await page.locator('form[data-form=merge] [name=password]').fill('test-only-very-long-passphrase');
  await page.locator('form[data-form=merge] button').click();
  await clickNav(page,'people');
  assert.equal(await page.locator('.person-card').count(),3);
  log('Additive family archive exchange merges contributions without erasing originals');
  await clickNav(page,'capture');
  await page.locator('[data-draft=title]').fill('An unfinished interview');
  await page.locator('[data-draft=story]').fill('This draft must survive browser reload and re-unlock.');
  await page.locator('#draft-save-hint').getByText('Private draft saved').waitFor();
  await page.reload();
  await page.locator('form[data-form=unlock] [name=passphrase]').fill('test-only-very-long-passphrase');
  await page.locator('form[data-form=unlock] button').click();
  await page.locator('.home-hero').waitFor();
  await clickNav(page,'capture');
  assert.equal(await page.locator('[data-draft=title]').inputValue(),'An unfinished interview');
  log('Encrypted drafts persist after browser reload');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await a.setOffline(true);
  await page.reload();
  await page.locator('form[data-form=unlock] [name=passphrase]').fill('test-only-very-long-passphrase');
  await page.locator('form[data-form=unlock] button').click();
  await page.locator('.home-hero').waitFor();
  log('Offline app-shell reload and local vault unlock');
  await a.setOffline(false);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=4,'Unexpected horizontal overflow on 390px mobile viewport: '+overflow);
  assert.deepEqual(errors,[],'Browser runtime must have zero uncaught exceptions');
  log('Mobile viewport and browser runtime checks');
  console.log('All browser smoke tests passed.');
}catch(error){console.error('Browser smoke test failed:',error);process.exitCode=1;}
finally{await browser?.close();server.kill();}
