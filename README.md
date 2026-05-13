# Controle Financeiro ZOOM

> Sistema de controle financeiro com suporte a desktop nativo (Windows/macOS/Linux) via Tauri v2 e PWA para uso no navegador.

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tech Stack](#tech-stack)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Setup Local](#instalação-e-setup-local)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Build Desktop (.exe via Tauri)](#build-desktop-exe-via-tauri)
- [Deploy da PWA](#deploy-da-pwa)
- [Screenshots](#screenshots)
- [Licença](#licença)

---

## Sobre o Projeto

O **Controle Financeiro ZOOM** é uma aplicação de gestão financeira voltada para pequenos negócios. Permite o controle de títulos a receber, cadastro de clientes, emissão de notas promissórias, registro de vendas à vista, geração de relatórios em PDF e configuração detalhada de permissões por nível de usuário.

O app funciona tanto como **aplicativo desktop nativo** (via Tauri v2 + SQLite) quanto como **PWA** instalável no navegador (via Dexie/IndexedDB), sem necessidade de servidor externo.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Títulos** | Cadastro, edição, pagamento e baixa de títulos a receber com cálculo automático de juros e situação (no prazo / vencido / pago) |
| **Clientes** | Gestão completa de clientes com dados de contato, endereço e CPF/CNPJ |
| **Promissórias** | Geração e impressão de notas promissórias em PDF com dados do credor |
| **Vendas** | Registro de vendas à vista com suporte a formas de pagamento e maquininhas |
| **Dashboard** | Visão consolidada com gráficos (Recharts) de recebimentos e pendências |
| **Relatórios** | Exportação de relatórios em PDF (jsPDF + jsPDF-autotable) |
| **Caderno** | Lançamentos livres no estilo caderno |
| **Controle de Acesso** | Três níveis de usuário (MASTER, GERENCIAL, USUARIO) com matriz de permissões granular |
| **Backup** | Export/import manual dos dados |
| **Configurações** | Taxa de juros, chaves PIX, formas de pagamento, maquininhas, e-mail de cobrança, dark mode, logo da empresa |
| **Log de Auditoria** | Registro automático de todas as ações críticas por usuário |
| **Alertas WhatsApp** | Configuração de telefones para alertas de cobrança |

### Segurança

- Autenticação via PIN com hash (SHA-256)
- Sessão assinada com HMAC-SHA-256 via `crypto.subtle` (Web Crypto API)
- Controle de acesso por permissão granular por ação

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| Build | [Vite 5](https://vitejs.dev/) |
| Estilização | [Tailwind CSS 3](https://tailwindcss.com/) |
| Componentes UI | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Desktop nativo | [Tauri v2](https://tauri.app/) (Rust) |
| Banco (desktop) | SQLite via `@tauri-apps/plugin-sql` |
| Banco (web/PWA) | [Dexie](https://dexie.org/) (IndexedDB) |
| Gráficos | [Recharts](https://recharts.org/) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-autotable |
| Formulários | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Ícones | [Lucide React](https://lucide.dev/) |
| PWA | Vite PWA Plugin + Web App Manifest |
| Testes | [Vitest](https://vitest.dev/) + Testing Library + Playwright (e2e) |

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** >= 18 ([nodejs.org](https://nodejs.org/))
- **npm** >= 9 (incluído com Node.js)
- **Rust** (somente para build desktop via Tauri): [rustup.rs](https://rustup.rs/)

> Para verificar: `node -v`, `npm -v`, `rustc --version`

### Dependências do sistema para Tauri (Windows)

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ou Visual Studio com workload "Desenvolvimento para Desktop com C++"
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (já incluso no Windows 10/11)

---

## Instalação e Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/excel-field-maker.git
cd excel-field-maker

# 2. Instale as dependências Node.js
npm install

# 3. Inicie o servidor de desenvolvimento (modo web/PWA)
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`.

> **Login inicial:** usuário `MASTER`, PIN `1111`.  
> Altere o PIN imediatamente após o primeiro acesso em **Config > Usuários**.

---

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento Vite (web/PWA) |
| `npm run build` | Gera o build de produção na pasta `dist/` |
| `npm run build:dev` | Gera build em modo desenvolvimento |
| `npm run preview` | Serve localmente o build de produção |
| `npm run lint` | Executa o ESLint |
| `npm run test` | Executa os testes com Vitest (modo CI) |
| `npm run test:watch` | Executa os testes em modo watch |
| `npm run tauri` | Acesso direto à CLI do Tauri |
| `npm run tauri dev` | Inicia o app Tauri em modo desenvolvimento (abre janela nativa) |
| `npm run tauri build` | Gera instalador nativo (`.exe`, `.msi`, `.dmg`, etc.) |

---

## Estrutura de Pastas

```
excel-field-maker/
├── public/                  # Assets estáticos e manifest.json (PWA)
├── src/
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── modals/          # Modais (TituloFormModal, PagarFormModal, etc.)
│   │   └── ui/              # Componentes shadcn/ui gerados
│   ├── hooks/               # Custom hooks (useTitulos, useFilters, useTituloActions)
│   ├── lib/                 # Lógica de negócio e utilitários
│   │   ├── auth.ts          # Autenticação, sessão HMAC, permissões
│   │   ├── backup.ts        # Export/import de dados
│   │   ├── calculos.ts      # Cálculo de juros e situação de títulos
│   │   ├── database.ts      # Driver de dados (Tauri/SQLite ↔ Dexie/IndexedDB)
│   │   ├── email.ts         # Envio de e-mail de cobrança (Gmail)
│   │   ├── promissoria.ts   # Geração de nota promissória em PDF
│   │   └── storage.ts       # Utilitários de persistência e hashing
│   ├── pages/               # Páginas da aplicação (Index.tsx, NotFound.tsx)
│   ├── test/                # Configuração e testes unitários
│   ├── types/               # Interfaces TypeScript (titulo.ts, etc.)
│   ├── App.tsx              # Roteamento principal
│   └── main.tsx             # Entry point React
├── src-tauri/               # Backend Tauri (Rust)
│   ├── src/main.rs          # Entry point Rust / Tauri
│   ├── Cargo.toml           # Dependências Rust
│   └── tauri.conf.json      # Configuração do app Tauri
├── vite.config.ts           # Configuração do Vite
├── tailwind.config.ts       # Configuração do Tailwind CSS
├── tsconfig.json            # Configuração do TypeScript
└── package.json             # Dependências e scripts Node.js
```

---

## Build Desktop (.exe via Tauri)

### Pré-requisitos adicionais

Certifique-se de ter o Rust e as dependências do sistema instaladas (ver [Pré-requisitos](#pré-requisitos)).

### Gerar o instalador

```bash
# Instalar a CLI do Tauri (se não estiver disponível globalmente)
npm install -g @tauri-apps/cli

# Gerar o build de produção + instalador nativo
npm run tauri build
```

Os artefatos gerados estarão em:

```
src-tauri/target/release/bundle/
├── msi/          # Instalador .msi (Windows)
├── nsis/         # Instalador .exe (Windows)
├── deb/          # Pacote .deb (Linux)
├── appimage/     # AppImage (Linux)
└── macos/        # .app / .dmg (macOS)
```

> O banco de dados SQLite (`financeiro.sqlite`) é armazenado no diretório de dados do app definido pelo sistema operacional (ex.: `%APPDATA%\com.financeiro.app\` no Windows).

### Modo desenvolvimento desktop

```bash
npm run tauri dev
```

Isso abre a janela nativa conectada ao servidor Vite em hot-reload.

---

## Deploy da PWA

O app é compatível com PWA e pode ser hospedado em qualquer serviço de hosting estático.

### Build

```bash
npm run build
# Os arquivos ficam em dist/
```

### Opções de deploy

**Netlify (recomendado)**
```bash
# Via CLI
npx netlify-cli deploy --prod --dir=dist
```

**Vercel**
```bash
npx vercel --prod
```

**GitHub Pages**

Configure o `vite.config.ts` com `base: '/nome-do-repositorio/'` e use `gh-pages`:
```bash
npm install -D gh-pages
npx gh-pages -d dist
```

**Servidor próprio (nginx)**

Copie o conteúdo de `dist/` para o diretório público do nginx e configure o fallback para `index.html`:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

> **Atenção:** No modo PWA (navegador), os dados são armazenados no IndexedDB do dispositivo. Não há sincronização entre dispositivos sem implementação adicional de backend.

---

## Screenshots

> _Screenshots serão adicionados em breve._

| Tela | Descrição |
|---|---|
| ![Login](docs/screenshots/login.png) | Tela de login com PIN |
| ![Títulos](docs/screenshots/titulos.png) | Lista de títulos com filtros |
| ![Dashboard](docs/screenshots/dashboard.png) | Dashboard com gráficos |
| ![Promissória](docs/screenshots/promissoria.png) | Geração de nota promissória |
| ![Config](docs/screenshots/config.png) | Painel de configurações |

---

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais informações.

---

<p align="center">
  Desenvolvido com React, Tauri e muito cafe ☕
</p>
