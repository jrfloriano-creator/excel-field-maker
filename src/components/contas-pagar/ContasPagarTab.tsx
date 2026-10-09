import { useMemo, useState, useRef } from 'react';
import { AppConfig, ContaPagar } from '@/types/titulo';
import { SessionUser } from '@/lib/auth';
import { formatCurrency, formatarMesAno } from '@/lib/calculos';
import { useContasPagar } from '@/hooks/useContasPagar';
import { useContaPagarActions } from '@/hooks/useContaPagarActions';
import { useContasPagarFilters } from '@/hooks/useContasPagarFilters';
import { useContasPagarCatalog } from '@/hooks/useContasPagarCatalog';
import { agruparContasPorFavorecido, formatarResumoGrupo, somarValorContas } from '@/lib/contas-pagar';
import { calcularProjecaoSemanal } from '@/lib/projecaoSemanal';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarCard } from './ContaPagarCard';
import { ContaPagarPaymentModal } from './ContaPagarPaymentModal';
import { ContasPagarGrafico } from './ContasPagarGrafico';
import { ContasPagarDespesas } from './ContasPagarDespesas';
import { ProjecaoSemanal } from '@/components/ProjecaoSemanal';
import { LancamentoTitulo, LancamentoTituloPayload } from './LancamentoTitulo';
import { ManualContasPagar } from './ManualContasPagar';
import { DeleteMotivoModal } from '@/components/modals/DeleteMotivoModal';
import { MotivoDialog } from '@/components/MotivoDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

interface ContasPagarTabProps {
  config: AppConfig;
  updateConfig: (data: Partial<AppConfig>) => void;
  user: SessionUser | null;
}

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[\s_]+/g, "");

// Extrai o número da parcela do id ou descrição — ex: "1/3"
const obterNumeroParcela = (conta: ContaPagar): string => {
  if (conta.numeroParcelas && conta.numeroParcelas > 1) {
    // Tenta extrair da descrição ou id
    const match = conta.descricao.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) return `${match[1]}/${match[2]}`;
    
    // Fallback: se não tem na descrição, calcula posição por data
    return `?/${conta.numeroParcelas}`;
  }
  return '';
};

