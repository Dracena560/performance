# Design system — Apple HIG + Liquid Glass

Este documento descreve o sistema visual do aplicativo, construído a partir das
Human Interface Guidelines da Apple (developer.apple.com/design). Ele é a
referência para qualquer tela nova: use os tokens e os componentes daqui em vez
de inventar cores, raios ou tamanhos.

## Princípios

1. **Conteúdo primeiro.** Controles e navegação ficam numa camada funcional de
   Liquid Glass que flutua sobre o conteúdo. O conteúdo em si usa materiais
   padrão (fundos agrupados, cartões opacos, separadores finos).
2. **Liquid Glass só na camada de navegação e controles.** Sidebar, barra de
   abas, barra de ferramentas, botão flutuante, folhas (sheets), toasts e
   botões de destaque. Nunca em cartões de conteúdo, linhas de lista ou fundos
   de página. Nunca vidro sobre vidro.
3. **Hierarquia tipográfica, não decoração.** SF Pro (via `-apple-system`),
   escala Dynamic Type, pesos Regular/Semibold/Bold. Cor de destaque apenas em
   ações e estados; rótulos em cinza semântico.
4. **Adaptável.** Light e Dark Mode pelo sistema (`prefers-color-scheme`),
   Reduce Transparency, Increase Contrast e Reduce Motion respeitados.
5. **Toque confortável.** Alvos de 44×44 pt, cantos concêntricos, espaçamento em
   múltiplos de 4 pt.

## Tokens (`app/styles/tokens.css`)

### Cores do sistema (iOS)

| Nome | Light | Dark |
|---|---|---|
| red | `#FF3B30` | `#FF453A` |
| orange | `#FF9500` | `#FF9F0A` |
| yellow | `#FFCC00` | `#FFD60A` |
| green | `#34C759` | `#30D158` |
| mint | `#00C7BE` | `#63E6E2` |
| teal | `#30B0C7` | `#40CBE0` |
| cyan | `#32ADE6` | `#64D2FF` |
| blue | `#007AFF` | `#0A84FF` |
| accent (ações) | `#0071E3` (4,5:1 com branco) | `#0A84FF` |
| indigo | `#5856D6` | `#5E5CE6` |
| purple | `#AF52DE` | `#BF5AF2` |
| pink | `#FF2D55` | `#FF375F` |
| brown | `#A2845E` | `#AC8E68` |
| gray … gray6 | `#8E8E93 … #F2F2F7` | `#8E8E93 … #1C1C1E` |

### Cores semânticas

- Rótulos: `--label`, `--label-2`, `--label-3`, `--label-4` (primário → quaternário). `--label-2` fica em 72% no modo claro para manter 4,5:1 sobre fundos agrupados.
- Texto de estado com contraste garantido: `--success-text`, `--warning-text`, `--danger-text` (escurecidos no modo claro, cor do sistema no escuro).
- Preenchimentos: `--fill`, `--fill-2`, `--fill-3`, `--fill-4`.
- Separadores: `--separator`, `--separator-opaque`.
- Fundos agrupados: `--bg` (página), `--bg-2` (cartão), `--bg-3` (cartão dentro de cartão).
- Dark Mode usa fundos *elevated* para folhas e diálogos (`--bg-elevated`).

### Tintas por domínio

| Domínio | Token | Cor |
|---|---|---|
| Hidratação | `--tint-water` | cyan |
| Nutrição | `--tint-nutrition` | green |
| Fitness / exercício | `--tint-fitness` | orange (calorias: red) |
| Sono | `--tint-sleep` | indigo |
| Bem-estar / check-in | `--tint-mind` | teal |
| Saúde geral | `--tint-health` | pink |
| Financeiro | `--tint-finance` | mint |
| Investimentos | `--tint-invest` | purple |
| Tênis | `--tint-tennis` | green |
| Minhas informações | `--tint-personal` | blue |

