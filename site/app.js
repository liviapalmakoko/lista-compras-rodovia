import {productSuggestions} from './autocomplete.js';
import {listTotals} from './totals.js';
import {findOffer,historyPrice,marketName} from './prices.js';
import {purchaseStats} from './stats.js';
import {suggestions,productKey,DAY} from './history.js';
import {splitSpokenItems,speechSupported,createRecognition} from './voice.js?v=soma-1';
import {categoryIcon} from './icons.js';
import {orderItems} from './order.js';
import {categories,classify} from './categories.js';
import {correctProduct} from './correction.js';
import {firebaseConfig,sharedConfig} from './config.js?v=compartilhada-1';
import {createSharedClient,readLocalSnapshot} from './shared.js';
const $=id=>document.getElementById(id);
let offers=[],priceLookupReady=false,shoppingSession=null,paidId=null;
try{shoppingSession=JSON.parse(localStorage.getItem('market-session')||'null');}catch{}
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
let lastCorrection=null;
let history={},historyReady=false;
let items={},filter='pending',editId=null,cloud=null,connected=false,ready=false,busy=false,unsub=[];
const configured=Object.values(firebaseConfig).some(Boolean);
const storageKey='nossa-feira-local-v1';
let order='category';try{const stored=localStorage.getItem('mercado-order');if(['category','added','alphabetical'].includes(stored))order=stored;}catch{}
function updateOrderButtons(){document.querySelectorAll('[data-order]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.order===order)));}
updateOrderButtons();
for(const button of document.querySelectorAll('[data-order]'))button.onclick=()=>{order=button.dataset.order;try{localStorage.setItem('mercado-order',order);}catch{}updateOrderButtons();render();};
function message(text=''){$('message').textContent=text;$('message').hidden=!text;}
function status(text){$('status').textContent=text;}
function option(value,text){const el=document.createElement('option');el.value=value;el.textContent=text;return el;}
for(const c of categories){$('category').append(option(c.id,c.name));$('edit-category').append(option(c.id,c.name));}
function render(){
 renderTotals();
 const entries=orderItems(items,order);
 const done=entries.filter(([,i])=>i.done).length;
 $('counter').textContent=`${entries.length} ${entries.length===1?'item':'itens'}`;
 $('remaining').textContent=`· ${entries.length-done} para comprar`;
 $('progress-label').textContent=entries.length?`${done} de ${entries.length} ${entries.length===1?'item comprado':'itens comprados'}`:'Nenhum item por enquanto';
 $('progress').max=Math.max(entries.length,1);$('progress').value=done;
 $('clear').disabled=!done||busy||!ready;
 $('list').replaceChildren();let visible=0;
 for(const category of (order==='category'?categories:[null])){
  const group=entries.filter(([,i])=>(!category||i.category===category.id)&&(filter==='all'||(filter==='done'?i.done:!i.done)));
  if(!group.length)continue;visible+=group.length;
  const section=document.createElement('section');section.className='group';if(category){section.dataset.category=category.id;section.style.setProperty('--category-color',category.color);}
  if(category){const heading=document.createElement('h3');heading.className='group-title';const badge=document.createElement('span');badge.className='category-badge';badge.append(categoryIcon(category.id));badge.setAttribute('aria-hidden','true');const title=document.createElement('span');title.textContent=category.name;heading.append(badge,title);
  const count=document.createElement('span');count.className='count';count.textContent=`${group.length} ${group.length===1?'item':'itens'}`;heading.append(count);section.append(heading);}
  for(const [id,item] of group){
   const row=document.createElement('div');row.className=`item${item.done?' done':''}`;
   const check=document.createElement('input');check.type='checkbox';check.checked=item.done;check.disabled=busy||!ready;check.setAttribute('aria-label',`${item.done?'Desmarcar':'Marcar como comprado'}: ${item.name}`);
   check.onchange=()=>{const checked=check.checked;mutate(async()=>{await save(id,{done:checked,purchasedAt:checked?Date.now():null,actualPaid:null,purchaseMarket:checked?(shoppingSession?.market||null):null,purchaseOther:checked?(shoppingSession?.other||null):null});if(checked)openPaid(id);},()=>{check.checked=item.done;});};
   const text=document.createElement('div');text.className='item-text';
   const name=document.createElement('span');name.className='item-name';name.textContent=item.name;text.append(name);
   if(item.brand){const brand=document.createElement('span');brand.className='item-brand';brand.textContent=item.brand;text.append(brand);}
   if(item.quantity){const qty=document.createElement('span');qty.className='item-quantity';qty.textContent=item.quantity;text.append(qty);}
   if(item.duration){const duration=document.createElement('span');duration.className='item-quantity';duration.textContent=`dura ${item.duration}`;text.append(duration);}
   if(!item.done){
    const estimate=document.createElement('span');estimate.className='price-estimate';
    const session=location.hash==='#mercado'?shoppingSession:null;const offer=findOffer(item.name,session?offers.filter(o=>o.market===session.market):offers,Date.now(),item.brand),past=historyPrice(item.name,history,session,item.brand);
    if(offer){estimate.textContent=`${offer.exact?'≈':'A partir de'} ${money(offer.price)} · ${offer.marketName}`;const detail=document.createElement('a');detail.href=offer.source;detail.target='_blank';detail.rel='noopener noreferrer';detail.className='price-source';detail.textContent=`${offer.name}${offer.condition?' · '+offer.condition:''} · ver oferta`;detail.title='Oferta publicada no Savelly para a unidade do Méier; confirme embalagem, validade e condição.';text.append(estimate,detail);}
    else if(past){estimate.textContent=`Último total${past.quantity?' ('+past.quantity+')':''}: ${money(past.actualPaid)} · ${marketName(past.purchaseMarket,past.purchaseOther)}`;estimate.title=`Histórico de ${new Date(past.at).toLocaleDateString('pt-BR')} · quantidade: ${past.quantity||'não informada'}. Pode não representar o preço de hoje.`;text.append(estimate);}
    else{estimate.textContent=priceLookupReady?'Sem oferta equivalente encontrada':'Buscando referência de preço…';text.append(estimate);}
   }
   if(item.done){const date=document.createElement('span');date.className='purchase-date';date.textContent=item.purchasedAt?`Comprado em ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(item.purchasedAt))}`:'Data não registrada';text.append(date);const paid=document.createElement('button');paid.type='button';paid.className='paid-link';paid.textContent=item.actualPaid?`Pago: ${money(item.actualPaid)} · ${marketName(item.purchaseMarket,item.purchaseOther)}`:'Preço e marca (opcionais)';paid.disabled=busy||!ready;paid.onclick=()=>openPaid(id);text.append(paid);}
   const edit=document.createElement('button');edit.textContent='Editar';edit.disabled=busy||!ready;edit.setAttribute('aria-label',`Editar ${item.name}`);edit.onclick=()=>openEdit(id);
   const remove=document.createElement('button');remove.textContent='×';remove.className='delete';remove.disabled=busy||!ready;remove.setAttribute('aria-label',`Excluir ${item.name}`);remove.onclick=()=>{if(confirm(`Excluir “${item.name}”?`))mutate(()=>erase([id]));};
   if(!category){const sector=categories.find(c=>c.id===item.category)||categories[categories.length-1];const icon=document.createElement('span');icon.className='row-category';icon.style.setProperty('--category-color',sector.color);icon.title=sector.name;icon.setAttribute('aria-label',sector.name);icon.append(categoryIcon(sector.id));row.append(icon);}
   row.append(check,text,edit,remove);section.append(row);
  }
  $('list').append(section);
 }
 renderSuggestions();
 $('empty').hidden=!!visible;
 $('empty').querySelector('h3').textContent=filter==='done'?'Nenhum comprado ainda':(entries.length?'Tudo comprado!':'Nada por aqui. Ainda.');
 $('empty').querySelector('p').textContent=filter==='done'?'Os itens que você marcar aparecem aqui, com data e hora.':(entries.length?'Os itens estão em Comprados.':'O café acabou? Já é um começo.');
}
function lock(){for(const e of $('add-form').elements)e.disabled=busy||!ready;$('voice-button').disabled=busy||!ready;render();}
async function mutate(action,onError=()=>{}){
 if(busy)return;
 if(!ready||(cloud&&!connected)){message('Sem conexão com a lista. Aguarde a reconexão antes de alterar.');render();return;}
 busy=true;lock();message();
 try{await action();}catch(error){onError();message(errorText(error));}
 finally{busy=false;lock();}
}
function storeLocal(nextItems,nextHistory){localStorage.setItem(storageKey,JSON.stringify({version:2,items:nextItems,history:nextHistory}));}
function newId(){return cloud?cloud.push(cloud.ref(cloud.db,'items')).key:crypto.randomUUID();}
async function save(id,patch){
 const previous=items[id];const next={...previous,...patch};
 let event=null;
 if(!previous)event={name:next.name,category:next.category,brand:next.brand||'',duration:next.duration||'',quantity:next.quantity||'',kind:'added',at:next.createdAt,itemId:id};
 if(patch.done===true&&!previous?.done)event={name:next.name,category:next.category,brand:next.brand||'',duration:next.duration||'',quantity:next.quantity||'',kind:'bought',at:next.purchasedAt,itemId:id};
 if((Object.hasOwn(patch,'actualPaid')||Object.hasOwn(patch,'brand')||Object.hasOwn(patch,'duration'))&&previous?.done&&next.done&&next.purchasedAt){event={name:next.name,category:next.category,brand:next.brand||'',duration:next.duration||'',quantity:next.quantity||'',kind:'bought',at:next.purchasedAt,itemId:id};}
 if(event?.kind==='bought'&&next.purchaseMarket){event.purchaseMarket=next.purchaseMarket;event.purchaseOther=next.purchaseOther||'';}
 if(event?.kind==='bought'&&next.actualPaid){event.actualPaid=next.actualPaid;}
 const eventId=event?`${event.kind}_${id}_${event.at}`:null;
 if(cloud){const updates=Object.fromEntries(Object.entries(patch).map(([field,value])=>[`items/${id}/${field}`,value]));if(event)updates[`history/${eventId}`]=event;return cloud.update(cloud.ref(cloud.db),updates);}
 const nextItems={...items,[id]:next},nextHistory=event?{...history,[eventId]:event}:history;
 storeLocal(nextItems,nextHistory);items=nextItems;history=nextHistory;render();
}
async function erase(ids){
 if(cloud)return cloud.update(cloud.ref(cloud.db,'items'),Object.fromEntries(ids.map(id=>[id,null])));
 const next={...items};ids.forEach(id=>delete next[id]);storeLocal(next,history);items=next;render();
}
function renderSuggestions(){
 renderStats();renderShopping();
 const list=$('suggestions-list');list.replaceChildren();
 if(!historyReady){$('suggestions-hint').textContent='Carregando histórico…';return;}
 const predicted=suggestions(history,items);
 $('suggestions-hint').textContent=predicted.length?'Estimativas pelo seu ritmo de compra. Você decide o que entra na lista.':'Ainda aprendendo: depois de repetir um produto em dias diferentes, as sugestões aparecem perto da próxima compra.';
 for(const suggestion of predicted){
  const row=document.createElement('div');row.className='suggestion-item';
  const sector=categories.find(c=>c.id===suggestion.category)||categories.at(-1);
  const badge=document.createElement('span');badge.className='row-category';badge.style.setProperty('--category-color',sector.color);badge.append(categoryIcon(sector.id));
  const text=document.createElement('div');text.className='item-text';
  const title=document.createElement('span');title.className='item-name';title.textContent=suggestion.name+(suggestion.brand?' · '+suggestion.brand:'');
  const reason=document.createElement('span');reason.className='purchase-date';
  const date=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(suggestion.nextAt));
  reason.textContent=suggestion.source==='prazo informado'?`Duração informada: ${suggestion.duration} · previsão ${date}`:`A cada ~${suggestion.days} dias · previsão ${date} · ${suggestion.samples} ${suggestion.source}${suggestion.initial?' · estimativa inicial':''}`;
  text.append(title,reason);
  const add=document.createElement('button');add.className='quiet';add.textContent='+ Adicionar';add.disabled=busy||!ready;
  add.onclick=()=>mutate(async()=>{await save(newId(),{name:suggestion.name,duration:suggestion.duration||'',category:sector.id,quantity:suggestion.quantity,done:false,createdAt:Date.now()});});
  row.append(badge,text,add);list.append(row);
 }
}
$('add-form').onsubmit=event=>{
 event.preventDefault();const original=$('name').value.trim();const name=$('autocorrect').checked?correctProduct(original).text:original;if(!name){$('name').focus();return;}
 const item={name,duration:$('duration').value.trim(),quantity:$('quantity').value.trim(),category:$('category').value==='auto'?classify(name):$('category').value,done:false,createdAt:Date.now()};
 mutate(async()=>{const id=newId();await save(id,item);showCorrection(id,original,name);const enabled=$('autocorrect').checked,autocompleteEnabled=$('autocomplete-enabled').checked;$('add-form').reset();$('autocorrect').checked=enabled;$('autocomplete-enabled').checked=autocompleteEnabled;updateAutocompletePreference();predict();}).then(()=>{if(!busy)$('name').focus();});
};
function showCorrection(id,original,corrected){
 lastCorrection=original!==corrected?{id,original,corrected}:null;
 $('correction-note').hidden=!lastCorrection;
 if(lastCorrection)$('correction-text').textContent=`Corrigido: “${original}” → “${corrected}”.`;
}
$('undo-correction').onclick=()=>{
 if(!lastCorrection)return;const {id,original,corrected}=lastCorrection;
 if(!items[id]||items[id].name!==corrected){$('correction-note').hidden=true;message('O item já foi alterado. Use Editar para ajustar o nome.');return;}
 mutate(async()=>{await save(id,{name:original});lastCorrection=null;$('correction-note').hidden=true;});
};
function predict(){
 updateProductSuggestions();
 const hasText=!!$('name').value.trim();$('voice-button').hidden=hasText;$('add-button').hidden=!hasText;
 const original=$('name').value.trim();const result=$('autocorrect').checked?correctProduct(original):{text:original,changed:false};
 const category=categories.find(c=>c.id===classify(result.text));
 $('prediction').textContent=original?(result.changed?`“${result.text}” → ${category.name}.`:`Vai para ${category.name}. Dá pra trocar.`):'Errou uma letra? A correção tá ligada.';
}
function updateProductSuggestions(){
 const list=$('product-suggestions');list.replaceChildren();if(!$('autocomplete-enabled').checked)return;
 for(const item of productSuggestions($('name').value,history,items)){
  const entry=document.createElement('option');entry.value=item.name;
  entry.label=item.fromHistory?['Do histórico',item.quantity,item.duration].filter(Boolean).join(' · '):categories.find(c=>c.id===item.category)?.name||'';
  list.append(entry);
 }
}
$('name').addEventListener('change',()=>{
 if(!$('autocomplete-enabled').checked)return;
 const key=$('name').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const previous=productSuggestions($('name').value,history,items).find(item=>item.fromHistory&&item.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===key);
 if(!previous)return;
 if(!$('quantity').value.trim())$('quantity').value=previous.quantity;
 if(!$('duration').value.trim())$('duration').value=previous.duration;
 if($('category').value==='auto'&&previous.category)$('category').value=previous.category;
 predict();
});
function updateAutocompletePreference(){
 const enabled=$('autocomplete-enabled').checked;
 for(const [id,list] of [['name','product-suggestions'],['quantity','quantity-suggestions'],['duration','duration-suggestions']]){
  if(enabled)$(id).setAttribute('list',list);else $(id).removeAttribute('list');
 }
 updateProductSuggestions();
}
try{const saved=localStorage.getItem('market-autocomplete');if(saved!==null)$('autocomplete-enabled').checked=saved==='true';}catch{}
updateAutocompletePreference();
$('autocomplete-enabled').addEventListener('change',()=>{try{localStorage.setItem('market-autocomplete',String($('autocomplete-enabled').checked));}catch{}updateAutocompletePreference();});
$('autocorrect').addEventListener('change',predict);
$('name').addEventListener('input',predict);
for(const button of document.querySelectorAll('[data-filter]'))button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();};
$('clear').onclick=()=>{const ids=Object.keys(items).filter(id=>items[id].done);if(ids.length&&confirm(`Remover ${ids.length} ${ids.length===1?'item comprado':'itens comprados'}?`))mutate(()=>erase(ids));};
function openEdit(id){editId=id;const item=items[id];$('edit-name').value=item.name;$('edit-duration').value=item.duration||'';$('edit-quantity').value=item.quantity;$('edit-category').value=item.category;$('edit-dialog').showModal();}
$('cancel-edit').onclick=()=>$('edit-dialog').close();
$('edit-form').onsubmit=event=>{event.preventDefault();const original=$('edit-name').value.trim();const name=$('autocorrect').checked?correctProduct(original).text:original;if(!name)return;
 if(!items[editId]){message('Este item foi excluído em outro aparelho.');$('edit-dialog').close();return;}
 mutate(async()=>{await save(editId,{name,duration:$('edit-duration').value.trim(),quantity:$('edit-quantity').value.trim(),category:$('edit-category').value});showCorrection(editId,original,name);$('edit-dialog').close();});};
