# Serviço compartilhado da Lista Rodovia

Cloudflare Worker + D1, hospedado no Sites. O frontend permanece no GitHub Pages e se conecta pelo endereço de site/config.js. Acesso público por link, conforme solicitado. O identificador da lista é público no cliente e limita as operações a esta lista; não é uma credencial administrativa.

A API permite leitura, alterações por campo e importação sem sobrescrever IDs já existentes. Alterações de vários campos e eventos são gravadas juntas. Não use credenciais de publicação no frontend. A versão publicada usa o projeto declarado em .openai/hosting.json. Para atualizar o serviço, siga o fluxo da habilidade Sites com os arquivos desta pasta e preserve as migrações aplicadas.

## Consulta Amazon

Aplique também `drizzle/0001_amazon_lookups.sql` ao publicar. `worker/amazon.js` usa a API de busca Rainforest para Amazon Brasil. Configure `RAINFOREST_API_KEY` como segredo no Sites e publique uma nova versão para aplicá-lo. Opcional: `AMAZON_DAILY_LIMIT` (padrão 20, máximo 100 por dia UTC). Sem chave, retorna `not_configured` e não chama serviços externos. Não configure credenciais Amazon Prime, senha ou cookies.

`GET /api/amazon?itemId=<id>` exige o mesmo acesso da lista e usa somente itens existentes. As tabelas de cache e quota são separadas dos itens e do histórico. Erros e respostas brutas do fornecedor não chegam ao cliente. As condições de frete e a variante precisam ser confirmadas no anúncio.

Documentação do fornecedor: https://docs.trajectdata.com/rainforestapi/product-data-api/parameters/search
