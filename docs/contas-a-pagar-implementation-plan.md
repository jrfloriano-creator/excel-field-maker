# Plano de Implementação — Módulo Contas a Pagar

## Resumo executivo

O código atual é uma aplicação React/TypeScript de página única, centrada no domínio de `Títulos a Receber`, com estado principal carregado por `useTitulos`, persistência via `dbDriver`, autenticação por sessão em `src/lib/auth.ts` e navegação por abas em `src/pages/Index.tsx`.  
O novo módulo `Contas a Pagar` deve seguir esse mesmo padrão estrutural, mas com **persistência separada**, **controle de acesso exclusivo para MASTER**, **fluxo próprio de baixa/reversão** e **dashboard comparativo entre receitas e pagamentos**.

## Consenso arquitetural

- **Base de referência:** espelhar `Títulos` em vez de criar um subsistema paralelo.
- **Persistência:** coleção/chave própria para contas a pagar, sem misturar com `financeiro_titulos`.
- **Acesso:** menu e conteúdo visíveis apenas para `MASTER`.
- **Dashboard:** reutilizar a abordagem do `DashboardChart`, mas separar claramente:
  - receitas = `Títulos`/`vendas` já existentes
  - pagamentos = novo módulo `Contas a Pagar`
- **Configuração:** reaproveitar `AppConfig` para catálogos e parâmetros, adicionando novos blocos específicos.

---

## 1. Estado atual do sistema e implicações

### 1.1 Navegação e composição da aplicação

O shell principal está em `src/pages/Index.tsx`, onde:

- a aplicação usa uma única rota `/` em `src/App.tsx`
- a navegação interna é controlada por `tab` local
- as telas atuais são:
  - `lista`
  - `dashboard`
  - `relatorios`
  - `clientes`
  - `promissoria`
  - `vendas`
  - `config`
  - `aniversariantes`

**Implicação:** `Contas a Pagar` deve entrar primeiro como **nova aba interna**, não como rota separada, para manter consistência com a arquitetura atual.

### 1.2 Fonte principal de dados

O hook `src/hooks/useTitulos.ts` concentra:

- carregamento inicial de `titulos` e `config`
- CRUD de títulos
- atualização de configuração

**Implicação:** o módulo novo deve nascer com um hook paralelo, por exemplo:

- `useContasPagar`

com responsabilidades equivalentes:

- carregar contas a pagar
- salvar contas a pagar
- atualizar configurações relacionadas

### 1.3 Persistência

Em `src/lib/storage.ts`:

- `getTitulos()` e `saveTitulos()` usam `dbDriver`
- `getConfig()` e `saveConfig()` usam KV + tabelas dedicadas para usuários/logs
- existe migração legada de `localStorage`

**Implicação:** o módulo novo deve:

- criar funções dedicadas, como:
  - `getContasPagar()`
  - `saveContasPagar()`
- usar tabela/namespace próprio no `dbDriver`
- opcionalmente participar do backup/import futuramente

### 1.4 Permissões e sessão

Em `src/lib/auth.ts`:

- `hasPerm()` concede tudo para `MASTER`
- demais níveis dependem de `config.permissoes`

Em `src/types/titulo.ts`:

- `NivelUsuario = 'USUARIO' | 'GERENCIAL' | 'MASTER'`

**Implicação:** como a regra pedida é “somente MASTER vê o botão no menu”, o controle pode ser feito em duas camadas:

1. **UI:** esconder item da sidebar para não-MASTER  
2. **Tela:** bloquear renderização/seleção da aba se `user.nivel !== 'MASTER'`

Não é obrigatório criar nova permissão granular se o acesso for estritamente MASTER-only.

---

## 2. Modelo de domínio proposto

## 2.1 Entidade principal

Criar uma nova entidade, preferencialmente em arquivo próprio, por exemplo:

- `src/types/contas-pagar.ts`

### Estrutura sugerida

