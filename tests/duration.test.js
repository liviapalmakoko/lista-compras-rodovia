import test from 'node:test';
import assert from 'node:assert/strict';
import {durationDays} from '../site/duration.js';
import {suggestions,DAY} from '../site/history.js';
test('entende prazos opcionais em português',()=>{assert.equal(durationDays('um mês'),30);assert.equal(durationDays('2 semanas'),14);assert.equal(durationDays('15 dias'),15);assert.equal(durationDays(''),null);assert.equal(durationDays('não sei'),null);});
test('prazo é contado a partir da compra e não exige repetição',()=>{
 const now=Date.now(),history={a:{name:'feijão',quantity:'2 kg',duration:'1 mês',kind:'bought',at:now-28*DAY,category:'alimentos'}};
 const result=suggestions(history,{},now);assert.equal(result[0].nextAt,now+2*DAY);assert.equal(result[0].source,'prazo informado');
 assert.equal(suggestions(history,{a:{name:'feijão',done:false}},now).length,0);
});
