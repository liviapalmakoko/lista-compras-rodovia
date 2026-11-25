# Lista de compras Rodovia

Site em português, feito para celular e pronto para GitHub Pages. HTML, CSS e JavaScript, sem instalação de dependências ou compilação.

## Funcionalidades

- Lista com categorias automáticas, ícones Flaticon e cores por setor.
- Organização por categoria, ordem de inclusão ou A–Z.
- Quantidade e duração previstas opcionais. Marca e preço pago são opcionais nos detalhes da compra.
- Correção de digitação e sugestões de preenchimento podem ser desligadas separadamente.
- Ditado em português: diga “arroz SOMA feijão SOMA detergente”, confira a prévia e adicione os itens.
- Modo Cheguei ao mercado, com Assaí Méier, Prezunic Méier ou outro mercado.
- Ao dar check, a janela permite informar preço e marca. Vazia, mostra o link Continuar sem preencher; preenchida, mostra Salvar. O × cancela a compra e devolve o produto à lista.
- Totais discretos ao final da lista: estimativa e valor real já gasto. Valores desconhecidos deixam a estimativa parcial.
- Histórico, sugestões de reposição e estatísticas em uma área separada.

## Publicar

A publicação usa **Settings → Pages → Deploy from a branch → main → /docs**. O aplicativo público fica em `docs/`, e o código de desenvolvimento fica em `site/`. Ao alterar a aplicação, sincronize as duas pastas antes do push. O workflow apenas verifica os testes, sem permissão para gravar na branch.

A atualização automática diária das ofertas está pendente de autorização do workflow. Para atualizar manualmente, execute `python3 scripts/update_prices.py`, copie `site/data/prices.json` para `docs/data/prices.json` e faça commit e push. As referências vencem após 24 horas; depois disso, a lista usa o histórico disponível.

## Lista compartilhada entre celulares

O site agora usa um banco compartilhado no Sites. Todos que acessarem o endereço do GitHub Pages podem ver e editar a mesma lista, sem login. As mudanças são sincronizadas em poucos segundos enquanto a página está aberta. A sessão do mercado continua sendo uma preferência de cada aparelho; produtos, preços pagos, histórico e estatísticas são compartilhados.

Na primeira abertura após a atualização, se o navegador tiver itens locais, use **Juntar meus itens**. A importação preserva o que já estiver no banco, sem sobrescrever registros com o mesmo ID. O backup local anterior fica mantido no navegador; não há envio automático que possa trazer testes antigos de outros aparelhos. Depois de importar, o aparelho não importa novamente sozinho.

É preciso conexão para alterar a lista. Se cair, o site preserva a tela e reconecta; não cria outra lista independente. O serviço evita regravar a lista toda: mudanças em produtos diferentes ou campos diferentes são preservadas. Se duas pessoas alterarem o mesmo campo ao mesmo tempo, a última alteração recebida prevalece.

`site/shared.js` contém o cliente; `backend/` contém o serviço e a migração do banco. A configuração anterior do Firebase está vazia e não é usada enquanto `sharedConfig.url` estiver definida. Nenhuma chave administrativa é enviada aos navegadores. A lista é pública por link, e o identificador público também aparece no código do repositório.

## Preços e aprendizado

`scripts/update_prices.py` lê as ofertas públicas do **Savelly**, agregador de encartes, para Assaí Méier (Dias da Cruz, 371) e Prezunic Méier (Dias da Cruz, 579). Não é uma integração oficial com o catálogo completo dos supermercados.

A busca por produto usa palavras completas, respeita a marca quando informada e mostra a descrição e condições da oferta. Um nome genérico pode retornar outra embalagem: confira a referência vinculada. Os valores expiram após 24 horas. Se não houver oferta equivalente, o site pode usar o último total pago no histórico, identificado como tal. No modo de compra, filtra pelo mercado escolhido. Para outro mercado, aprende com os preços que vocês registram.

O total estimado multiplica contagens simples, como 2 unidades. Quantidades sem conversão segura ficam fora da soma; o total é marcado como parcial. O valor real considera só preços pagos registrados e substitui a referência no total estimado. Preço pago é o total do produto, incluindo a quantidade anotada.

As sugestões de reposição usam intervalos medianos entre compras ou inclusões. Precisam de repetição em dias separados, salvo quando vocês informam um prazo de duração. Esse prazo conta a partir da compra; 1 mês significa aproximadamente 30 dias. Não mede estoque real. O cálculo acontece no próprio site, sem serviço de IA externo.

Limpar comprados preserva o histórico. O × da janela de compra remove o evento da marcação cancelada. As estatísticas contam registros de compra e somam somente valores reais informados, indicando cobertura.

## Voz

O reconhecimento usa SpeechRecognition do navegador em pt-BR. Pode precisar de internet e processar o áudio no serviço do navegador. O site não grava áudio. A compatibilidade varia; é necessário permitir o microfone. HTTPS ou localhost são necessários. Separe produtos com a palavra SOMA. Quantidade e duração podem ser ajustadas antes de adicionar.

## Rodar e testar

```sh
python3 -m http.server 8000 --directory site
```

Acesse http://localhost:8000. Não abra index.html com duplo clique.

Com Node.js instalado:

```sh
npm test
```

Para atualizar as ofertas localmente, com internet:

```sh
python3 scripts/update_prices.py
```

Os testes cobrem classificação, correção, ordenação, histórico, duração, sugestões, divisão do ditado, estatísticas e totais. A sincronização do serviço compartilhado foi testada com clientes independentes, importação sem sobrescrita e atualizações simultâneas. O microfone precisa de teste real no navegador do usuário.

## Créditos e referências

- UIcons Regular Rounded 4.0.0 por [Flaticon](https://www.flaticon.com/uicons), com atribuição no rodapé. A fonte oficial está incluída em `site/assets/flaticon/`.
- [Ofertas Assaí Méier no Savelly](https://savelly.com.br/rio-de-janeiro/loja/743/assai-atacadista-rua-dias-da-cruz-371-meier)
- [Ofertas Prezunic Méier no Savelly](https://savelly.com.br/rio-de-janeiro/loja/1848/prezunic-rua-dias-da-cruz-579-meier)
- [Firebase Web](https://firebase.google.com/docs/web/setup)
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
