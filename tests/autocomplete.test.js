import test from 'node:test';
import assert from 'node:assert/strict';
import {productSuggestions} from '../site/autocomplete.js';
test('sugere produtos com acentos e prioriza dados mais recentes do histórico',()=>{
 const history={a:{name:'feijão',quantity:'1 kg',duration:'2 semanas',category:'alimentos',at:1},b:{name:'feijão',quantity:'2 kg',duration:'1 mês',category:'alimentos',at:2}};
 const found=productSuggestions('feij',history);assert.equal(found[0].name,'feijão');assert.equal(found[0].quantity,'2 kg');assert.equal(found[0].duration,'1 mês');assert.equal(found.filter(i=>i.name==='feijão').length,1);
 assert.equal(productSuggestions('banana')[0].name,'banana');assert.deepEqual(productSuggestions(''),[]);
});