```ts
export interface ContaPagar {
  id: string;
  numero: number;
  tipo: string;
  credor: string;
  credorId?: string;
  valor: number;
  dataEmissao?: string;
  dataVencimento: string;
  dataPagamento?: string;
  valorPago?: number;
  grupoDespesa?: string;
  subitemDespesa?: string;
  observacao?: string;
  motivoReversao?: string;
  dataReversao?: string;
  revertidoPor?: string;
}
```

### Estado derivado

Criar equivalente a `TituloComCalculo`, por exemplo:

```ts
export type SituacaoContaPagar = 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export interface ContaPagarComCalculo extends ContaPagar {
  diasAVencer: number;
  situacao: SituacaoContaPagar;
}
```

### Justificativa

- mantém o padrão mental já usado em `Títulos`
- facilita filtros, badges, ordenação e dashboard
- reduz custo de implementação porque vários componentes podem ser adaptados

## 2.2 Catálogos auxiliares

Adicionar ao `AppConfig` estruturas específicas para o novo módulo:

```ts
export interface TipoContaPagarConfig {
  id: string;
  nome: string;
}

export interface GrupoDespesaConfig {
  id: string;
  nome: string;
  subitens: {
    id: string;
    nome: string;
  }[];
}
```

Campos sugeridos em `AppConfig`:

- `tiposContaPagar?: TipoContaPagarConfig[]`
- `gruposDespesas?: GrupoDespesaConfig[]`

### Regra de composição dos tipos

Lista final de tipos no formulário:

- fixos:
  - `Boleto`
  - `Cheque`
  - `Cartão`
- mais os tipos cadastrados em `Config`

### Decisão

Não reutilizar `formasPagamento` como “tipo da conta”, porque no sistema atual esse campo representa **forma de recebimento/pagamento operacional**, não natureza do título.

---

## 3. Persistência e camada de dados

## 3.1 Storage API

Expandir `src/lib/storage.ts` com funções paralelas às de títulos:

- `getContasPagar(): Promise<ContaPagar[]>`
- `saveContasPagar(contas: ContaPagar[]): Promise<void>`
- `getNextNumeroContaPagar(contas: ContaPagar[]): number`

### Decisão

Separar contador/numeração de `Títulos`, porque:

- são domínios diferentes
- evita colisão semântica
- simplifica relatórios e auditoria

## 3.2 Banco / driver

Será necessário verificar e alterar a implementação do `dbDriver` para suportar:

- nova tabela/coleção de contas a pagar

Provável impacto:

- `src/lib/database.*`
- eventuais migrations/schema definitions

### Requisitos de persistência

O módulo precisa suportar:

- criação
- edição
- baixa
- reversão de baixa
- leitura para dashboard
- ordenação por vencimento
- agrupamento por credor

## 3.3 Backup/import

Hoje `importBackup()` em `src/lib/storage.ts` importa:

- títulos
- config
- usuários
- logs

### Plano

Na implementação do módulo, prever extensão futura para:

- incluir `contasPagar` no backup

Mas isso pode ser fase 2 se o usuário quiser apenas o módulo funcional primeiro.

---

## 4. Controle de acesso

## 4.1 Sidebar

`src/components/Sidebar.tsx` hoje usa `NAV_ITEMS` fixo.

### Mudança planejada

- adicionar nova aba, por exemplo:
  - `contasPagar`
  - opcionalmente `despesas` separada, se a tela for independente
- filtrar renderização do item quando `userLevel !== 'MASTER'`

### Observação importante

Hoje a `Sidebar` recebe apenas `userLevel: string`. Isso já é suficiente para esconder o botão, mas não para impedir seleção indevida por estado externo.

## 4.2 Proteção no container principal

Em `src/pages/Index.tsx`:

- expandir o tipo `Tab`
- impedir `setTab('contasPagar')` para não-MASTER
- se houver restauração futura de aba, garantir fallback para `dashboard`

### Regra recomendada

Se usuário não for MASTER:

- não renderizar botão
- não renderizar conteúdo
- se `tab === 'contasPagar'`, redirecionar internamente para `dashboard`

---

## 5. Estrutura funcional do módulo

## 5.1 Hook principal

