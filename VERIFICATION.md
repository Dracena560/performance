# Verificação — redesign Apple HIG + Liquid Glass (05/10/2026, branch `apple-clone`)

- Compilação de produção Next.js: passou (`npm run build`, webpack), 36 rotas.
- TypeScript: passou (`npm run typecheck`).
- Testes automatizados: 39 passaram, 0 falharam (`npm test`).
- Cobertura de estilos: todas as classes usadas nos componentes têm regra em `app/styles/` (script de cobertura da sessão).
- Servidor de desenvolvimento na porta 4200 (`npm run dev`, `.claude/launch.json`).
- Navegador (Chromium embutido): `/demo` (Hoje, Água, Alimentação, Metas, Timeline, Check-in), `/login` e as rotas `/demo/<seção>` (saúde, sono, exercícios, saúde geral, registros, histórico, tênis, financeiro, investimentos, minhas informações, viagens) inspecionadas em 1440×900 e 375×812, modos claro e escuro, sem erros de console.
- Revisão adversarial por área (Hoje, formulários, saúde, tênis, financeiro, informações pessoais): contraste ≥ 4,5:1 nos rótulos secundários e pílulas de estado, alvos de toque ≥ 44 pt, sem Liquid Glass na camada de conteúdo, sem cores fixas fora dos tokens, sem rolagem horizontal em 375 px, gráficos com cores dos tokens e sem linhas verticais de grade.
- Comportamento preservado: nenhuma server action, schema, texto ou campo de formulário foi alterado; apenas apresentação e estrutura de marcação.

Não verificado: sessão Supabase real (as páginas privadas foram revisadas pelas rotas `/demo/<seção>` com dados fictícios, que respondem 404 em produção), Safari/iOS físico (Liquid Glass usa `backdrop-filter`, `color-mix` e `light-dark`; há fallback sólido para `prefers-reduced-transparency` e navegadores sem suporte).
