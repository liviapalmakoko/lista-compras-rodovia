import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestions,DAY} from '../site/history.js';
const at=Date.UTC(2026,10,25,12),event=(days,kind='bought',name='café')=>({name,category:'bebidas',quantity:'500 g',kind,at:at-days*DAY});
test('aprende intervalo e sugere perto da compra; não duplica pendentes',()=>{
 const history={a:event(30),b:event(16),c:event(2)};
 assert.equal(suggestions(history,{},at).length,0);
 const predicted=suggestions(history,{},at+10*DAY);
 assert.equal(predicted[0].days,14);assert.equal(predicted[0].nextAt,at+12*DAY);assert.equal(predicted[0].initial,false);
 assert.equal(suggestions(history,{p:{name:'cafe',done:false}},at+12*DAY).length,0);
});
test('não inventa previsão sem repetição; estima por inclusões quando necessário',()=>{
 assert.equal(suggestions({a:event(2)}, {},at).length,0);
 const result=suggestions({a:event(15,'added'),b:event(8,'added')},{},at);
 assert.equal(result[0].days,7);assert.equal(result[0].source,'inclusões');assert.equal(result[0].initial,true);
});
test('ignora marcações repetidas no mesmo dia e datas futuras',()=>{
 const history={a:event(14),b:event(0),c:{...event(0),at:at+1000},d:{...event(0),at:at-1000}};
 assert.equal(suggestions(history,{},at+12*DAY)[0].days,14);
});
