# Felipe Health Dashboard — primeira etapa

Aplicativo pessoal em português, com interface adaptada ao iPhone. O PostgreSQL é a fonte principal dos registros; a planilha existente não é uma dependência do aplicativo.

## Experimentar agora

Com Node.js 22 e as dependências instaladas:

```sh
npm install
npm run dev
```

Abra http://127.0.0.1:3000/demo. Os dados desta página são **fictícios**, ficam somente na memória da sessão e desaparecem ao recarregar. Não use a demonstração para guardar dados pessoais. A página `/login` explica o estado da configuração quando não existe conexão com o Supabase.

## O que está implementado

- Hoje: hidratação, nutrientes, último check-in, gráfico intradiário e timeline.
- Água: +650 ml, +590 ml, volume livre, horário e bebida. Outros líquidos não contam como água pura.
- Check-in: cinco presets, seções expansíveis, escalas opcionais 0–10, humor, atividade e ambiente. Zero permanece diferente de null. Rascunhos privados são salvos no banco quando conectado.
- Alimentação: cadastro por 100 g, porções em gramas, refeições com campos opcionais, combinações salvas e marcação de estimativa.
- Metas: mínimo, máximo, intervalo e alvo; seis tipos de dia; ajustes diários e modelos editáveis no banco. Os valores iniciais vêm do briefing, não são recomendação clínica.
- Timeline por data, busca, filtro por categoria, edição, duplicação e exclusão. Alterações anteriores são preservadas no banco.
- Login por e-mail e senha com Supabase Auth, renovação de sessão e validação de usuário nas operações do servidor. RLS em todas as tabelas privadas.
- Estrutura PWA: manifesto, ícone, modo standalone. Não há funcionamento offline nem notificações nesta etapa.

## Começar do zero com Supabase

1. Crie sua conta no Supabase e um projeto exclusivo para o aplicativo. Guarde a senha do banco no seu gerenciador de senhas.
2. No editor SQL do projeto, execute os arquivos de `supabase/migrations/` em ordem pelo nome. Faça isso **antes** de criar o usuário do aplicativo: o trigger cria perfil e modelos de metas quando o usuário é criado.
3. Em Authentication, desative novos cadastros públicos e crie seu usuário de e-mail/senha pelo painel. O aplicativo não oferece cadastro aberto.
4. Copie `.env.example` para `.env.local` e preencha a URL do projeto e a chave pública publishable/anon. Não use a chave `service_role` nem a senha do banco no aplicativo.
5. Reinicie o aplicativo e entre por `/login`. Os registros da demonstração não são importados.

A criação da conta, aceitação de termos e definição de senha devem ser feitas pelo titular. Nenhuma conta ou infraestrutura externa foi criada nesta entrega.

## Publicação futura na Vercel

O projeto usa Next.js real e está preparado para a Vercel, conforme o briefing. Importe a pasta `felipe-health` como raiz, configure as duas variáveis do `.env.example` no ambiente de produção e utilize `npm run build`. Configure a URL pública correta no Supabase Auth. A publicação deve acontecer depois de aplicar as migrations e testar o login na conta real. Não houve publicação externa nesta etapa.

Somente a tela de acesso e a demonstração fictícia são públicas. Rotas com registros exigem autenticação. `robots.txt`, metadados e cabeçalhos pedem não indexação; a proteção dos dados é feita por autenticação e RLS, não pelo bloqueio de indexadores.

## Verificação

```sh
npm run typecheck
npm test
npm run build
```

Os testes de banco usam PostgreSQL via PGlite com um esquema `auth` de teste e duas identidades fictícias. Verificam policies, proibição de acesso cruzado, auditoria e validação. Isso não substitui o teste final com Supabase Auth real. A instalação da extensão pgcrypto é omitida somente no ambiente PGlite, que já fornece a geração de UUID usada aqui.

## Limites desta etapa

A autenticação e persistência estão implementadas, mas **não foram conectadas nem testadas contra uma conta Supabase real**, porque ainda não existe um projeto configurado. A demonstração é testável localmente; não representa dados do histórico.

Os módulos de sono, tênis, fezes, cafeína, suplementos, medicamentos, sintomas, receitas com cálculo de rendimento, fotos, importação Apple Health/planilhas, histórico agregado, fechamento, exportações e correlações ficam para as próximas etapas. O dashboard mostra sono, passos e exercício como sem dados, sem inventar medições. Presets de check-in nesta etapa usam os mesmos campos; campos específicos de sono/tênis entram com esses módulos. Não há MFA nem recuperação de senha dentro do aplicativo nesta versão; o titular pode administrar a conta pelo painel Supabase.

O gráfico inclui energia, clareza e motivação. O histórico atual é navegação por data e busca dentro do dia; filtros de períodos e correlações ainda não estão implementados. Fotos não são aceitas e nenhum bucket público é criado.

Veja `ARCHITECTURE.md` para o modelo de dados e a evolução planejada.
