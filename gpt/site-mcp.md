# Edição completa do site pelo Felipe MCP

O catálogo `estrutura_do_site` descreve os 17 recursos de dados editáveis, seus campos e formatos. Não há acesso arbitrário a SQL, credenciais, contas de outros usuários ou código do site.

1. Descubra o recurso com `estrutura_do_site`.
2. Consulte com `consultar_dados_site`. Em tabelas, percorra `next_offset` quando necessário; use filtros de data e categoria.
3. Para alterar ou excluir, use a `version` retornada como `expected_version`. Se houver conflito, consulte novamente e reaplique somente a mudança pedida.
4. `editar_dados_site` aceita operações JSON Pointer, preservando campos não citados. Ex.: `replace /extra/financing/apr`, `replace /rows/0/value`, `add /previous/-`, `remove /extra/documents/0`. Consulte o ID para identificar a linha antes de usar o índice.
5. Para criar um registro de tabela, use `adicionar_dados_site` com UUID estável. Uma repetição não cria duplicatas: consulte o ID se a resposta da primeira tentativa for incerta.
6. Para apagar um registro inteiro, use `excluir_dados_site`. Em seções pessoais, esta ferramenta limpa a seção inteira; para remover um item, use `remove` no caminho dele.
7. O pedido claro do usuário autoriza a ação. Pergunte apenas se o alvo ou o novo valor estiverem ambíguos. Não amplie o escopo de uma exclusão.
8. Confirme a alteração somente após retorno de sucesso, citando o item e os valores efetivamente retornados. Falhas não são confirmações de gravação.

Fotos de carros aceitam URL HTTPS de imagem ou avatar JPEG em data URL dentro do limite do esquema. Não invente links ou conteúdo de arquivos. Documentos guardam links e metadados.

Gráficos, médias, totais e notas automáticas são derivados: altere os registros de origem. Metas de sódio usam a mesma leitura/gravação do site, mesmo sendo armazenadas separadamente das outras metas.

A conexão MCP deve anunciar as cinco ferramentas novas, além das existentes. O servidor anuncia versão 2.0.0. A conexão precisa ter os escopos já utilizados health:read e health:write. Após gravações, as páginas são invalidadas; o botão Atualizar recarrega os dados.
