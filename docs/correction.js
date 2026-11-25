import {categories,normalize} from './categories.js';
// Dicionário local: não envia o texto para serviços externos.
const preferred = new Map();
for(const category of categories)for(const word of category.words.split(',').filter(Boolean)){
 const key=normalize(word);if(!preferred.has(key))preferred.set(key,word);
}
// Erros frequentes ou maiores do que o limite conservador de aproximação.
const aliases = new Map(Object.entries({
 'arros':'arroz','aroz':'arroz','aroroz':'arroz','feijao':'feijão','feijam':'feijão',
 'detegente':'detergente','deterjente':'detergente','detergemte':'detergente',
 'saboneti':'sabonete','sabonete liquido':'sabonete líquido','sabanete':'sabonete',
 'shampu':'shampoo','xampu':'shampoo','iogute':'iogurte','yogurte':'iogurte',
 'papel higienico':'papel higiênico','papel igienico':'papel higiênico',
 'agua sanitaria':'água sanitária','agua saniteria':'água sanitária',
 'requeijao':'requeijão','requejam':'requeijão','mussarela':'muçarela',
 'macarao':'macarrão','macarrao':'macarrão','macarão':'macarrão',
 'acucar':'açúcar','asucar':'açúcar','assucar':'açúcar','leiti':'leite',
 'desodoramte':'desodorante','desodorente':'desodorante','amasiamte':'amaciante',
 'bolaxa':'bolacha','bolacha':'bolacha','cerveija':'cerveja','cervaja':'cerveja'
}).map(([key,value])=>[normalize(key),value]));
const dictionary=[...preferred.entries()];
export function distance(a,b){
 const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)d[i][0]=i;
 for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
 }
 return d[a.length][b.length];
}
function replacement(raw){
 const key=normalize(raw);
 if(aliases.has(key))return aliases.get(key);
 if(preferred.has(key))return preferred.get(key);
 // Palavras curtas e nomes desconhecidos não são corrigidos por aproximação.
 if(key.length<5)return null;
 const limit=key.length>=9?2:1;
 let score=limit+1,candidates=[];
 for(const [candidate,label] of dictionary){
  if(candidate.split(' ').length!==key.split(' ').length||Math.abs(candidate.length-key.length)>limit)continue;
  const diff=distance(key,candidate);
  if(diff<score){score=diff;candidates=[label];}else if(diff===score)candidates.push(label);
 }
 return score<=limit&&new Set(candidates).size===1?candidates[0]:null;
}
export function correctProduct(input){
 // Substitui só sequências de palavras: preserva marcas, números e unidades.
 const text=input.trim().replace(/[\p{L}]+(?:[ \t]+[\p{L}]+)*/gu,phrase=>{
  const words=phrase.split(/[ \t]+/);const output=[];
  for(let i=0;i<words.length;){
   let found=null,size=0;
   for(let n=Math.min(4,words.length-i);n>=1;n--){
    const value=replacement(words.slice(i,i+n).join(' '));
    if(value){found=value;size=n;break;}
   }
   output.push(found??words[i]);i+=size||1;
  }
  return output.join(' ');
 });
 return {text,changed:text!==input.trim()};
}
