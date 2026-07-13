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
 * Componente autocontido: renderiza o botão de ajuda e o Dialog com o conteúdo
 * em Accordion. Basta incluir <ManualContasPagar /> em qualquer lugar da tela.
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
                    Se algum dos dois estiver vazio, a aba exibe um aviso lembrando de cadastrar
                    antes de lançar.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Campos do formulário</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Tipo de Título*</strong> — selecione entre os tipos ativos cadastrados.</li>
                    <li><strong>Credor*</strong> — selecione o fornecedor/credor cadastrado.</li>
                    <li><strong>Valor*</strong> — aceita vírgula ou ponto como separador decimal.</li>
                    <li><strong>Data de Vencimento*</strong> — vem preenchida com a data de hoje por padrão.</li>
                    <li>
                      <strong>Descrição</strong> (opcional) — se deixada em branco, o sistema gera
                      automaticamente "Tipo - Nome do Credor".
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">* campos obrigatórios.</p>
                </div>

                <div>
                  <p className="font-medium">Fluxo de uso</p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Selecione o Tipo de Título e o Credor.</li>
                    <li>Informe o Valor e a Data de Vencimento.</li>
                    <li>(Opcional) Escreva uma Descrição.</li>
                    <li>Clique em <strong>Salvar</strong>. Uma notificação confirma o lançamento.</li>
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
                    e Credor definidos, o sistema abre esta aba em modo edição (campos ficam em
                    vermelho). Use o botão <strong>Cancelar edição</strong> para descartar as
                    alterações.
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
                  Mostra os títulos a pagar organizados por <strong>Grupo de Despesa</strong>,
                  facilitando a visão de despesas fixas e variáveis por categoria.
                </p>

                <div>
                  <p className="font-medium">Grupos de despesa</p>
                  <p className="text-muted-foreground">
                    Se nenhum grupo customizado for cadastrado, o sistema usa 12 grupos padrão:
                    Remunerações, Encargos Sociais, Benefícios, Ocupação, Tarifas Públicas,
                    Prestadores de Serviços, Seguros, Manutenção, Marketing, Viagens, Gerais e
                    Financeiros. Você pode cadastrar grupos próprios em{' '}
                    <em>Configurações → Contas a Pagar → card GRUPO DE DESPESA</em>.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Filtro por mês</p>
                  <p className="text-muted-foreground">
                    Botões "Todos" + Jan a Dez no topo filtram as despesas por competência de
                    vencimento. Só ficam habilitados os meses que possuem lançamentos.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Editando um valor rapidamente</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Clique no valor (em destaque) de qualquer item do grupo.</li>
                    <li>Digite o novo valor e pressione <strong>Enter</strong> para salvar ou <strong>Esc</strong> para cancelar.</li>
                    <li>Também é possível usar os botões Salvar/Cancelar exibidos abaixo do campo.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Sub-itens do grupo</p>
                  <p className="text-muted-foreground">
                    Cada card de grupo permite cadastrar "sub-itens" (etiquetas de detalhamento)
                    diretamente nesta tela, sem precisar ir em Configurações. Digite o nome e
                    clique em <strong>Criar</strong>; clique no "×" para remover.
                  </p>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <strong>Total geral</strong> no topo da página soma todas as despesas do período
                  selecionado, independente do grupo.
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
                  <p className="font-medium">Cards de indicadores</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Títulos Vencidos</strong> — clicável: abre a aba Listagem já filtrada
                      por status "Vencido".
                    </li>
                    <li><strong>Total de Títulos</strong> — quantidade total no período, com detalhamento por tipo (Boleto, Cheque, Cartão etc.).</li>
                    <li><strong>Total de Vendas</strong> — soma das vendas à vista registradas no período.</li>
                    <li><strong>A Pagar</strong> — soma dos títulos Pendentes + Vencidos no período.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Filtro por mês</p>
                  <p className="text-muted-foreground">
                    Botões "Todos" + Jan a Dez no topo. Ao trocar de mês, todos os cards e gráficos
                    são recalculados.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Gráfico de barras — Receitas x Pagamentos por dia</p>
                  <p className="text-muted-foreground">
                    Compara, dia a dia do mês selecionado, o total de vendas à vista (receitas) com
                    o total de contas com vencimento naquele dia (pagamentos). O tooltip ao passar
                    o mouse mostra a diferença diária (receitas − pagamentos).
                  </p>
                </div>

                <div>
                  <p className="font-medium">Gráfico de pizza — Distribuição por credor</p>
                  <p className="text-muted-foreground">
                    Mostra o percentual de participação de cada favorecido/credor no total de
                    contas a pagar do mês selecionado, útil para identificar os maiores
                    fornecedores em volume de pagamento.
                  </p>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <strong>Dica:</strong> use os gráficos para identificar meses com maior
                  concentração de vencimentos antes de negociar prazos com fornecedores.
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
                </div>

                <div>
                  <p className="font-medium">Ações em cada card de título</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>Baixar</strong> — registra o pagamento: abre modal com data de pagamento, valor sugerido (já somando juros/multa conforme dias de atraso), opção "Receber sem juros e multa" e forma de pagamento.</li>
                    <li><strong>Reverter baixa</strong> — disponível somente em títulos já pagos; exige informar um motivo (lista configurável em Config → Motivos de Alteração).</li>
                    <li><strong>Editar</strong> (lápis) — se o título tiver Tipo de Título e Credor definidos, abre na aba Lançamento de Título; caso contrário, abre o formulário completo (Novo lançamento).</li>
                    <li><strong>Excluir</strong> (lixeira) — também exige informar um motivo antes de confirmar.</li>
                  </ul>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  O rodapé da barra de filtros mostra a quantidade de lançamentos encontrados e o
                  valor total somado do filtro atual.
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
                    <li>Lista de Contatos vinculados (nomes).</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Como cadastrar ou editar um credor</p>
                  <p className="text-muted-foreground">
                    O cadastro é feito em <em>Configurações → Contas a Pagar → card CREDOR</em>:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Preencha <strong>Nome Empresa*</strong> (obrigatório) e demais campos desejados (Nome Fantasia, Rua, Bairro, CEP, Número, Telefone, WhatsApp).</li>
                    <li>Na seção Contatos, adicione um ou mais contatos com nome, telefone e WhatsApp usando <strong>Adicionar contato</strong>.</li>
                    <li>Clique em <strong>Salvar</strong> (ou <strong>Atualizar</strong>, se estiver editando um credor existente).</li>
                    <li>Para editar, clique no ícone de lápis na lista de credores cadastrados; para remover, use o ícone de lixeira.</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium">Onde o credor é usado</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>No select "Credor" da aba <strong>Lançamento de Título</strong>.</li>
                    <li>No gráfico "Distribuição por credor" da aba <strong>Gráfico</strong>.</li>
                    <li>No agrupamento por favorecido da aba <strong>Listagem</strong>.</li>
                  </ul>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  Se nenhum credor estiver cadastrado, a aba exibe o aviso "Nenhum credor
                  cadastrado. Cadastre em Configurações → Contas a Pagar."
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>
    </>
  );
}
