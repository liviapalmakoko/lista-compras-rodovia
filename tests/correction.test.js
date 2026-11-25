import test from 'node:test';
import assert from 'node:assert/strict';
import {correctProduct} from '../site/correction.js';
import {classify} from '../site/categories.js';
test('corrige erros comuns, acentos e letras trocadas',()=>{
 for(const [input,expected] of Object.entries({'arros':'arroz','feijao':'feijão','detegente':'detergente','bananna':'banana','iogute':'iogurte','papel igienico':'papel higiênico','agua saniteria':'água sanitária','macarao':'macarrão','asucar':'açúcar','desodoramte':'desodorante','tomtae':'tomate','racao':'ração'}))assert.equal(correctProduct(input).text,expected,input);
});
test('preserva marcas, números, unidades e palavras curtas desconhecidas',()=>{
 for(const input of ['Coca-Cola 2 L','OMO 1 kg','Ypê','3M','sal','mel','kit','pato','100 g','produto especial XYZ'])assert.equal(correctProduct(input).text,input,input);
 assert.equal(correctProduct('detegente Ypê 500 ml').text,'detergente Ypê 500 ml');
});
test('classificação usa nome corrigido e reconhece outros setores',()=>{
 assert.equal(classify(correctProduct('agua saniteria').text),'limpeza');
 assert.equal(classify(correctProduct('racao').text),'pet');
 assert.equal(classify('filtro de café'),'casa');
});
