"""Consulta ofertas públicas por unidade; não é catálogo oficial nem API dos mercados."""
import json,re,html,datetime,urllib.request
from pathlib import Path
SOURCES={
 'assai':('Assaí Méier','https://savelly.com.br/rio-de-janeiro/loja/743/assai-atacadista-rua-dias-da-cruz-371-meier'),
 'prezunic':('Prezunic Méier','https://savelly.com.br/rio-de-janeiro/loja/1848/prezunic-rua-dias-da-cruz-579-meier')}
def text(value):return html.unescape(re.sub('<[^>]+>',' ',value)).strip()
def parse_offers(page,market,label,url,checked):
 result=[]
 for card in re.findall(r'<article\b[^>]*class="[^"]*card-oferta[^"]*"[^>]*>(.*?)</article>',page,re.S):
  name=re.search(r'<a\b[^>]*class="card-nome"[^>]*>(.*?)</a>',card,re.S)
  price=re.search(r'<span\b[^>]*class="preco"[^>]*>\s*R\$\s*([\d.,]+)',card,re.S)
  condition=re.search(r'<div\b[^>]*class="preco-condicao"[^>]*>(.*?)</div>',card,re.S)
  if not name or not price:continue
  amount=float(price.group(1).replace('.','').replace(',','.'))
  if amount<=0:continue
  result.append(dict(name=text(name.group(1)),price=amount,market=market,marketName=label,condition=text(condition.group(1)) if condition else '',source=url,checkedAt=checked,expiresAt=checked+24*60*60*1000))
 return result
if __name__=='__main__':
 checked=int(datetime.datetime.now(datetime.timezone.utc).timestamp()*1000)
 offers=[];errors=[]
 for market,(label,url) in SOURCES.items():
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'NossoMercado/1.0 (personal shopping list; daily public offers lookup)'})
   with urllib.request.urlopen(request,timeout=30) as response:page=response.read().decode('utf-8')
   parsed=parse_offers(page,market,label,url,checked)
   if not parsed:raise ValueError('Nenhuma oferta legível')
   offers.extend(parsed)
  except Exception as error:errors.append({'market':market,'error':str(error)})
 destination=Path(__file__).resolve().parents[1]/'site/data/prices.json'
 destination.write_text(json.dumps({'updatedAt':checked,'provider':'Savelly (ofertas públicas por unidade)','offers':offers,'errors':errors},ensure_ascii=False,indent=2)+'\n')
 print(f'{len(offers)} ofertas atualizadas; {len(errors)} fontes indisponíveis.')
 if not offers:raise SystemExit(1)