Criar `src/hooks/useContasPagar.ts` com API semelhante a `useTitulos()`:

- `contasPagar`
- `addContaPagar`
- `updateContaPagar`
- `deleteContaPagar`
- `replaceContasPagar`
- `loading`

### Benefício

Mantém o padrão do projeto e reduz atrito cognitivo.

## 5.2 Ações de tela

Criar `src/hooks/useContaPagarActions.ts` inspirado em `useTituloActions.ts`.

Responsabilidades:

- abrir formulário
- editar conta
- registrar baixa
- reverter baixa
- excluir
- registrar logs

### Regra crítica

Reversão de baixa deve exigir motivo obrigatório.

### Sugestão de log

Adicionar novos tipos de log no domínio financeiro, por exemplo:

- `contaPagar.criar`
- `contaPagar.editar`
- `contaPagar.excluir`
- `contaPagar.pagar`
- `contaPagar.reverter`

Isso exige expansão de `LogTipo` em `src/types/titulo.ts`.

## 5.3 Formulário

Criar componente equivalente a `TituloForm` / `TituloFormModal`, por exemplo:

- `ContaPagarFormModal`

Campos mínimos:

- tipo
- credor
- valor
- dataVencimento

Campos recomendados:

- dataEmissao
- grupoDespesa
- subitemDespesa
- observação

### Validações

- tipo obrigatório
- credor obrigatório
- valor > 0
- dataVencimento obrigatória

## 5.4 Baixa/pagamento

Criar modal equivalente a `PagarFormModal`, mas adaptado ao domínio de saída:

- `BaixaContaPagarModal`

Campos:

- dataPagamento
- valorPago
- observação opcional

### Regras

- só contas em aberto podem ser baixadas
- ao baixar:
  - situação vira `PAGO`
  - card/lista muda destaque para azul
  - exibe `dataPagamento`

## 5.5 Reversão de baixa

Criar modal específico:

- `ReverterBaixaModal`

Campos:

- motivo obrigatório

Ao confirmar:

- limpar `dataPagamento`
- limpar `valorPago` se fizer sentido operacional
- gravar `motivoReversao`
- gravar `dataReversao`
- gravar usuário responsável, se desejado

### Decisão

Manter o motivo na própria entidade inicialmente é suficiente.  
Se houver necessidade de auditoria completa depois, evoluir para histórico separado.

---

## 6. Listagem, filtros e agrupamentos

## 6.1 Ordenação padrão

A regra pedida é:

- `dataVencimento ASC`

Isso já é compatível com o padrão atual de `Index.tsx`, que ordena títulos por vencimento.

## 6.2 Filtros

Criar hook paralelo a `useFilters.ts`, por exemplo:

- `useContasPagarFilters`

Filtros mínimos:

- todos
- vencidos
- no prazo
- pagos
- por mês
- por credor

## 6.3 Botão “Todos” agrupando por credor

Hoje o sistema já usa “Todos” em filtros mensais.  
Para `Contas a Pagar`, a regra adicional é:

- no modo “Todos”, agrupar por credor

### Implementação sugerida

Na listagem:

- se filtro mensal estiver vazio/“Todos”
  - agrupar array por `credor`
  - renderizar blocos por credor
- caso contrário
  - renderização linear ordenada por vencimento

### Estrutura visual sugerida

- cabeçalho do grupo com nome do credor
- subtotal por credor
- cards/linhas abaixo

### Decisão

Implementar agrupamento na camada de apresentação, não na persistência.

---

## 7. Tela Despesas

## 7.1 Papel da tela

A regra informada descreve uma tela com:

- cards por grupo
- subitens editáveis
- valores em R$

Isso indica um **submódulo analítico/configurável**, não apenas uma lista de contas.

## 7.2 Duas opções arquiteturais

### Opção A — Despesas como visão do próprio módulo

`Contas a Pagar` teria subtelas:

- Lista
- Despesas
- Dashboard

**Prós**

- tudo fica no mesmo domínio
- menor impacto na sidebar

**Contras**

- `Index.tsx` já está grande
- pode exigir navegação interna adicional

