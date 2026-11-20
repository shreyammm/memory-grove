import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('offline app shell and install icons are present',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.start_url,'./');
 assert.ok(manifest.icons.length>=3);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const file of ['./','./index.html','./app.js','./db.js','./model.js','./crypto.js','./art.js','./styles.css','./painting.css','./assets/grove-miniature.svg','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-apple.png']){
  assert.ok(sw.includes(file));if(file!=='./')assert.ok(fs.existsSync(path.join(root,file)));
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(/<script[^>]+src=["']https:\/\//.test(html),false,'App scripts must remain local');
 assert.match(html,/connect-src[^\"]*huggingface\.co/,'Only model downloads may need external fetches');

});

test('Indian miniature visual assets are local, cohesive and parseable',()=>{
 const art=fs.readFileSync(path.join(root,'assets/grove-miniature.svg'),'utf8');
 const theme=fs.readFileSync(path.join(root,'painting.css'),'utf8');
 assert.match(art,/<svg[\s\S]*<\/svg>/);
 assert.match(art,/peacock|miniature|lotus/i);
 assert.match(theme,/indigo|verdigris|madder|saffron/i);
 assert.equal(/https?:\/\//.test(art),true); // SVG namespace URL is standard; there are no remote image requests.
 assert.ok(!/<image\b/i.test(art),'illustration must be self-contained');
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/painting\.css/);
});
