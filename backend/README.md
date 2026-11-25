# Serviço compartilhado da Lista Rodovia

Cloudflare Worker + D1, hospedado no Sites. O frontend permanece no GitHub Pages e se conecta pelo endereço de site/config.js. Acesso público por link, conforme solicitado. O identificador da lista é público no cliente e limita as operações a esta lista; não é uma credencial administrativa.

A API permite leitura, alterações por campo e importação sem sobrescrever IDs já existentes. Alterações de vários campos e eventos são gravadas juntas. Não use credenciais de publicação no frontend. A versão publicada usa o projeto declarado em .openai/hosting.json. Para atualizar o serviço, siga o fluxo da habilidade Sites com os arquivos desta pasta e preserve as migrações aplicadas.