### Opção B — Despesas como aba irmã MASTER-only

Adicionar abas separadas:

- `contasPagar`
- `despesas`

**Prós**

- separação clara
- implementação incremental

**Contras**

- mais itens de navegação

### Recomendação

Para manter o pedido como “novo módulo Contas a Pagar”, usar **Opção A**:

- uma aba principal `contasPagar`
- subtabs internas:
  - `Lista`
  - `Despesas`
  - `Dashboard`

## 7.3 Modelo de dados para despesas

Se a tela for editável independentemente das contas lançadas, será necessário persistir orçamento/valores por grupo/subitem.

Estrutura sugerida:

```ts
export interface DespesaResumoItem {
  id: string;
  grupoId: string;
  subitemId: string;
  competencia: string;
  valor: number;
}
```

### Ponto de decisão

É preciso validar na implementação se esses valores:

1. são derivados das contas cadastradas  
ou
2. são editados manualmente como planejamento/resumo

Pelo requisito “sub-itens editáveis e valores R$”, a leitura mais provável é **manual/editável**, então esse submodelo deve ser previsto.

---

## 8. Dashboard comparativo receitas vs pagamentos

## 8.1 Estado atual

`src/components/DashboardChart.tsx` hoje mostra:

- KPIs de títulos
- vendas do período
- gráfico mensal de recebido/vencido/no prazo
- distribuição por tipo/situação

## 8.2 Necessidade nova

Novo gráfico:

- receitas diárias
- pagamentos diários

### Fontes

- receitas:
  - `Títulos` pagos (`dataPagamento`, `valorPago || valor`)
  - possivelmente `vendas`, dependendo da definição de “sistema principal”
- pagamentos:
  - `Contas a Pagar` baixadas (`dataPagamento`, `valorPago || valor`)

## 8.3 Decisão de cálculo

Para refletir fluxo de caixa real:

- usar `dataPagamento` para ambos os lados

Não usar `vencimento` para pagamentos do gráfico comparativo.

## 8.4 Implementação sugerida

Criar componente novo, por exemplo:

- `ContasPagarDashboard.tsx`

ou evoluir `DashboardChart.tsx` para aceitar datasets externos.

### Recomendação

Criar componente novo.  
Motivo:

- o dashboard atual é fortemente acoplado ao domínio de títulos a receber
- adaptar demais aumentaria risco de regressão

## 8.5 Indicadores mínimos

- total em aberto
- total vencido
- total pago
- total pago no período
- top credores
- comparativo diário receitas x pagamentos
- totais por grupo de despesa

---

## 9. Configurações necessárias

## 9.1 Painel Config

`src/components/ConfigPanel.tsx` já concentra cadastros financeiros.

### Extensões sugeridas

Adicionar seções para:

- tipos adicionais de contas a pagar
- grupos de despesas
- subitens por grupo

## 9.2 Reaproveitamento

Pode reaproveitar o padrão já usado em:

- `MotivosManager`
- `MaquininhasManager`
- `ProprietariosManager`

### Decisão

Criar managers pequenos e específicos, por exemplo:

- `TiposContaPagarManager`
- `GruposDespesasManager`

Isso mantém o `ConfigPanel` organizado e consistente com o projeto.

---

## 10. Impacto por arquivo/área

## 10.1 Arquivos certamente impactados

- `src/pages/Index.tsx`
  - nova aba
  - integração do hook novo
  - renderização do módulo
- `src/components/Sidebar.tsx`
  - item MASTER-only
- `src/lib/storage.ts`
  - CRUD de contas a pagar
- `src/types/titulo.ts`
  - expansão de `AppConfig` e `LogTipo`

## 10.2 Arquivos provavelmente novos

