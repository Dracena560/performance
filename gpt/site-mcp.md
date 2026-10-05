# Edição completa do site pelo Felipe MCP

O catálogo `estrutura_do_site` descreve os 20 recursos de dados editáveis, seus campos e formatos. Não há acesso arbitrário a SQL, credenciais, contas de outros usuários ou código do site.

1. Descubra o recurso com `estrutura_do_site`.
2. Consulte com `consultar_dados_site`. Em tabelas, percorra `next_offset` quando necessário; use filtros de data e categoria.
3. Para alterar ou excluir, use a `version` retornada como `expected_version`. Se houver conflito, consulte novamente e reaplique somente a mudança pedida.
4. `editar_dados_site` aceita operações JSON Pointer, preservando campos não citados. Ex.: `replace /extra/financing/apr`, `replace /rows/0/value`, `add /previous/-`, `remove /extra/documents/0`. Consulte o ID para identificar a linha antes de usar o índice.
5. Para criar um registro de tabela, use `adicionar_dados_site` com UUID estável. Uma repetição não cria duplicatas: consulte o ID se a resposta da primeira tentativa for incerta.
6. Para apagar um registro inteiro, use `excluir_dados_site`. Em seções pessoais, esta ferramenta limpa a seção inteira; para remover um item, use `remove` no caminho dele.
7. O pedido claro do usuário autoriza a ação. Pergunte apenas se o alvo ou o novo valor estiverem ambíguos. Não amplie o escopo de uma exclusão.
8. Confirme a alteração somente após retorno de sucesso, citando o item e os valores efetivamente retornados. Falhas não são confirmações de gravação.

Fotos de carros aceitam URL HTTPS de imagem ou avatar JPEG em data URL dentro do limite do esquema. Não invente links ou conteúdo de arquivos. Documentos guardam links e metadados.

## Cartão de crédito e caixa

- `registrar_cartao_credito`: envie `balance` (valor atual da fatura, em £) e/ou `checking_balance` (saldo da conta corrente). Cada envio entra no histórico do gráfico do Financeiro; um novo envio na mesma data substitui o daquela data.
- `previsao_financeira`: devolve a fatura atual, quanto ter na conta para os débitos automáticos dos próximos 10 dias (com a margem de £150), quanto pode ser pago no cartão agora e a previsão dos próximos 12 meses.
- Limite, dia de vencimento, margem, juros e correções do histórico ficam no recurso `cartao_credito` (`editar_dados_site`, ex.: `replace /limit`, `remove /history/0`).

## Liga de tênis (box league)

A liga aparece na página pública `/liga` (sem login, para compartilhar) e em Tênis → Liga.

- `consultar_liga`: jogadores, temporadas, classificação, status e confrontos pendentes, com os ids.
- `registrar_resultado_liga`: um resultado por par na temporada; registrar de novo o mesmo par substitui. Na foto da tabela box, a linha é `home` e a coluna é `away`; células espelhadas são o mesmo jogo.
- `salvar_jogador_liga`: cria ou atualiza jogador (foto, país ISO de 2 letras, mão, backhand, raquete, corda, nível, golpe favorito, ídolo…). Nunca grave telefone ou e-mail.
- `criar_temporada_liga`: temporadas trimestrais (jan–mar, abr–jun, jul–set, out–dez), copiando o box anterior.
- `adicionar_imagem_liga`: foto da tabela, do grupo etc., como URL HTTPS ou JPEG em data URL comprimido.
- Remoções e correções finas: recurso `liga_tenis` com `editar_dados_site` (ex.: `remove /seasons/1/matches/3`, `replace /players/0/country`).

Gráficos, médias, totais e notas automáticas são derivados: altere os registros de origem. Metas de sódio usam a mesma leitura/gravação do site, mesmo sendo armazenadas separadamente das outras metas.

A conexão MCP deve anunciar as cinco ferramentas novas, além das existentes. O servidor anuncia versão 2.0.0. A conexão precisa ter os escopos já utilizados health:read e health:write. Após gravações, as páginas são invalidadas; o botão Atualizar recarrega os dados.
