import test from 'node:test';
import assert from 'node:assert/strict';
import {classify} from '../site/categories.js';
test('produtos e frases específicas seguem para o setor correto',()=>{
 for(const [name,expected] of Object.entries({'banana':'hortifruti','maçãs':'hortifruti','BATATA DOCE':'hortifruti','detergente':'limpeza','água sanitária':'limpeza','sabão em pó':'limpeza','sabonete':'higiene','papel higiênico':'higiene','água com gás':'bebidas','café':'bebidas','creme de leite':'frios','ovos':'proteinas','arroz integral':'alimentos','sal':'alimentos','salmão':'proteinas','molho de tomate':'alimentos','pizza congelada':'congelados','caneta':'outros'}))assert.equal(classify(name),expected,name);
});