function errorText(error){
 if(error.code?.includes('permission')||error.code==='PERMISSION_DENIED')return 'Sem permissão para esta lista. Confira os dois UIDs nas regras do Firebase.';
 if(error.code?.includes('invalid-credential')||error.code?.includes('wrong-password')||error.code?.includes('user-not-found'))return 'E-mail ou senha incorretos.';
 if(error.code?.includes('too-many-requests'))return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
 if(error.code?.includes('network'))return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
 return 'Não foi possível concluir. Verifique a conexão e a configuração do Firebase. Seus dados não foram apagados.';
}
$('login-form').onsubmit=async event=>{event.preventDefault();const button=$('login-form').querySelector('button');button.disabled=true;message();try{await cloud.signInWithEmailAndPassword(cloud.auth,$('email').value.trim(),$('password').value);$('password').value='';}catch(error){message(errorText(error));}finally{button.disabled=false;}};
$('logout').onclick=async()=>{try{await cloud.signOut(cloud.auth);}catch(error){message(errorText(error));}};
$('stats-period').onchange=renderStats;
function renderStats(){
 const stats=purchaseStats(history,$('stats-period').value);
 $('stats-spend').textContent=`Total registrado: ${money(stats.spent)} · ${stats.priced} de ${stats.total} itens com preço.`;
 $('stats-total').textContent=stats.total;$('stats-unique').textContent=stats.unique;$('stats-days').textContent=stats.days;
 $('stats-products').replaceChildren();$('stats-categories').replaceChildren();
 $('stats-empty').hidden=stats.total>0;
 $('stats-empty').textContent=historyReady?'As estatísticas aparecem quando você marca itens como comprados.':'Carregando histórico…';
 for(const product of stats.products){const row=document.createElement('li');const name=document.createElement('span');name.textContent=product.name;const count=document.createElement('strong');count.textContent=`${product.count}×`;row.append(name,count);$('stats-products').append(row);}
 for(const item of stats.categories){
  const category=categories.find(c=>c.id===item.id)||categories.at(-1);
  const row=document.createElement('div');row.className='stat-category';
  const label=document.createElement('div');const name=document.createElement('span');name.textContent=category.name;const value=document.createElement('strong');value.textContent=`${item.count} · ${Math.round(item.count/stats.total*100)}%`;label.append(name,value);
  const bar=document.createElement('div');bar.className='stat-bar';const fill=document.createElement('span');fill.style.width=`${item.count/stats.total*100}%`;fill.style.backgroundColor=category.color;bar.append(fill);row.append(label,bar);$('stats-categories').append(row);
 }
}
let recognition=null,voiceFinal='',voiceInterim='',listening=false;
function updateVoicePreview(){
 const transcript=[voiceFinal,voiceInterim].filter(Boolean).join(' ').trim();
 $('voice-transcript').textContent=transcript||'Ex.: arroz SOMA feijão SOMA detergente';
 const names=splitSpokenItems(transcript);
 $('voice-preview').replaceChildren();
 for(const raw of names){const name=$('autocorrect').checked?correctProduct(raw).text:raw;const li=document.createElement('li');li.textContent=`${name} · ${categories.find(c=>c.id===classify(name)).name}`;$('voice-preview').append(li);}
 const invalid=names.length>50||names.some(name=>name.length>100);
 if(invalid)$('voice-status').textContent='Use até 50 itens por vez, com no máximo 100 caracteres em cada nome.';
 $('voice-add').disabled=listening||!names.length||invalid||busy||!ready;
}
function stopVoice(){if(recognition&&listening)recognition.stop();}
$('voice-button').onclick=()=>{
 if(!speechSupported()){message('Este navegador não tem reconhecimento de voz. Tente no Chrome ou use o campo de texto.');return;}
 voiceFinal='';voiceInterim='';$('voice-status').textContent='Pedindo acesso ao microfone…';$('voice-dialog').showModal();
 recognition=createRecognition();listening=true;$('voice-stop').disabled=false;updateVoicePreview();
 recognition.onresult=event=>{let final='',interim='';for(let i=0;i<event.results.length;i++){if(event.results[i].isFinal)final+=event.results[i][0].transcript+' ';else interim+=event.results[i][0].transcript+' ';}voiceFinal=final.trim();voiceInterim=interim.trim();updateVoicePreview();};
 recognition.onstart=()=>{$('voice-status').textContent='Ouvindo… diga SOMA entre os produtos.';};
 recognition.onend=()=>{listening=false;voiceInterim='';$('voice-stop').disabled=true;if(!$('voice-status').dataset.error)$('voice-status').textContent=voiceFinal?'Confira os itens antes de adicionar.':'Não ouvi nenhum item. Feche e tente de novo.';updateVoicePreview();};
 recognition.onerror=event=>{$('voice-status').dataset.error='true';$('voice-status').textContent=event.error==='not-allowed'?'O acesso ao microfone foi negado. Libere nas permissões do navegador.':event.error==='network'?'O reconhecimento precisa de conexão. Confira sua internet.':'Não consegui reconhecer a fala. Feche e tente novamente.';};
 delete $('voice-status').dataset.error;
 try{recognition.start();}catch{listening=false;$('voice-status').textContent='Não foi possível iniciar o microfone.';updateVoicePreview();}
};
$('voice-stop').onclick=stopVoice;
$('voice-cancel').onclick=()=>{recognition?.abort();$('voice-dialog').close();};
$('voice-dialog').addEventListener('cancel',()=>recognition?.abort());
$('voice-add').onclick=()=>{
 const names=splitSpokenItems(voiceFinal).map(raw=>$('autocorrect').checked?correctProduct(raw).text:raw);
 if(!names.length||names.length>50||names.some(name=>name.length>100))return;
 mutate(async()=>{
  const now=Date.now(),nextItems={...items},nextHistory={...history},updates={};
  for(const [index,name] of names.entries()){
   const id=newId(),createdAt=now+index,item={name,quantity:'',category:classify(name),done:false,createdAt};
   const event={name,quantity:'',category:item.category,kind:'added',at:createdAt,itemId:id},eventId=`added_${id}_${createdAt}`;
   nextItems[id]=item;nextHistory[eventId]=event;updates[`items/${id}`]=item;updates[`history/${eventId}`]=event;
  }
  if(cloud)await cloud.update(cloud.ref(cloud.db),updates);else{storeLocal(nextItems,nextHistory);items=nextItems;history=nextHistory;render();}
  $('voice-dialog').close();
 });
};
function renderTotals(){
 const session=location.hash==='#mercado'?shoppingSession:null;
 const totals=listTotals(items,offers,history,session);
 $('budget-estimated').textContent=`${totals.missing?'≥ ':''}${money(totals.estimated)}`;
 $('budget-actual').textContent=money(totals.actual);
 $('budget-coverage').textContent=totals.missing?`Parcial · ${totals.missing} ${totals.missing===1?'item sem preço':'itens sem preço'}`:`${totals.count} ${totals.count===1?'item considerado':'itens considerados'}`;
 $('budget-paid').textContent=`${totals.priced} ${totals.priced===1?'item com preço pago':'itens com preço pago'}`;
 $('budget-note').textContent='O estimado usa referências de preço e passa a usar o valor real quando você informa. Quantidades sem conversão segura ficam fora da soma.';
}
function renderShopping(){
 $('shopping-start').hidden=!!shoppingSession;$('shopping-active').hidden=!shoppingSession;
 if(!shoppingSession)return;
 $('shopping-place').textContent=marketName(shoppingSession.market,shoppingSession.other);
 const bought=Object.values(history).filter(e=>e.kind==='bought'&&e.at>=shoppingSession.startedAt&&e.purchaseMarket===shoppingSession.market&&(e.purchaseOther||'')===(shoppingSession.other||''));
 const summary=purchaseStats(Object.fromEntries(bought.map((event,index)=>[index,event])),'all');
 $('shopping-total').textContent=`${summary.total} itens comprados · ${summary.priced} com preço · ${money(summary.spent)} registrado`;
}
function marketOther(select,input,label){const other=$(select).value==='other';$(label).hidden=!other;$(input).required=other;}
$('shopping-market').onchange=()=>{marketOther('shopping-market','shopping-other','shopping-other-label');if(['assai','prezunic'].includes($('shopping-market').value))$('shopping-start').requestSubmit();};
$('shopping-start').onsubmit=event=>{event.preventDefault();const next={market:$('shopping-market').value,other:$('shopping-market').value==='other'?$('shopping-other').value.trim():'',startedAt:Date.now()};if(next.market==='other'&&!next.other)return;shoppingSession=next;try{localStorage.setItem('market-session',JSON.stringify(next));}catch{}renderShopping();render();};
$('shopping-finish').onclick=()=>{shoppingSession=null;try{localStorage.removeItem('market-session');}catch{}renderShopping();location.hash='#lista';};
function openPaid(id){
 if(!items[id])return;paidId=id;const item=items[id];
 $('paid-product').textContent=`${item.name}${item.quantity?' · '+item.quantity:''}`;
 $('paid-value').value=item.actualPaid||'';$('paid-brand').value=item.brand||'';
 const market=item.purchaseMarket||shoppingSession?.market,other=item.purchaseOther||shoppingSession?.other||'';
 $('paid-location').hidden=!market;$('paid-location').textContent=market?marketName(market,other):'';
 updatePaidAction();$('paid-dialog').showModal();
}
async function cancelPurchase(){
 const id=paidId,item=items[id];
 if(!item?.done){$('paid-dialog').close();return;}
 await mutate(async()=>{
  const patch={done:false,purchasedAt:null,actualPaid:null,purchaseMarket:null,purchaseOther:null};
  const eventId=item.purchasedAt?`bought_${id}_${item.purchasedAt}`:null;
  if(cloud){
   const updates=Object.fromEntries(Object.entries(patch).map(([field,value])=>[`items/${id}/${field}`,value]));
   if(eventId)updates[`history/${eventId}`]=null;
   await cloud.update(cloud.ref(cloud.db),updates);
  }else{
   const nextItems={...items,[id]:{...item,...patch}},nextHistory={...history};if(eventId)delete nextHistory[eventId];
   storeLocal(nextItems,nextHistory);items=nextItems;history=nextHistory;render();
  }
  $('paid-dialog').close();
 });
}
$('paid-cancel').onclick=cancelPurchase;
$('paid-dialog').addEventListener('cancel',event=>{event.preventDefault();cancelPurchase();});
function updatePaidAction(){
 const filled=!!($('paid-value').value.trim()||$('paid-brand').value.trim());
 $('paid-continue').hidden=!filled;$('paid-without').hidden=filled;
}
$('paid-without').onclick=event=>{event.preventDefault();$('paid-dialog').close();};
$('paid-value').addEventListener('input',updatePaidAction);
$('paid-brand').addEventListener('input',updatePaidAction);
$('paid-form').onsubmit=event=>{event.preventDefault();const item=items[paidId];if(!item?.done){$('paid-dialog').close();message('Este item já foi desmarcado ou removido.');return;}
 if(!$('paid-value').value&&!$('paid-brand').value.trim()&&!item.actualPaid&&!item.brand){$('paid-dialog').close();return;}
 const raw=$('paid-value').value,actualPaid=raw?Number(raw):null,brand=$('paid-brand').value.trim();
 if(raw&&(!Number.isFinite(actualPaid)||actualPaid<=0||actualPaid>999999))return;
 const purchaseMarket=item.purchaseMarket||shoppingSession?.market||null,purchaseOther=item.purchaseOther||shoppingSession?.other||null;
 mutate(async()=>{await save(paidId,{actualPaid,brand,purchaseMarket,purchaseOther,purchasedAt:item.purchasedAt||Date.now()});$('paid-dialog').close();});
};
function showPage(focus=false){
 const page=location.hash==='#estatisticas'?'estatisticas':location.hash==='#mercado'?'mercado':'lista';
 $('list-view').hidden=page==='estatisticas';$('stats-view').hidden=page!=='estatisticas';$('shopping-view').hidden=page!=='mercado';$('list-intro').hidden=page==='mercado';
 $('add-form').hidden=page==='mercado';$('suggestions').hidden=page==='mercado';$('correction-note').hidden=page==='mercado'||!lastCorrection;$('clear').hidden=page==='mercado';
 if(page==='mercado'){filter='pending';document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));render();}
 for(const link of document.querySelectorAll('[data-page]')){if(link.dataset.page===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 document.title=page==='estatisticas'?'O que rolou no mercado · Nosso mercado':page==='mercado'?'Cheguei ao mercado · Nosso mercado':'Nosso mercado · Lista de compras';
 if(page==='estatisticas'){renderStats();if(focus)$('stats-title').focus({preventScroll:true});}renderShopping();renderTotals();
}
window.addEventListener('hashchange',()=>showPage(true));
showPage();
async function bootShared(){
 let local={items:{},history:{}};
 const migrationKey='rodovia-shared-import-'+sharedConfig.listId;
 try{local=readLocalSnapshot(localStorage.getItem(storageKey));}catch{message('Não foi possível ler os itens deste aparelho. A lista compartilhada continua disponível.');}
 let migrated=false;try{migrated=localStorage.getItem(migrationKey)==='true';}catch{}
 const hasLocal=Object.keys(local.items).length>0||Object.keys(local.history).length>0;
 function finishMigration(){migrated=true;try{localStorage.setItem(migrationKey,'true');}catch{}$('local-import').hidden=true;}
 cloud=createSharedClient(sharedConfig,{
  onState(state){items=state.items;history=state.history;historyReady=true;ready=true;connected=true;status('Lista compartilhada · sincronizada');$('local-import').hidden=migrated||!hasLocal;if(!migrated&&hasLocal)$('local-import-text').textContent=`Este aparelho tem ${Object.keys(local.items).length} itens locais. Quer juntá-los à lista compartilhada?`;lock();},
  onConnection(online){connected=online;ready=online;status(online?'Lista compartilhada · sincronizada':'Sem conexão · aguardando reconexão');lock();}
 });
 $('workspace').hidden=false;$('login').hidden=true;$('logout').hidden=true;status('Conectando à lista compartilhada…');lock();
 try{
  await cloud.start();if(!hasLocal)finishMigration();
 }catch{message('Não foi possível conectar à lista compartilhada. Seus itens locais continuam preservados. A conexão será tentada novamente.');}
 $('import-local').onclick=()=>mutate(async()=>{await cloud.importLocal(local);finishMigration();message('Itens deste aparelho adicionados à lista compartilhada.');});
 $('dismiss-local').onclick=finishMigration;
}
async function boot(){
 if(sharedConfig.url){await bootShared();return;}
 if(!configured){
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved.version===2){items=saved.items||{};history=saved.history||{};}else{items=saved;history={};for(const [id,item] of Object.entries(items)){if(item.createdAt)history[`added_${id}_${item.createdAt}`]={name:item.name,category:item.category,quantity:item.quantity||'',kind:'added',at:item.createdAt,itemId:id};if(item.purchasedAt)history[`bought_${id}_${item.purchasedAt}`]={name:item.name,category:item.category,quantity:item.quantity||'',kind:'bought',at:item.purchasedAt,itemId:id};}}if(!items||Array.isArray(items)||typeof items!=='object')throw Error('invalid');historyReady=true;}
  catch{items={};message('O armazenamento local não está disponível ou não pôde ser lido. Verifique as permissões do navegador.');}
  ready=true;$('workspace').hidden=false;status('Modo local · salvo só neste navegador');lock();return;
 }
 try{
  if(!firebaseConfig.apiKey||!firebaseConfig.databaseURL||!firebaseConfig.authDomain||!firebaseConfig.projectId||!firebaseConfig.appId)throw Error('Configuração incompleta');
  const version='12.7.0';
  const [app,auth,db]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`)]);
  const instance=app.initializeApp(firebaseConfig);cloud={...auth,...db,auth:auth.getAuth(instance),db:db.getDatabase(instance)};
  auth.onAuthStateChanged(cloud.auth,user=>{
   unsub.forEach(fn=>fn());unsub=[];items={};history={};historyReady=false;ready=false;connected=false;message();
   $('login').hidden=!!user;$('workspace').hidden=!user;$('logout').hidden=!user;lock();
   if(!user){status('Entre para abrir a lista');return;}
   status('Conectando à lista…');
   unsub.push(db.onValue(db.ref(cloud.db,'.info/connected'),snapshot=>{connected=snapshot.val()===true;status(connected?(ready?'Lista compartilhada · conectada':'Carregando lista…'):'Sem conexão · aguardando reconexão');}));
   unsub.push(db.onValue(db.ref(cloud.db,'history'),snapshot=>{history=snapshot.val()||{};historyReady=true;renderSuggestions();},error=>{historyReady=false;$('suggestions-hint').textContent='Não foi possível ler o histórico. Confira as regras atualizadas do Firebase.';message(errorText(error));}));
   unsub.push(db.onValue(db.ref(cloud.db,'items'),snapshot=>{items=snapshot.val()||{};ready=true;status(connected?'Lista compartilhada · conectada':'Sem conexão · aguardando reconexão');lock();},error=>{ready=false;status('Acesso à lista indisponível');message(errorText(error));lock();}));
  });
 }catch(error){status('Configuração pendente');message('Não foi possível iniciar a lista compartilhada. Confira site/config.js, sua conexão e as instruções do README.');}
}
boot();
setInterval(()=>{if(ready&&historyReady)renderSuggestions();},60000);

fetch('./data/prices.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('preços indisponíveis');return response.json();}).then(data=>{offers=data.offers||[];}).catch(()=>{}).finally(()=>{priceLookupReady=true;if(ready)render();});
