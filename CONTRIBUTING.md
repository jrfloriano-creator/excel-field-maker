# Guia de Contribuição

Obrigado pelo interesse em contribuir com o **Controle Financeiro ZOOM**!  
Leia este guia antes de abrir issues ou pull requests.

---

## Sumário

- [Código de Conduta](#código-de-conduta)
- [Como Reportar Bugs](#como-reportar-bugs)
- [Como Sugerir Melhorias](#como-sugerir-melhorias)
- [Setup do Ambiente de Desenvolvimento](#setup-do-ambiente-de-desenvolvimento)
- [Fluxo de Trabalho com Git](#fluxo-de-trabalho-com-git)
- [Convenções de Código](#convenções-de-código)
- [Testes](#testes)
- [Commits](#commits)
- [Pull Requests](#pull-requests)
- [Estrutura de Decisões](#estrutura-de-decisões)

---

## Código de Conduta

Este projeto adota um ambiente colaborativo e respeitoso. Espera-se que todos os contribuidores:

- Usem linguagem inclusiva e acolhedora
- Aceitem críticas construtivas com abertura
- Foquem no melhor resultado para o projeto e seus usuários
- Evitem comportamentos discriminatórios ou assédio de qualquer natureza

---

## Como Reportar Bugs

Antes de abrir uma issue:

1. Verifique se o bug já foi reportado nas [issues existentes](../../issues).
2. Reproduza o problema em um ambiente limpo.

Ao abrir a issue, inclua:

- **Descrição clara** do problema
- **Passos para reproduzir** (numerados)
- **Comportamento esperado** vs. **comportamento atual**
- **Ambiente**: SO, versão do Node.js, se é desktop (Tauri) ou web (PWA)
- **Logs** relevantes do console ou do terminal
- **Screenshots** se aplicável

---

## Como Sugerir Melhorias

1. Abra uma issue com o label `enhancement`.
2. Descreva o problema que a melhoria resolve, não apenas a solução.
3. Apresente casos de uso concretos.
4. Aguarde discussão antes de implementar funcionalidades grandes.

---

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos

- **Node.js** >= 18
- **npm** >= 9
- **Rust** (para desenvolvimento desktop com Tauri): [rustup.rs](https://rustup.rs/)
- **Git**

### Instalação

```bash
# 1. Fork o repositório e clone o seu fork
git clone https://github.com/SEU_USUARIO/excel-field-maker.git
cd excel-field-maker

# 2. Adicione o upstream
git remote add upstream https://github.com/REPOSITORIO_ORIGINAL/excel-field-maker.git

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento web
npm run dev

# 5. (Opcional) Inicie o app desktop
npm run tauri dev
```

---

## Fluxo de Trabalho com Git

Usamos um fluxo baseado em **feature branches**:

```
main          → branch principal, sempre estável
└── feat/     → novas funcionalidades (feat/nome-da-feature)
└── fix/      → correções de bugs (fix/descricao-do-bug)
└── chore/    → manutenção, refatoração, deps (chore/descricao)
└── docs/     → documentação (docs/descricao)
```

### Passo a passo

```bash
# 1. Atualize o main local
git checkout main
git pull upstream main

# 2. Crie sua branch
git checkout -b feat/minha-feature

# 3. Faça suas alterações e commits (ver Commits abaixo)

# 4. Atualize com o upstream antes de abrir PR
git fetch upstream
git rebase upstream/main

# 5. Push e abra o Pull Request
git push origin feat/minha-feature
```

---

## Convenções de Código

### Geral

- **TypeScript strict** — sem `any` explícito sem justificativa
- **Componentes React** em PascalCase: `TituloCard.tsx`
- **Hooks** prefixados com `use`: `useTitulos.ts`
- **Utilitários e lib** em camelCase: `calculos.ts`
- **Interfaces e tipos** em PascalCase: `Titulo`, `AppConfig`
- **Constantes** em UPPER_SNAKE_CASE: `ALL_PERMISSOES`

### Componentes

- Prefira componentes funcionais com hooks
- Use `shadcn/ui` para novos componentes de UI — evite criar do zero o que já existe na biblioteca
- Estilize exclusivamente com Tailwind CSS — sem CSS modules ou styled-components
- Separe lógica de negócio em `src/lib/` e hooks em `src/hooks/`; mantenha componentes focados em apresentação

### Database / Driver

- Qualquer acesso a dados deve passar pelo `dbDriver` em `src/lib/database.ts`
- O driver deve funcionar em ambos os ambientes (Tauri/SQLite e Web/Dexie)
- Nunca acesse o Dexie ou a API Tauri SQL diretamente nos componentes

### Segurança

- Não commite segredos, tokens ou chaves de API
- Operações sensíveis de autenticação devem usar `crypto.subtle` (Web Crypto API)
- Alterações no sistema de permissões (`src/lib/auth.ts`) exigem revisão cuidadosa

### Linting

O projeto usa ESLint com as regras de `typescript-eslint`. Execute antes de commitar:

```bash
npm run lint
```

---

## Testes

### Executar testes

```bash
# Testes unitários (Vitest)
npm run test

# Modo watch
npm run test:watch
```

### Escrever testes

- Os testes ficam em `src/test/` ou ao lado do arquivo testado com sufixo `.test.ts`
- Use `@testing-library/react` para testes de componentes
- Cubra funções de `src/lib/` com testes unitários
- Para lógica crítica (auth, cálculos de juros), testes são obrigatórios em PRs

---

## Commits

Adotamos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição curta em minúsculas>

[corpo opcional]

[rodapé opcional]
```

### Tipos aceitos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `chore` | Atualização de deps, configurações, manutenção |
| `docs` | Alterações somente em documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição ou correção de testes |
| `perf` | Melhoria de performance |
| `style` | Formatação, espaços, ponto-e-vírgula (sem mudança de lógica) |

### Exemplos

```
feat(titulos): adicionar filtro por proprietário na listagem
fix(auth): corrigir validação de sessão expirada no modo PWA
chore(deps): atualizar tauri para v2.2.0
docs: adicionar instruções de build no README
```

---

## Pull Requests

Antes de abrir um PR:

- [ ] `npm run lint` passa sem erros
- [ ] `npm run test` passa sem falhas
- [ ] O PR está baseado no `main` atualizado
- [ ] A descrição explica **o quê** foi feito e **por quê**
- [ ] Breaking changes estão documentados
- [ ] Funcionalidades novas têm testes cobrindo os casos principais

### Template de descrição

```markdown
## O que foi feito
Descrição clara das mudanças.

## Motivação
Por que essa mudança é necessária?

## Tipo de mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Testes
Descreva como testar as mudanças.

## Screenshots (se aplicável)
```

---

## Estrutura de Decisões

Ao tomar decisões de arquitetura relevantes em um PR, documente-as brevemente no corpo do PR ou em um comentário:

- **Opção escolhida** e **por quê**
- **Alternativas consideradas** e **por que foram descartadas**
- **Trade-offs** conscientes

---

Dúvidas? Abra uma [discussion](../../discussions) ou entre em contato via issue.
