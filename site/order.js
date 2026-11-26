const collator=new Intl.Collator('pt-BR',{sensitivity:'base',numeric:true});
export function orderItems(items,mode){
 return Object.entries(items).sort((a,b)=>{
  if(mode==='alphabetical'||mode==='category'){const comparison=collator.compare(a[1].name,b[1].name);if(comparison)return comparison;}
  return a[1].createdAt-b[1].createdAt||a[0].localeCompare(b[0]);
 });
}
