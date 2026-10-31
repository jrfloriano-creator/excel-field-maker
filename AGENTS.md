# AGENTS.md — Controle Financeiro ZOOM

Instruções para agentes de IA que trabalharem neste repositório.
Leia antes de editar. Complementa o `README.md`, que é voltado a humanos.

---

## 1. O que é o projeto

Sistema de gestão financeira para pequenos negócios: títulos a receber,
clientes, promissórias, vendas à vista, contas a pagar, relatórios em PDF,
controle de acesso por nível e alertas por WhatsApp.

Roda em **dois alvos a partir do mesmo código**:

| Alvo | Build | Banco |
|---|---|---|
| Desktop nativo | Tauri v2 (Rust) | SQLite (`@tauri-apps/plugin-sql`) |
| PWA no navegador | Vite | IndexedDB (Dexie) |

Essa dualidade é a maior fonte de bug do projeto. Leia a seção 4.1.

---

## 2. Stack (versões reais do `package.json`)

- React 18 + TypeScript 5.8 + Vite 5
- Tailwind CSS 3 + shadcn/ui (primitivas Radix)
- Tauri v2 + `@tauri-apps/plugin-sql`
- Dexie 4 (IndexedDB) para o modo web
- React Hook Form + Zod
- Recharts (gráficos), jsPDF + jsPDF-autotable (PDF)
- Vitest + Testing Library + Playwright
- `vite-plugin-pwa` (Workbox)
- Backend separado: Express 4 + Baileys 6 (WhatsApp) + node-cron

---

## 3. Comandos

**Gerenciador de pacotes: `npm`.** Os arquivos `bun.lock` / `bun.lockb` são
legado e não são atualizados. Não rode `bun install` nem `pnpm install` — isso
reescreve os locks e gera um diff de centenas de milhares de linhas.

```bash
npm run dev            # Vite em http://localhost:8080 (modo web/PWA)
npm run build          # build de produção em dist/
npm run preview        # serve dist/
npm run lint           # ESLint
npm run test           # Vitest (uma execução)
npm run test:watch     # Vitest em watch
npm run typecheck      # tsc no frontend (ver seção 8: falha hoje)
npm run typecheck:node # tsc nos arquivos de config (hoje limpo)
npm run tauri dev      # app desktop com hot-reload
npm run build:sidecar  # empacota backend/ como binário sidecar
npm run tauri build    # instalador nativo — roda build:sidecar antes
```

Cancelar sem confirmação: `npm run tauri build` (leva vários minutos e exige
toolchain Rust), `npm run build:sidecar`.

---

## 4. Arquitetura — os três pontos que mais causam erro

### 4.1 Um único ponto de acesso a dados

`src/lib/database.ts` é o **único** lugar que fala com o banco. Ele detecta o
ambiente e roteia:

```ts
isTauri()        // true no desktop, false no navegador
serialized(fn)   // mutex global: serializa operações de escrita
getTauriDb()     // conexão SQLite em cache, carregada sob demanda
```

Regras:

- **Nunca** importe `dexie` ou `@tauri-apps/plugin-sql` em outro arquivo.
  O import de `plugin-sql` é dinâmico de propósito, para não quebrar o bundle web.
- Toda nova entidade precisa existir **nos dois caminhos**: schema Dexie
  (`this.version(n).stores({...})`) e DDL/migração SQLite.
- Escritas devem passar por `serialized()` para não intercalar.

Se você adicionar um campo e testar só no navegador, o desktop quebra — e
vice-versa. Valide nos dois.

### 4.2 O backend WhatsApp é um processo separado

`backend/` é um pacote Node independente, com `package.json` e lock próprios.

- Express na porta `3001` (`process.env.PORT`)
- Autenticação: header `Authorization: Bearer <token>`
- Token: `WHATSAPP_API_TOKEN` do env, ou gerado com `crypto.randomBytes`
- CORS restrito a `tauri://localhost`, `localhost:8080`, `localhost:1420`
- Sessão do WhatsApp (Baileys) persistida em `backend/auth_info/`
- No desktop é empacotado como sidecar: `externalBin: binaries/backend-node`,
  `resources: resources/backend/`. O token chega ao frontend pelo comando
  Rust `get_api_token` (`src-tauri/src/main.rs`).
