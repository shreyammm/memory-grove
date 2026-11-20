import test from 'node:test';
import assert from 'node:assert/strict';
import {treeArt,miniPlant,ornaments} from '../art.js';
test('Every Indian-miniature decoration renders without a missing helper',()=>{
  assert.match(treeArt(),/grove-miniature\.svg/);
  assert.match(treeArt({compact:true}),/tree-compact/);
  assert.match(miniPlant(),/<svg[\s\S]*<\/svg>/);
  assert.match(miniPlant(),/<ellipse/);
  assert.match(ornaments,/<svg/);
});
