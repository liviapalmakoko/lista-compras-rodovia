export const categories = [
  {id:'hortifruti',color:'#75df65',number:'01',name:'Hortifruti',icon:'🥬',words:'banana,maçã,maca,laranja,limão,limao,tomate,batata,cebola,alho,alface,cenoura,abobrinha,abóbora,abobora,brócolis,brocolis,couve,repolho,pepino,berinjela,morango,uva,mamão,mamao,melancia,melão,melao,manga,abacaxi,abacate,pera,pêra,kiwi,maracujá,maracuja,beterraba,mandioca,aipim,inhame,batata doce,cheiro verde,salsinha,cebolinha,gengibre,pimentão,pimentao,rúcula,rucula,espinafre,milho verde'},
  {id:'limpeza',color:'#67adff',number:'02',name:'Limpeza',icon:'🧽',words:'detergente,sabão,sabao,sabonete para roupa,amaciante,água sanitária,agua sanitaria,desinfetante,alvejante,esponja,multiuso,limpa vidro,limpa vidros,saco de lixo,sacos de lixo,lava louças,lava loucas,saponáceo,saponaceo,álcool,alcool,pano de chão,pano de chao,papel toalha'},
  {id:'higiene',color:'#ff8dcc',number:'03',name:'Higiene',icon:'🫧',words:'sabonete,shampoo,xampu,condicionador,creme dental,pasta de dente,escova de dente,fio dental,desodorante,papel higiênico,papel higienico,absorvente,fralda,cotonete,algodão,algodao,protetor solar'},
  {id:'bebidas',color:'#ffae4d',number:'04',name:'Bebidas',icon:'🧃',words:'água,agua,água de coco,agua de coco,suco,refrigerante,cerveja,vinho,espumante,chá,cha,café,cafe,energético,energetico,isotônico,isotonico,kombucha'},
  {id:'frios',color:'#c1a0f7',number:'05',name:'Frios e laticínios',icon:'🧀',words:'leite,iogurte,queijo,manteiga,requeijão,requeijao,creme de leite,leite condensado,presunto,peito de peru,mortadela,ricota,muçarela,mussarela,coalhada'},
  {id:'proteinas',color:'#ff827b',number:'06',name:'Carnes e ovos',icon:'🥚',words:'ovo,ovos,frango,carne,bife,patinho,acém,acem,alcatra,costela,peixe,salmão,salmao,tilápia,tilapia,camarão,camarao,bacon,linguiça,linguica,salsicha,porco,filé,file'},
  {id:'alimentos',color:'#f5d958',number:'07',name:'Alimentos',icon:'🍚',words:'arroz,feijão,feijao,macarrão,macarrao,massa,farinha,açúcar,acucar,sal,azeite,óleo,oleo,aveia,pão,pao,biscoito,bolacha,granola,molho de tomate,extrato de tomate,molho,ketchup,mostarda,maionese,vinagre,tempero,orégano,oregano,pimenta,canela,fermento,achocolatado,chocolate,geleia,mel,amendoim,castanha,lentilha,grão de bico,grao de bico,ervilha,milho,atum,sardinha,tapioca,cuscuz'},
  {id:'congelados',color:'#80dce7',number:'08',name:'Congelados',icon:'🧊',words:'sorvete,picolé,picole,pizza congelada,lasanha congelada,nuggets,batata congelada,polpa de fruta'},
  {id:'pet',color:'#d4b28d',number:'09',name:'Pet',icon:'🐾',words:'ração,racao,petisco para cachorro,petisco para gato,areia para gato,tapete higiênico,tapete higienico'},
  {id:'casa',color:'#b9d876',number:'10',name:'Casa e utilidades',icon:'🏠',words:'papel alumínio,papel aluminio,filme plástico,filme plastico,fósforo,fosforo,isqueiro,pilha,lâmpada,lampada,vela,guardanapo,copo descartável,copo descartavel,prato descartável,prato descartavel,filtro de café,filtro de cafe'},
  {id:'outros',color:'#ced1da',number:'11',name:'Outros',icon:'🧺',words:''}
];
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function classify(name){
 const text = ` ${normalize(name)} `;
 // Frases específicas prevalecem: "água sanitária" não vira bebida.
 let best = {id:'outros',color:'#ced1da',number:'11',score:0};
 for(const category of categories) for(const word of category.words.split(',').filter(Boolean)) {
  const key=normalize(word);
  if((text.includes(` ${key} `)||text.includes(` ${key}s `))&&key.length>best.score) best={id:category.id,score:key.length};
 }
 return best.id;
}