- `src/types/contas-pagar.ts`
- `src/hooks/useContasPagar.ts`
- `src/hooks/useContasPagarFilters.ts`
- `src/hooks/useContaPagarActions.ts`
- `src/components/ContaPagarCard.tsx`
- `src/components/ContasPagarTable.tsx`
- `src/components/ContasPagarFilters.tsx`
- `src/components/modals/ContaPagarFormModal.tsx`
- `src/components/modals/BaixaContaPagarModal.tsx`
- `src/components/modals/ReverterBaixaModal.tsx`
- `src/components/ContasPagarDashboard.tsx`
- `src/components/DespesasPanel.tsx`
- `src/components/TiposContaPagarManager.tsx`
- `src/components/GruposDespesasManager.tsx`

## 10.3 Arquivos possivelmente impactados

- `src/lib/database.*`
- `src/lib/backup.ts`
- componentes utilitários de badge/status, se forem reaproveitados

---

## 11. Ordem recomendada de implementação

### Fase 1 — Fundação de dados

1. Criar tipos do domínio `Contas a Pagar`
2. Expandir `AppConfig` com catálogos necessários
3. Adicionar persistência no storage/db
4. Criar `useContasPagar`

### Fase 2 — Acesso e navegação

5. Adicionar aba MASTER-only na sidebar
6. Integrar aba em `Index.tsx`
7. Garantir bloqueio para não-MASTER

### Fase 3 — Fluxo operacional

8. Criar formulário de cadastro/edição
9. Criar listagem ordenada por vencimento
10. Criar baixa/pagamento
11. Criar reversão com motivo obrigatório
12. Criar agrupamento por credor no modo “Todos”

### Fase 4 — Gestão analítica

13. Criar tela `Despesas`
14. Criar dashboard comparativo receitas x pagamentos
15. Criar agregações por grupo/subitem/credor

### Fase 5 — Configuração e acabamento

16. Adicionar managers no `ConfigPanel`
17. Integrar logs
18. Integrar backup/import se entrar no escopo
19. Validar build/typecheck

---

## 12. Critérios de aceite técnicos

## 12.1 Acesso

- usuário não-MASTER não vê item do módulo
- usuário não-MASTER não consegue acessar conteúdo do módulo

## 12.2 Cadastro

- conta pode ser criada com tipo, credor, valor e vencimento
- tipos fixos aparecem sempre
- tipos extras de config aparecem no seletor

## 12.3 Listagem

- ordenação padrão por vencimento ascendente
- filtro por situação funciona
- modo “Todos” agrupa por credor

## 12.4 Baixa e reversão

- baixa grava `dataPagamento`
- item pago fica com destaque azul
- reversão exige motivo
- reversão remove estado de pago corretamente

## 12.5 Dashboard

- gráfico diário compara receitas e pagamentos
- pagamentos usam `dataPagamento`
- totais por credor/grupo batem com os dados persistidos

## 12.6 Despesas

- grupos e subitens aparecem em cards
- valores podem ser editados e persistidos

---

## 13. Riscos e decisões abertas

## 13.1 Principal risco técnico

O projeto concentra muita lógica em `Index.tsx`, então adicionar mais um domínio pode aumentar acoplamento.

### Mitigação

- encapsular o módulo em componente/container próprio
- evitar crescer ainda mais a lógica inline de `Index.tsx`

## 13.2 Decisão aberta: despesas derivadas vs manuais

O requisito sugere edição manual de valores por subitem.  
Se isso for confirmado na implementação, será necessário persistir esse resumo separadamente das contas lançadas.

## 13.3 Decisão aberta: credor como texto ou cadastro estruturado

No curto prazo, `credor` como texto é mais rápido e consistente com o requisito.  
Se houver necessidade de filtros avançados, histórico ou relatórios por fornecedor, evoluir para cadastro estruturado depois.

### Recomendação

Implementar v1 com:

- `credor` textual obrigatório
- agrupamento por nome normalizado

---

## 14. Recomendação final

A melhor estratégia é implementar `Contas a Pagar` como **novo domínio paralelo a `Títulos`**, mas **dentro da mesma shell de navegação**, reaproveitando:

- padrão de hooks
- padrão de modais
- padrão de filtros
- padrão de cards/listagem
- padrão de config
- padrão de logs

Sem tentar generalizar tudo agora.

Isso entrega a funcionalidade com menor risco e preserva a consistência do sistema atual.