Use a tinta em ícones, barras de progresso e um único botão proeminente por
tela. Texto corrido e títulos continuam em `--label`.

### Tipografia (Dynamic Type, tamanho Large)

| Estilo | Classe | Tamanho/entrelinha | Peso |
|---|---|---|---|
| Large Title | `.t-large-title` / `h1` | 34/41 | 700 |
| Title 1 | `.t-title1` | 28/34 | 700 |
| Title 2 | `.t-title2` / `h2` | 22/28 | 700 |
| Title 3 | `.t-title3` / `h3` | 20/25 | 600 |
| Headline | `.t-headline` | 17/22 | 600 |
| Body | `body` | 17/22 | 400 |
| Callout | `.t-callout` | 16/21 | 400 |
| Subheadline | `.t-subhead` | 15/20 | 400 |
| Footnote | `.t-footnote` / `.field-help` | 13/18 | 400 |
| Caption 1 | `.t-caption` / `small` | 12/16 | 400 |
| Caption 2 | `.t-caption2` | 11/13 | 400 |

Números usam `font-variant-numeric: tabular-nums`. Tamanho mínimo: 11 px.

### Forma e espaço

- Raios: `--r-xs 8`, `--r-sm 10`, `--r-md 14`, `--r-lg 20`, `--r-xl 28`,
  cápsula `999px`. Cantos internos concêntricos: raio interno = raio externo −
  preenchimento.
- Espaços: `--s-1 4`, `--s-2 8`, `--s-3 12`, `--s-4 16`, `--s-5 20`, `--s-6 24`,
  `--s-7 32`, `--s-8 44`.
- Alvo mínimo de toque: `--hit 44px`.

## Materiais (`app/styles/glass.css`)

- `.glass` — Liquid Glass *regular*: desfoque + saturação, realce especular,
  borda refrativa e sombra suave. Para sidebar, barras, folhas e toasts.
- `.glass-clear` — variante *clear*, para elementos sobre mídia.
- `.glass-tint` — vidro colorido com a cor de destaque (ação primária).
- `.glass-interactive` — levanta ao passar o mouse e comprime ao pressionar.
- `.scroll-edge` — efeito de borda de rolagem (desfoque gradual) sob barras.

Fallbacks: sem `backdrop-filter`, `prefers-reduced-transparency` e
`prefers-contrast: more` trocam o vidro por superfícies sólidas.

## Componentes

- **Botões** (`.button`): `primary` (preenchido com a cor de destaque, cápsula),
  `secondary` (preenchimento cinza, cápsula), `ghost` (apenas texto na cor de
  destaque), `danger` (vermelho), `glass` (Liquid Glass, só na camada de
  controles). Tamanhos `small` (32), padrão (44), `large` (50). `icon` para
  botões só com símbolo (44×44).
- **Campos**: altura 44, raio 12, preenchimento terciário, foco com anel de
  destaque. Rótulo em Footnote acima do campo.
- **Listas agrupadas** (`.list`): linhas de 44+ pt, separadores recuados,
  chevrons para navegação.
- **Cartões** (`.panel`): fundo `--bg-2`, raio 20, sem vidro.
- **Folhas e diálogos**: Liquid Glass, raio 28; em telas compactas sobem do
  rodapé com alça (grabber).
- **Barra de abas** (compacta): Liquid Glass flutuante, 5 abas, indicador que
  desliza; botão flutuante "+" ao lado para registrar.
- **Sidebar** (regular): painel de Liquid Glass recuado das bordas, com itens
  de 40 pt e seleção em pílula.
- **Toast**: cápsula de vidro centralizada acima da barra de abas.

## Acessibilidade

- Contraste mínimo 4,5:1 (texto) nos dois modos.
- `:focus-visible` com anel de 3 px na cor de destaque.
- `prefers-reduced-motion` desliga transições e animações.
- Cor nunca é o único sinal: estados trazem texto ou ícone.
