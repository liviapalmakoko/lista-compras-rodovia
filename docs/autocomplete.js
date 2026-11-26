import {categories,normalize} from './categories.js';
export function productSuggestions(query,history={},items={}){
 const needle=normalize(query);if(!needle)return [];
 const known=new Map();
 const recent=[...Object.values(history),...Object.values(items).map(item=>({...item,at:item.purchasedAt||item.createdAt||0}))].sort((a,b)=>(b.at||0)-(a.at||0));
 for(const item of recent){const key=normalize(item.name||'');if(key&&!known.has(key))known.set(key,{name:item.name,brand:item.brand||'',size:item.size||'',quantity:item.quantity||'',duration:item.duration||'',category:item.category,fromHistory:true});}
 for(const category of categories)for(const name of category.words.split(',').filter(Boolean)){const key=normalize(name);if(!known.has(key))known.set(key,{name,category:category.id,fromHistory:false});}
 return [...known.values()].filter(item=>normalize(item.name).includes(needle)).sort((a,b)=>Number(normalize(b.name).startsWith(needle))-Number(normalize(a.name).startsWith(needle))||Number(b.fromHistory)-Number(a.fromHistory)).slice(0,8);
}
