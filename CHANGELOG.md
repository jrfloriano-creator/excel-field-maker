# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### Em desenvolvimento
- Sincronização de dados entre dispositivos (backend opcional)
- Notificações de vencimento via sistema operacional (Tauri notifications plugin)

---

## [1.0.0] — 2025-05

### Adicionado
- Versão inicial estável do **Controle Financeiro ZOOM**
- Suporte completo a desktop nativo via **Tauri v2** (Windows, macOS, Linux)
- Suporte a **PWA** instalável no navegador (IndexedDB via Dexie)
- Módulo de **Títulos a receber** com cálculo automático de juros e situação (No Prazo / Vencido / Pago)
- Módulo de **Clientes** com cadastro completo (nome, telefone, e-mail, endereço, CPF/CNPJ)
- Módulo de **Promissórias** com geração de PDF (jsPDF)
- Módulo de **Vendas à vista** com suporte a formas de pagamento, maquininhas e parcelas
- **Dashboard** com gráficos de recebimentos e pendências (Recharts)
- **Relatórios** exportáveis em PDF com jsPDF-autotable
- **Módulo Caderno** para lançamentos livres

---

## Histórico de mudanças relevantes

### Migração para Tauri v2

**Contexto:** O projeto foi migrado de Tauri v1 para **Tauri v2**, trazendo mudanças significativas na API, no sistema de plugins e na configuração.

**Principais alterações:**

- Substituído `@tauri-apps/api` v1 por `@tauri-apps/api` v2 (`^2.2.0`)
- Substituído `tauri-plugin-sql` v1 por `@tauri-apps/plugin-sql` v2 (`~2.0.0`)
- Atualizado `@tauri-apps/cli` para v2 (`^2.2.0`)
- Atualizado `src-tauri/Cargo.toml`:
  - `tauri = { version = "2" }`
  - `tauri-plugin-sql = { version = "2", features = ["sqlite"] }`
  - `tauri-build = { version = "2" }`
- Atualizado `src-tauri/tauri.conf.json` para o schema v2 (`"$schema": "https://schema.tauri.app/config/2"`)
- Reestruturada a seção `plugins.sql.preload` para criação automática das tabelas (`kv`, `titulos`, `usuarios`, `logs`) no `tauri.conf.json`
- Removida a dependência `tauri-plugin-sql-api` (pacote legado v1)
- Atualizado `src-tauri/src/main.rs` para registrar o plugin SQL com a nova API de plugins do Tauri v2

---

### Segurança — Sessão com HMAC-SHA-256

**Contexto:** O sistema de sessão foi refatorado para impedir adulteração dos dados de usuário armazenados no `sessionStorage`.

**Mudanças em `src/lib/auth.ts`:**

- Introduzida assinatura HMAC-SHA-256 do payload de sessão usando `crypto.subtle.sign`
- Na leitura (`getSession`), a assinatura é verificada com `crypto.subtle.verify` antes de confiar nos dados
- Se a verificação falhar, a sessão é invalidada e o usuário é deslogado automaticamente
- Substituída chave de sessão de `app_session_user` para `app_session_user_v2` para forçar re-autenticação após a atualização

**Impacto:** Proteção contra ataques de manipulação de `sessionStorage` em ambiente web/PWA.

---

### Refatoração — Driver de banco de dados unificado

**Contexto:** A lógica de acesso a dados estava dispersa entre componentes. Foi centralizada em um driver único.

**Mudanças em `src/lib/database.ts`:**

- Criado objeto `dbDriver` com interface unificada para todos os ambientes
- Detecção automática de ambiente: `isTauri()` roteia para SQLite (Tauri), caso contrário usa Dexie (IndexedDB)
- Operações padronizadas: `init()`, `getTitulos()`, `saveTitulo()`, `deleteTitulo()`, `getConfig()`, `saveConfig()`, `getUsuarios()`, `saveUsuario()`
- No modo Tauri: dados são serializados como JSON e armazenados em colunas `TEXT` do SQLite (coluna `data`)
- No modo Web: dados são armazenados diretamente nas stores do Dexie (`FinanceiroDatabase`)
- Eliminado acesso direto à API Tauri SQL e ao Dexie fora de `database.ts`

---

### Refatoração — Controle de acesso granular

**Contexto:** O sistema de permissões foi expandido de um controle binário (admin/não-admin) para uma matriz granular por nível e por ação.

**Mudanças em `src/types/titulo.ts` e `src/lib/auth.ts`:**

- Definido tipo `NivelUsuario`: `'USUARIO' | 'GERENCIAL' | 'MASTER'`
- Definido tipo `Permissao` com 24 permissões granulares cobrindo títulos, clientes, promissórias, dashboard, relatórios e configurações
- Criado `PERMISSAO_LABELS` para exibição humana de cada permissão
- Implementada função `hasPerm(config, user, perm)` para verificação de permissão em runtime
- Implementada `defaultPermissoes()` com configuração padrão por nível
- Adicionado `PermissoesPorNivel` na interface `AppConfig` permitindo personalização via painel de configurações

---

### Adicionado — Log de Auditoria

**Contexto:** Necessidade de rastrear ações críticas realizadas por usuários.

**Mudanças:**

- Definido tipo `LogTipo` com eventos de login/logout, CRUD de títulos, clientes e vendas, e alertas WhatsApp
- Criada interface `LogEntry` com campos: `id`, `data` (ISO), `usuario`, `tipo`, `descricao`, `metadata`
- Implementada função `appendLog` em `src/lib/auth.ts` para registrar entradas no log (máximo de 5.000 entradas)
- Adicionado campo `logs` na interface `AppConfig`
- Criado componente `LogPanel.tsx` para visualização do histórico de auditoria

---

### Adicionado — Módulo de Vendas à Vista

**Contexto:** Solicitação de funcionalidade para registro de vendas sem crediário.

**Mudanças:**

- Criada interface `VendaVista` em `src/types/titulo.ts` com campos: valor, desconto (valor ou %), forma de pagamento, parcelas, maquininha, operador
- Adicionado campo `vendas` na `AppConfig`
- Criado componente `VendasTab.tsx`
- Integração com `MaquininhasManager` e `FormaPagamento`

---

### Adicionado — Gerenciadores de configuração

Novos componentes adicionados ao painel de configurações:

- `ProprietariosManager.tsx` — gestão de proprietários com cor personalizada por título
- `MaquininhasManager.tsx` — cadastro de maquininhas/operadoras de cartão
- `MotivosManager.tsx` — motivos de alteração de títulos
- `FuncionariosManager.tsx` — funcionários autorizados
- `UsuariosManager.tsx` — gerenciamento de usuários e níveis de acesso
- `LogoPanel.tsx` — upload de logo da empresa (base64)
- `EmailPanel.tsx` — configuração de e-mail de cobrança via Gmail

---

[Não lançado]: https://github.com/seu-usuario/excel-field-maker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/seu-usuario/excel-field-maker/releases/tag/v1.0.0
