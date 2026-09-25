# Verificação da primeira etapa — 25/09/2026

- Compilação de produção Next.js: passou (`npm run build`, webpack).
- TypeScript: passou.
- Testes automatizados: 7 passaram, 0 falharam.
- Migration executada em PostgreSQL/PGlite: criação de perfis e seis modelos por usuário, isolamento RLS entre duas identidades, bloqueio de leitura anônima, bloqueio de escrita cruzada, auditoria de edição/exclusão, volume inválido, data de Londres, snapshot de metas e remoção transacional do rascunho de check-in.
- Domínio: quatro semânticas de metas, escalas e null/zero, horário de verão e meia-noite, nutrientes por porção, desconhecidos preservados, somente água pura na hidratação, validação de tipo e qualidade.
- Navegador: dashboard inicial carregou; +650 ml elevou o total fictício de 1.240 para 1.890 ml e adicionou o evento à timeline.
- Check-in: salvou um único campo com zero e demais campos não informados.
- Alimentação: 200 g do alimento fictício adicionaram 250 kcal e 18 g de proteína; combinação salva apareceu na biblioteca.
- Responsividade: inspeção visual em 390 × 844 e largura normal do navegador; atalhos inferiores e formulário de refeição utilizáveis no tamanho de iPhone.
- Proteção de rota: abrir `/hoje` sem configuração/sessão terminou em `/login`, sem dados pessoais.
- Prévia final voltou aos dados fictícios originais, sem registros de teste adicionais.

Não verificado: sessão Supabase real, persistência entre dispositivos, recuperação de acesso, hospedagem Vercel e restauração de backups. Dependem da criação e configuração das contas externas. Não foram importados dados pessoais nem publicada uma versão na internet.