export function ContasPagarTab({ config, updateConfig, user }: ContasPagarTabProps) {
  const { contas, contasCalculadas, titulos, loading, addConta, updateConta, deleteConta } = useContasPagar();
  const actions = useContaPagarActions({ contas, contasCalculadas, config, updateConfig, addConta, updateConta, deleteConta, user });
  const filters = useContasPagarFilters(contasCalculadas);
  const catalog = useContasPagarCatalog();
  
  const [activeTab, setActiveTab] = useState<'lancamento' | 'despesas' | 'grafico' | 'projecao' | 'listagem' | 'credores'>('lancamento');
  const [editingLancamento, setEditingLancamento] = useState<ContaPagar | null>(null);
  
  const [impressaoDialogAberto, setImpressaoDialogAberto] = useState(false);
  const [somenteTitulos, setSomenteTitulos] = useState(false);
  
  const grupos = useMemo(() => agruparContasPorFavorecido(filters.contasFiltradas), [filters.contasFiltradas]);
  const totalFiltrado = useMemo(() => somarValorContas(filters.contasFiltradas), [filters.contasFiltradas]);
  const agruparPorFavorecido = filters.selectedMonth === '';
  const contasConfig = config.contasPagar;
  
  // =========== DADOS PARA IMPRESSÃO COM Nº PARCELA ===========
  const dadosImpressao = useMemo(() => {
    let lista = filters.contasFiltradas;
    
    if (somenteTitulos) {
      lista = lista.filter(c => c.categoria === 'FORNECEDOR' || !!c.tipoTitulo);
    }
    
    const agrupadoPorMes = new Map<string, (ContaPagar & { numeroParcela: string })[]>();
    lista.forEach(conta => {
      const mes = conta.competencia || conta.vencimento.slice(0, 7);
      if (!agrupadoPorMes.has(mes)) agrupadoPorMes.set(mes, []);
      agrupadoPorMes.get(mes)!.push({
        ...conta,
        numeroParcela: obterNumeroParcela(conta)
      });
    });
    
    const mesesOrdenados = Array.from(agrupadoPorMes.keys()).sort();
    
    const totaisPorMes = mesesOrdenados.map(mes => ({
      mes,
      nomeMes: formatarMesAno(mes),
      contas: agrupadoPorMes.get(mes)!,
      total: somarValorContas(agrupadoPorMes.get(mes)!),
    }));
    
    const totalGeral = somarValorContas(lista);
    
    return {
      itens: lista,
      totaisPorMes,
      totalGeral,
      filtradoPor: filters.selectedMonth ? formatarMesAno(filters.selectedMonth) : 'Todos os meses',
      statusFiltro: filters.statusFilter,
      favorecidoFiltro: filters.favorecidoFilter === 'TODOS' ? 'Todos' : filters.favorecidoFilter,
      somenteTitulos,
    };
  }, [filters.contasFiltradas, filters.selectedMonth, filters.statusFilter, filters.favorecidoFilter, somenteTitulos]);
  
  const salvarContasPagarConfig = (patch: Partial<NonNullable<AppConfig['contasPagar']>>) => {
    updateConfig({
      contasPagar: {
        ...contasConfig,
        ...patch,
      },
    });
  };

  const handleSalvarLancamento = async (payload: LancamentoTituloPayload | LancamentoTituloPayload[]) => {
    if (Array.isArray(payload)) {
      console.log('📦 Recebido array de parcelas, quantidade:', payload.length);
      
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i];
        const numeroParcelaTexto = `${i+1}/${payload.length}`;
        const nomeTipo = normalizar(item.tipoTituloNome);
        const ehCheque = nomeTipo.includes("CHEQUE");
        const ehCartaoCred = nomeTipo.includes("CARTAOCRED");
        const ehCartaoDeb = nomeTipo.includes("CARTAODEB");
        
        const contaPayload: Partial<ContaPagar> = {
          descricao: `[${numeroParcelaTexto}] ${item.descricao || `${item.tipoTituloNome} - ${item.credorNome}`}`,
          categoria: 'FORNECEDOR',
          tipoTitulo: item.tipoTituloNome,
          favorecido: item.credorNome,
          credorId: item.credorId,
          valor: item.valor,
          valorTotal: item.valorTotal,
          numeroParcelas: item.numeroParcelas,
          vencimento: item.vencimento,
          competencia: item.competencia,
          ...(ehCheque && { numeroCheque: item.numeroCheque, banco: item.banco }),
          ...(ehCartaoCred && { bandeiraCartao: item.bandeiraCartao, emissorCartao: item.emissorCartao }),
          ...(ehCartaoDeb && { bandeiraCartao: item.bandeiraCartao, emissorCartao: item.emissorCartao }),
        };
        
        console.log(`💾 Salvando parcela ${numeroParcelaTexto}:`, contaPayload.vencimento, contaPayload.competencia);
        await addConta(contaPayload as Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>);
        console.log(`✅ Parcela ${numeroParcelaTexto} salva!`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      toast.success(`${payload.length} parcelas salvas com sucesso!`);
      return;
    }

    const nomeTipo = normalizar(payload.tipoTituloNome);
    const ehCheque = nomeTipo.includes("CHEQUE");
    const ehCartaoCred = nomeTipo.includes("CARTAOCRED");
    const ehCartaoDeb = nomeTipo.includes("CARTAODEB");
    
    const contaPayload: Partial<ContaPagar> = {
      descricao: payload.descricao || `${payload.tipoTituloNome} - ${payload.credorNome}`,
      categoria: 'FORNECEDOR',
      tipoTitulo: payload.tipoTituloNome,
      favorecido: payload.credorNome,
      credorId: payload.credorId,
      valor: payload.valor,
      vencimento: payload.vencimento,
      competencia: payload.vencimento.slice(0, 7),
      ...(ehCheque && { numeroCheque: payload.numeroCheque, banco: payload.banco }),
      ...(ehCartaoCred && { bandeiraCartao: payload.bandeiraCartao, emissorCartao: payload.emissorCartao }),
      ...(ehCartaoDeb && { bandeiraCartao: payload.bandeiraCartao, emissorCartao: payload.emissorCartao }),
    };
    
    if (editingLancamento) {
      await updateConta(editingLancamento.id, contaPayload);
      setEditingLancamento(null);
      toast.success('Lançamento atualizado!');
    } else {
      await addConta(contaPayload as Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>);
      toast.success('Lançamento salvo!');
    }
  };

  const handleEditarLancamento = (conta: ContaPagar) => {
    setEditingLancamento(conta);
    setActiveTab('lancamento');
  };

  // =========== IMPRESSÃO — SEM TRAVAMENTO ===========
  const confirmarImpressao = () => {
    // Fecha o diálogo ANTES de chamar impressão
    setImpressaoDialogAberto(false);
    
    // Garante que o diálogo fechou completamente
    setTimeout(() => {
      // Abre a impressão em nova aba/janela para não travar
      window.print();
    }, 150);
  };

  const abrirDialogoImpressao = () => {
    setSomenteTitulos(false);
    setImpressaoDialogAberto(true);
  };

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando contas a pagar...</div>;
  }

  return (
    <>
      {/* =========== ÁREA DE IMPRESSÃO — COM Nº DE PARCELA =========== */}
      <div className="print-only">
        <div className="max-w-3xl mx-auto p-8 bg-white text-black">
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-center">RELATÓRIO DE CONTAS A PAGAR</h1>
            <p className="text-center text-sm text-gray-600 mt-1">
              {config.empresa?.nome || 'Zoom Financeiro'}
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              Filtro: {dadosImpressao.filtradoPor} • 
              Status: {dadosImpressao.statusFiltro === 'TODOS' ? 'Todos' : dadosImpressao.statusFiltro} • 
              Favorecido: {dadosImpressao.favorecidoFiltro}
              {dadosImpressao.somenteTitulos && ' • SOMENTE TÍTULOS'}
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Emitido em: {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
            </p>
          </div>

          {dadosImpressao.totaisPorMes.map(mes => (
            <div key={mes.mes} className="mb-6">
              <h2 className="text-lg font-bold bg-gray-100 px-3 py-2 rounded mb-3">
                📅 {mes.nomeMes}
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-center py-2 px-2 border-b">Parcela</th>
                    <th className="text-left py-2 px-2 border-b">Nº</th>
                    <th className="text-left py-2 px-2 border-b">Descrição</th>
                    <th className="text-left py-2 px-2 border-b">Favorecido</th>
                    <th className="text-left py-2 px-2 border-b">Vencimento</th>
                    <th className="text-left py-2 px-2 border-b">Tipo</th>
                    <th className="text-right py-2 px-2 border-b">Valor</th>
                    <th className="text-center py-2 px-2 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mes.contas.map(conta => (
                    <tr key={conta.id} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-xs text-center font-mono font-bold">
                        {conta.numeroParcela || '—'}
                      </td>
                      <td className="py-2 px-2 text-xs">{conta.numero}</td>
                      <td className="py-2 px-2 text-xs">{conta.descricao}</td>
                      <td className="py-2 px-2 text-xs">{conta.favorecido || '—'}</td>
                      <td className="py-2 px-2 text-xs">
                        {conta.vencimento.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {conta.tipoTitulo || conta.categoria}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-medium">
                        {formatCurrency(conta.valor)}
                      </td>
                      <td className="py-2 px-2 text-xs text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          conta.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                          conta.status === 'VENCIDO' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {conta.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="py-2 px-2 text-right">Total do Mês:</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(mes.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          <div className="border-t-2 border-gray-800 pt-4 mt-6">
            <p className="text-xl font-bold text-right">
              TOTAL GERAL: {formatCurrency(dadosImpressao.totalGeral)}
            </p>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Sistema Zoom Financeiro — Relatório de Contas a Pagar
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant={activeTab === 'lancamento' ? 'default' : 'outline'} onClick={() => setActiveTab('lancamento')}>
              Lançamento Título
            </Button>
            <Button type="button" variant={activeTab === 'despesas' ? 'default' : 'outline'} onClick={() => setActiveTab('despesas')}>
              Despesas
            </Button>
            <Button type="button" variant={activeTab === 'grafico' ? 'default' : 'outline'} onClick={() => setActiveTab('grafico')}>
              Gráfico
            </Button>
            <Button type="button" variant={activeTab === 'projecao' ? 'default' : 'outline'} onClick={() => setActiveTab('projecao')}>
              Projeção Semanal
            </Button>
            <Button type="button" variant={activeTab === 'listagem' ? 'default' : 'outline'} onClick={() => setActiveTab('listagem')}>
              Listagem
            </Button>
            <Button type="button" variant={activeTab === 'credores' ? 'default' : 'outline'} onClick={() => setActiveTab('credores')}>
              Credores
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'listagem' && (
              <Button variant="outline" onClick={abrirDialogoImpressao} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            )}
            <ManualContasPagar />
          </div>
        </div>

        {activeTab === 'lancamento' ? (
          <LancamentoTitulo
            editingConta={editingLancamento}
            onSubmit={handleSalvarLancamento}
            onCancelEdit={() => setEditingLancamento(null)}
          />
        ) : activeTab === 'despesas' ? (
          <ContasPagarDespesas
            config={config}
            contas={contas}
            addConta={addConta}
            onUpdateConta={updateConta}
            onDeleteConta={deleteConta}
            onUpdateConfig={salvarContasPagarConfig}
          />
        ) : activeTab === 'grafico' ? (
          <ContasPagarGrafico
            contas={contasCalculadas}
            titulos={titulos}
            vendas={config.vendas || []}
            taxa={config.taxa}
            multa={config.contasPagar?.multa || 0}
            selectedMonth={filters.selectedMonth}
            onSelectMonth={filters.setSelectedMonth}
            onOpenVencidos={() => {
              filters.setStatusFilter('VENCIDO');
              setActiveTab('listagem');
            }}
          />
        ) : activeTab === 'projecao' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">📊 Projeção Semanal — Quanto Preciso Vender</h3>
            <ProjecaoSemanal contas={contasCalculadas} />
          </div>
        ) : activeTab === 'credores' ? (
          <div className="space-y-3">
            {catalog.credores.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground">
                Nenhum credor cadastrado. Cadastre em Configurações → Contas a Pagar.
              </div>
            ) : catalog.credores.map(credor => (
              <Card key={credor.id}>
                <CardHeader>
                  <CardTitle>{credor.nomeEmpresa}</CardTitle>
                  <p className="text-sm text-muted-foreground">{credor.nomeFantasia || 'Sem nome fantasia'}</p>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>Rua: {credor.rua || '—'}</div>
                  <div>Bairro: {credor.bairro || '—'}</div>
                  <div>CEP: {credor.cep || '—'}</div>
                  <div>Número: {credor.numero || '—'}</div>
                  <div>Telefone: {credor.telefone || '—'}</div>
                  <div>WhatsApp: {credor.whatsapp || '—'}</div>
                  <div className="md:col-span-2">Contatos: {credor.contatos.map((c: any) => c.nome).join(', ') || '—'}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <Input
                  value={filters.search}
                  onChange={event => filters.setSearch(event.target.value)}
                  placeholder="Buscar por descrição, favorecido ou centro de custo"
                  className="sm:max-w-md"
                />
                <Select value={filters.statusFilter} onValueChange={value => filters.setStatusFilter(value as typeof filters.statusFilter)}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="PENDENTE">Pendentes</SelectItem>
                    <SelectItem value="VENCIDO">Vencidos</SelectItem>
                    <SelectItem value="PAGO">Pagos</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={filters.selectedMonth || 'TODOS'} 
                  onValueChange={value => filters.setSelectedMonth(value === 'TODOS' ? '' : value)}
                >
                  <SelectTrigger className="sm:w-52">
                    <SelectValue placeholder="Mês">
                      {filters.selectedMonth ? formatarMesAno(filters.selectedMonth) : 'Todos os meses'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os meses</SelectItem>
                    {filters.monthKeys.map(monthKey => (
                      <SelectItem key={monthKey} value={monthKey}>
                        {formatarMesAno(monthKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.favorecidoFilter} onValueChange={filters.setFavorecidoFilter}>
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Favorecido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os favorecidos</SelectItem>
                    {filters.favorecidos.map(favorecido => (
                      <SelectItem key={favorecido} value={favorecido}>{favorecido}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!actions.showForm && (
                <Button onClick={() => { actions.setEditingConta(null); actions.setShowForm(true); }}>
                  <Plus className="mr-1 h-4 w-4" />
                  Novo lançamento
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground">
                {agruparPorFavorecido ? 'Modo Todos: agrupado por favorecido' : 'Modo mensal: listagem linear por vencimento'}
              </div>
              <div className="font-medium">
                {filters.contasFiltradas.length} lançamento(s) • {formatCurrency(totalFiltrado)}
              </div>
            </div>

            {actions.showForm && (
              <ContaPagarForm
                config={config}
                editData={actions.editingConta}
                onSubmit={actions.handleSubmit}
                onClose={() => { actions.setEditingConta(null); actions.setShowForm(false); }}
              />
            )}

            {actions.payingConta && (
              <ContaPagarPaymentModal
                conta={actions.payingConta}
                config={config}
                onSubmit={actions.handleConfirmPagamento}
                onClose={() => actions.setPayingContaId(null)}
              />
            )}

            {actions.reversingConta && (
              <MotivoDialog
                acao={`Revertendo baixa da conta #${actions.reversingConta.numero} ${actions.reversingConta.favorecido}`}
                motivos={config.motivosAlteracao || []}
                onConfirm={actions.handleConfirmReversao}
                onClose={() => actions.setReversingContaId(null)}
              />
            )}

            {actions.pendingDeleteId && (
              <DeleteMotivoModal
                pendingDelete={{ kind: 'conta-pagar', id: actions.pendingDeleteId }}
                motivos={config.motivosAlteracao || []}
                onConfirm={actions.handleConfirmDelete}
                onClose={() => actions.setPendingDeleteId(null)}
              />
            )}

            {filters.contasFiltradas.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="mb-2 text-4xl">🧾</p>
                <p>Nenhum lançamento encontrado</p>
                {!actions.showForm && (
                  <Button className="mt-4" onClick={() => actions.setShowForm(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>
            ) : agruparPorFavorecido ? (
              <div className="space-y-5">
                {grupos.map(grupo => (
                  <section key={grupo.favorecido} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 border-b pb-2">
                      <div>
                        <h3 className="font-semibold">{grupo.favorecido}</h3>
                        <p className="text-xs text-muted-foreground">{formatarResumoGrupo(grupo.contas)}</p>
                      </div>
                      <div className="text-sm font-medium">{formatCurrency(somarValorContas(grupo.contas))}</div>
                    </div>
                    <div className="space-y-3">
                      {grupo.contas.map(conta => (
                        <ContaPagarCard
                          key={conta.id}
                          conta={conta}
                          config={config}
                          onEdit={(id) => {
                            const current = contas.find(item => item.id === id) || null;
                            if (current?.tipoTitulo && current?.credorId) {
                              handleEditarLancamento(current);
                            } else {
                              actions.setEditingConta(current);
                              actions.setShowForm(true);
                            }
                          }}
                          onDelete={actions.setPendingDeleteId}
                          onPagar={actions.setPayingContaId}
                          onReverter={actions.setReversingContaId}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filters.contasFiltradas.map(conta => (
                  <ContaPagarCard
                    key={conta.id}
                    conta={conta}
                    config={config}
                    onEdit={(id) => {
                      const current = contas.find(item => item.id === id) || null;
                      if (current?.tipoTitulo && current?.credorId) {
                        handleEditarLancamento(current);
                      } else {
                        actions.setEditingConta(current);
                        actions.setShowForm(true);
                      }
                    }}
                    onDelete={actions.setPendingDeleteId}
                    onPagar={actions.setPayingContaId}
                    onReverter={actions.setReversingContaId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* =========== DIÁLOGO DE IMPRESSÃO =========== */}
      <Dialog open={impressaoDialogAberto} onOpenChange={setImpressaoDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Imprimir Relatório
            </DialogTitle>
            <DialogDescription>
              Confira as opções abaixo antes de imprimir
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
              <p><strong>Período:</strong> {dadosImpressao.filtradoPor}</p>
              <p><strong>Status:</strong> {dadosImpressao.statusFiltro === 'TODOS' ? 'Todos' : dadosImpressao.statusFiltro}</p>
              <p><strong>Favorecido:</strong> {dadosImpressao.favorecidoFiltro}</p>
              <p><strong>Registros:</strong> {dadosImpressao.itens.length}</p>
              <p><strong>Valor Total:</strong> {formatCurrency(dadosImpressao.totalGeral)}</p>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="somenteTitulos"
                checked={somenteTitulos}
                onCheckedChange={(checked) => setSomenteTitulos(checked as boolean)}
              />
              <label htmlFor="somenteTitulos" className="text-sm cursor-pointer">
                📝 Somente Títulos (exclui despesas)
              </label>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImpressaoDialogAberto(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={confirmarImpressao}>
              <Printer className="h-4 w-4 mr-1" />
              Confirmar e Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========== ESTILOS — SEM TRAVAMENTO =========== */}
      <style>{`
        .print-only {
          display: none;
        }
        
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
            position: static;
            visibility: visible;
            width: 100%;
            background: white;
            padding: 20px;
          }
          
          body {
            visibility: hidden;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          td, th {
            border: 1px solid #ddd;
            padding: 8px;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}