- O frontend o alcança via `VITE_WHATSAPP_BACKEND_URL` (raiz `.env`).

Mexer no backend exige rebuild do sidecar (`npm run build:sidecar`) para
refletir no app desktop. No modo web, rode `cd backend && npm run dev`.

### 4.3 Dois projetos npm

```
/                 → app React/Tauri (npm)
/backend          → servidor WhatsApp (npm, separado)
```

Cada um tem seu `node_modules` e seu lock. `npm install` na raiz não instala
o backend.

### 4.4 Abertura de links externos

`src/lib/openUrl.ts` é o **único** caminho para abrir URL externa. Não chame
`window.open` nem `invoke` direto em outros arquivos.

```ts
openExternalUrl(url)
// Tauri: invoke('open_external_url') → opener do sistema
// web:   cai no fallback

openExternalUrl(url, { forcarBrowser: true })
// ignora o invoke e força window.open → usado nos envios de WhatsApp Web
```

Dois comportamentos que existem por bug real e **não devem ser removidos**:

- **Guarda anti-loop:** a mesma URL não reabre em menos de 3 s (`podeAbrir`).
  Sem ela, o app abria abas infinitas.
- **Fallback em cascata:** se `window.open` retorna `null` (bloqueador de popup),
  cria um `<a target="_blank">` temporário e clica.

Histórico — este trecho já foi invertido duas vezes, com conclusões opostas:

| Sintoma observado | Conclusão aplicada |
|---|---|
| `window.open` não abria no WebView do Tauri | passou a usar `invoke` |
| `invoke` falhava no envio de WhatsApp Web | passou a usar `forcarBrowser: true` |

Por isso os envios de WhatsApp passam `forcarBrowser: true`. **Não simplifique
essa lógica** para "usar sempre o mesmo caminho": valide em `npm run dev`
(navegador) **e** `npm run tauri dev` (desktop) antes de mexer. Uma conclusão
tirada testando só um dos alvos já quebrou o outro.

---

## 5. Mapa de pastas

```
src/
  components/       componentes de tela
    ui/             shadcn/ui gerado — evite editar, é regenerável
    modals/         modais de formulário
    contas-pagar/   módulo de contas a pagar
    clientes/       módulo de clientes
    whatsapp/       UI de envio/status do WhatsApp
    impressao/      layout de impressão
  hooks/            hooks de dados (useTitulos, useTituloActions, useFilters...)
  lib/              regra de negócio e infraestrutura
    database.ts     driver dual Tauri/Dexie  ← ver 4.1
    auth.ts         PIN, sessão HMAC, permissões
    calculos.ts     juros, multa, situação
    contas-pagar.ts regras de contas a pagar
    backup.ts       export/import
    promissoria.ts  geração de PDF
    printService.ts impressão, Tauri ↔ navegador
  pages/            Index.tsx (app inteiro) e NotFound.tsx
  test/             setup do Vitest
  types/titulo.ts   todos os tipos de domínio
src-tauri/          Rust: main.rs, tauri.conf.json, capabilities/
backend/            servidor WhatsApp (Express + Baileys)
scripts/            build-backend-sidecar.mjs
docs/               planos e notas
prototype/          protótipo HTML/JS anterior ao React — não é o app
```

---

## 6. Convenções

### Idioma do domínio

O código é em **português**. Mantenha assim — não traduza identificadores.

| Termo | Significado |
|---|---|
| `Titulo` | título a receber (conta a receber) |
| `ContaPagar` | conta a pagar |
| `Credor` | fornecedor/credor de uma conta a pagar |
| `baixa` / `baixar` | liquidar, marcar como recebido/pago |
| `Caderno` | lançamentos livres, fora do fluxo de títulos |
| `Promissória` | nota promissória gerada em PDF |
| `Competência` | mês de referência (`YYYY-MM`) |
| `Situação` | `PENDENTE \| PAGO \| VENCIDO \| CANCELADO` |
| `VendaVista` | venda à vista (alias de `Titulo`) |
| `Maquininha` | terminal de cartão |
| `Proprietário` | dono do título, usado para cor/filtro |

### Aliases legados são intencionais

Os tipos têm pares duplicados que existem para compatibilidade:
`creditorId`/`credorId`, `paidAt`/`dataPagamento`,
`observacao`/`observacoes`, `TituloComCalculo`/`ContaPagarComCalculo`.

