// src/components/ManualContasPagar.tsx
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

/**
 * Manual de Utilização da seção Contas a Pagar.
 * CORREÇÃO: Alinhado com o comportamento real do código atualizado.
 */
export function ManualContasPagar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <BookOpen className="mr-1 h-4 w-4" />
        Manual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual de Utilização — Contas a Pagar</DialogTitle>
            <DialogDescription>
              Guia completo das funcionalidades do módulo Contas a Pagar do Controle Financeiro ZOOM.
            </DialogDescription>
          </DialogHeader>
          <Accordion type="multiple" defaultValue={['lancamento']} className="w-full">
            {/* 1. LANÇAMENTO DE TÍTULO */}
            <AccordionItem value="lancamento">
              <AccordionTrigger>1. Lançamento de Título</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Use esta aba para registrar rapidamente um título a pagar (boleto, cheque,
                  cartão etc.) vinculado a um <strong>Credor</strong> já cadastrado.
                </p>
                <div>
                  <p className="font-medium">Pré-requisitos</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      Ao menos um <strong>Tipo de Título</strong> ativo cadastrado em{' '}
                      <em>Configurações → Contas a Pagar → card TÍTULO</em> (ex: Boleto, Cheque,
                      Cartão, Outros).
                    </li>
                    <li>
                      Ao menos um <strong>Credor</strong> cadastrado em{' '}
                      <em>Configurações → Contas a Pagar → card CREDOR</em>.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se algum dos dois estiver vazio, o campo de seleção exibe um aviso lembrando de cadastrar
                    antes de lançar.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Campos do formulário</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Tipo de Título*</strong> — selecione entre os tipos disponíveis (Boleto, Cheque, Cartão de Crédito, Cartão de Débito, PIX, PIX Parcelado).</li>
                    <li><strong>Credor*</strong> — selecione o fornecedor/credor cadastrado.</li>
                    <li><strong>Valor*</strong> — aceita vírgula ou ponto como separador decimal.</li>
                    <li><strong>Data de Vencimento*</strong> — vem preenchida automaticamente com a data de hoje.</li>
                    <li>
                      <strong>Descrição</strong> (opcional) — se deixada em branco, o sistema gera
                      automaticamente "Tipo - Nome do Credor".
                    </li>
                    <li><strong>Lançamento Parcelado</strong> — marca como parcelado e permite informar a quantidade de parcelas (mínimo 2, máximo 60).</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">* campos obrigatórios.</p>
                </div>
                <div>
                  <p className="font-medium">Fluxo de uso</p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Selecione o Tipo de Título e o Credor.</li>
                    <li>Informe o Valor e a Data de Vencimento.</li>
                    <li>(Opcional) Escreva uma Descrição.</li>
                    <li>(Opcional) Marque "Lançamento Parcelado" e informe a quantidade de parcelas.</li>
                    <li>Clique em <strong>Salvar Lançamento</strong>. Uma notificação confirma o lançamento.</li>
                    <li>
                      O título aparece na aba <strong>Listagem</strong> com status{' '}
                      <em>Pendente</em> (ou <em>Vencido</em>, se a data já passou).
                    </li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">Editando um lançamento existente</p>
                  <p className="text-muted-foreground">
                    Ao clicar no ícone de lápis de um título na Listagem que possua Tipo de Título
                    e Credor definidos, o sistema abre esta aba em modo edição com todos os campos
                    preenchidos. Use o botão <strong>Salvar alterações</strong> para confirmar ou
                    o <strong>×</strong> no canto superior para cancelar.
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <strong>Exemplo:</strong> Tipo = BOLETO · Credor = CPFL Energia · Valor = 350,00 ·
                  Vencimento = 15/08/2026 · Descrição = "Conta de luz agosto".
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. DESPESAS */}
            <AccordionItem value="despesas">
              <AccordionTrigger>2. Despesas</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Mostra os títulos a pagar organizados por <strong>Categoria de Despesa</strong>,
                  facilitando a visão de despesas fixas e variáveis por categoria.
                </p>
                <div>
                  <p className="font-medium">Categorias de despesa</p>
                  <p className="text-muted-foreground">
                    O sistema usa 12 categorias padrão: Remuneração, Encargos Sociais, Benefícios,
                    Ocupação, Tarifas Públicas, Prestadores de Serviços, Seguros, Manutenção,
                    Marketing, Viagens, Gerais e Financeiros. Cada categoria é exibida como um card
                    separado com seus lançamentos.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Criando um novo lançamento</p>
                  <p className="text-muted-foreground">
                    Clique em <strong>Novo</strong> no card da categoria desejada. Preencha:
                    Descrição*, Valor*, 1º Vencimento, Favorecido (opcional) e Observação (opcional).
                  </p>
                </div>
                <div>
                  <p className="font-medium">Despesa Recorrente</p>
                  <p className="text-muted-foreground">
                    Marque a opção <strong>Despesa Recorrente</strong> e informe a quantidade de meses
                    vigentes (máx. 60). O sistema gerará automaticamente um lançamento por mês,
                    ajustando o dia de vencimento para o último dia do mês quando necessário
                    (ex: 31/01 → 28/02 → 31/03).
                  </p>
                </div>
                <div>
                  <p className="font-medium">Editando um lançamento</p>
                  <p className="text-muted-foreground">
                    Clique no lançamento ou no ícone de lápis para abrir o formulário de edição.
                    <strong> Contas já pagas não podem ser editadas</strong> — é preciso reverter a baixa primeiro.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Excluindo um lançamento</p>
                  <p className="text-muted-foreground">
                    Clique no ícone de lixeira. O sistema pedirá confirmação e um motivo para a exclusão.
                    <strong> Contas já pagas não podem ser excluídas</strong> — é preciso reverter a baixa primeiro.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. GRÁFICO */}
            <AccordionItem value="grafico">
              <AccordionTrigger>3. Gráfico</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Painel visual com indicadores e gráficos para acompanhar contas a pagar e vendas
                  do período.
                </p>
                <div>
                  <p className="font-medium">Filtros de período</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Seletor de Ano</strong> — permite visualizar dados de anos diferentes.</li>
                    <li><strong>Botão "Todos"</strong> — mostra o panorama geral de todos os meses disponíveis.</li>
                    <li><strong>Botões de Mês (Jan-Dez)</strong> — filtra por um mês específico.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Cards de indicadores</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Títulos Vencidos</strong> — clicável: abre a aba Listagem já filtrada
                      por status "Vencido".
                    </li>
                    <li><strong>Total de Títulos</strong> — quantidade total no período, com detalhamento por tipo.</li>
                    <li><strong>Total de Vendas</strong> — soma das vendas à vista registradas no período.</li>
                    <li>
                      <strong>A Pagar (pendente/vencido)</strong> — soma dos títulos Pendentes + Vencidos.
                      <strong> Exclui contas canceladas</strong>.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Gráfico de barras — Receitas x Pagamentos por dia</p>
                  <p className="text-muted-foreground">
                    Compara, dia a dia do mês selecionado, o total de vendas à vista (receitas) com
                    o total de contas com vencimento naquele dia (pagamentos). Ao passar o mouse,
                    o tooltip mostra a diferença diária.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se nenhum mês estiver selecionado (modo "Todos"), o gráfico exibe uma mensagem
                    orientando a selecionar um mês para ver o detalhamento diário.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Gráfico de pizza — Distribuição por credor</p>
                  <p className="text-muted-foreground">
                    Mostra o percentual de participação de cada favorecido/credor no total de
                    contas a pagar do período selecionado.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. LISTAGEM */}
            <AccordionItem value="listagem">
              <AccordionTrigger>4. Listagem</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Tela principal de consulta e gerenciamento de todos os títulos a pagar
                  cadastrados.
                </p>
                <div>
                  <p className="font-medium">Filtros disponíveis</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Busca</strong> — pesquisa por descrição, favorecido, categoria ou centro de custo.</li>
                    <li><strong>Status</strong> — Todos, Pendentes, Vencidos ou Pagos.</li>
                    <li><strong>Mês</strong> — filtra por competência/mês de vencimento; "Todos os meses" mostra tudo.</li>
                    <li><strong>Favorecido</strong> — filtra por um credor/favorecido específico.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Ordenação e agrupamento</p>
                  <p className="text-muted-foreground">
                    Quando o filtro de mês está em <strong>"Todos os meses"</strong>, os
                    lançamentos são automaticamente agrupados por favorecido, com subtotal por
                    grupo. Ao selecionar um mês específico, a lista passa a ser linear, ordenada
                    por data de vencimento.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Novo lançamento (formulário completo)</p>
                  <p className="text-muted-foreground">
                    O botão <strong>Novo lançamento</strong> abre um formulário mais completo
                    (diferente do da aba Lançamento de Título), com os campos: Descrição*,
                    Categoria* (Fornecedor, Funcionário, Imposto, Aluguel, Utilidade, Serviço ou
                    Outro), Favorecido*, Valor*, Vencimento*, Competência, Centro de Custo, Forma
                    padrão de pagamento e Observações. Esse formulário não exige um Credor
                    previamente cadastrado — o campo Favorecido é digitado livremente.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Dica:</strong> ao alterar o Vencimento, a Competência é atualizada
                    automaticamente (a menos que você a edite manualmente).
                  </p>
                </div>
                <div>
                  <p className="font-medium">Ações em cada card de título</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Baixar</strong> — registra o pagamento: abre modal com data de pagamento,
                      valor sugerido (já somando juros/multa conforme dias de atraso), opção
                      "Pagar sem juros e multa" e forma de pagamento.
                    </li>
                    <li>
                      <strong>Reverter baixa</strong> — disponível somente em títulos já pagos;
                      exige informar um motivo.
                    </li>
                    <li>
                      <strong>Editar</strong> (lápis) — se o título tiver Tipo de Título e Credor definidos,
                      abre na aba Lançamento de Título; caso contrário, abre o formulário completo.
                    </li>
                    <li>
                      <strong>Excluir</strong> (lixeira) — também exige informar um motivo antes de confirmar.
                      Contas já pagas não podem ser excluídas.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Exportação</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Excel</strong> — exporta a listagem atual em CSV compatível com Excel (protegido contra injeção de fórmulas).</li>
                    <li><strong>PDF</strong> — abre diálogo de opções (inclui filtro "Somente Títulos") e aciona a impressão do navegador.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. CREDORES */}
            <AccordionItem value="credores">
              <AccordionTrigger>5. Credores</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  A aba Credores exibe, em modo consulta, todos os credores/fornecedores
                  cadastrados no sistema.
                </p>
                <div>
                  <p className="font-medium">Informações exibidas por credor</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Nome da Empresa e Nome Fantasia.</li>
                    <li>Endereço: Rua, Bairro, CEP e Número.</li>
                    <li>Telefone e WhatsApp.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Como cadastrar ou editar um credor</p>
                  <p className="text-muted-foreground">
                    O cadastro é feito em <em>Configurações → Contas a Pagar → card CREDOR</em>:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Preencha <strong>Nome Empresa*</strong> (obrigatório) e demais campos desejados.</li>
                    <li>Na seção Contatos, adicione um ou mais contatos com nome, telefone e WhatsApp.</li>
                    <li>Clique em <strong>Salvar</strong> (ou <strong>Atualizar</strong>).</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">Editar e Excluir na aba Credores</p>
                  <p className="text-muted-foreground">
                    Os botões <strong>Editar</strong> e <strong>Excluir</strong> nesta aba são atalhos.
                    A edição completa deve ser feita em Configurações. A exclusão aqui pede confirmação
                    e avisa sobre possíveis contas vinculadas.
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  Se nenhum credor estiver cadastrado, a aba exibe o aviso "Nenhum credor
                  cadastrado. Cadastre em Configurações → Contas a Pagar."
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. PROJEÇÃO SEMANAL */}
            <AccordionItem value="projecao">
              <AccordionTrigger>6. Projeção Semanal</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Calcula quanto você precisa vender nas próximas 12 semanas para cobrir as contas
                  a pagar, considerando uma margem de lucro configurável (padrão: 30%).
                </p>
                <div>
                  <p className="font-medium">Como funciona</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>A primeira semana ("Esta Semana") inclui também as <strong>contas vencidas</strong> de semanas anteriores.</li>
                    <li>Cada semana mostra o total de contas a vencer no período e o valor necessário de vendas.</li>
                    <li>Fórmula: <code>precisaVender = totalContas / (margemLucro / 100)</code></li>
                  </ul>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <strong>Dica:</strong> use esta projeção para planejar metas de vendas semanais
                  e garantir que você terá caixa suficiente para honrar todos os compromissos.
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>
    </>
  );
}