**Não remova um lado do par** sem uma migração de dados. Dados antigos gravados
usam os dois formatos.

### Outras

- Alias de import: `@/` → `src/`
- Arquivos são **UTF-8 sem BOM** e contêm acentos. Leia e grave sempre em UTF-8;
  um round-trip em cp1252 corrompe "ção" para "��ǜo".
- `strict: false` e `strictNullChecks: false` no TS — não conte com tipos para
  pegar null/undefined.
- Comentários `// ✅ CORREÇÃO` no código marcam correções de bugs anteriores.
  São histórico, não instrução.

---

## 7. Zonas intocáveis

Não leia, edite, mova nem commite:

| Caminho | Por quê |
|---|---|
| `backend/auth_info/` | credenciais da sessão do WhatsApp |
| `backend/.env` | segredos (SMTP, tokens) |
| `.env` | configuração local |
| `dist/`, `dev-dist/` | saída de build |
| `src-tauri/target/`, `src-tauri/resources/`, `src-tauri/binaries/` | artefatos Rust e sidecar empacotado |
| `node_modules/` (raiz e backend) | dependências |
| `package-lock.json`, `bun.lock`, `bun.lockb` | não regerar sem pedido explícito |
| `src/components/ui/` | shadcn/ui gerado — regenere pelo CLI, não edite à mão |

---

## 8. Dívida conhecida — não tente resolver em massa

Medido no baseline. **Não são tarefas para você "consertar" enquanto faz outra coisa.**

| Item | Estado | O que fazer |
|---|---|---|
| `npm run typecheck` | **478 erros** em `src` | ver regra abaixo |
| `npm run lint` | **111 erros**, 12 avisos | não aumente o número |
| Testes | 1 arquivo placeholder para 146 fontes | escreva teste ao tocar lógica de `lib/` |
| `npm run build` | **não verifica tipos** (Vite/esbuild remove sem checar) | rode `typecheck` à parte |

Sobre os 478 erros de tipo: **368 são `TS2339`** — campo usado no código mas
ausente na interface. Os tipos em `src/types/titulo.ts` estão atrás do código
real (o app funciona; a tipagem é que está incompleta). Concentração:
`VendasTab.tsx` (89), `ConfigPanel.tsx` (72), `Relatorios.tsx` (57),
`TituloCard.tsx` (47), `pages/Index.tsx` (23).

**Regra:** não introduza erros novos e, ao editar um arquivo, corrija os dele.
Não faça "limpeza" global, não troque tipos por `any` para zerar o contador, e
não torne campos opcionais em massa — isso esconde bugs reais.

---

## 9. Como trabalhar aqui

1. **Mudança pequena e cirúrgica.** Não reformate arquivo inteiro, não reordene
   imports em massa, não troque aspas. O diff deve mostrar só a sua intenção.
2. **Não commite nem faça push sem pedido explícito.** Não use `git add -A`
   sem antes revisar `git status`.
3. **Mexeu em dados? Valide nos dois alvos** — `npm run dev` (navegador) e
   `npm run tauri dev` (desktop).
4. **Não adicione dependência** sem justificar e sem perguntar. `npm install`
   altera o lock.
5. **Antes de concluir**, rode: `npm run build`, `npm run test`,
   `npm run typecheck` (compare o total com 478, não espere zero).
6. **Relate o que não deu para verificar.** Se não rodou o app desktop, diga.

---

## 10. Segurança do produto

- Autenticação por PIN com hash SHA-256; sessão assinada com HMAC-SHA-256 via
  `crypto.subtle`.
- Permissões granulares por ação (`Permissao` em `src/types/titulo.ts`),
  níveis `USUARIO` / `GERENCIAL` / `MASTER`.
- Log de auditoria em toda ação crítica.
- A API do backend é protegida por Bearer token; não enfraqueça o
  `authMiddleware` nem amplie a lista `allowedOrigins` sem pedido.
- Nunca logue token completo — o código já loga apenas os 8 primeiros caracteres.

---

## 11. Versão

Canônica: `package.json` e `src-tauri/tauri.conf.json` (hoje `2.10.0`).
Mensagens de commit antigas e o `CHANGELOG.md` podem estar defasados.
