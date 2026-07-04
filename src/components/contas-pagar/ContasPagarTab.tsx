import { useMemo, useState } from 'react';
import { AppConfig, ContaPagar } from '@/types/titulo';
import { SessionUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/calculos';
import { useContasPagar } from '@/hooks/useContasPagar';
import { useContaPagarActions } from '@/hooks/useContaPagarActions';
import { useContasPagarFilters } from '@/hooks/useContasPagarFilters';
import { useContasPagarCatalog } from '@/hooks/useContasPagarCatalog';
import { agruparContasPorFavorecido, formatarResumoGrupo, somarValorContas } from '@/lib/contas-pagar';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarCard } from './ContaPagarCard';
import { ContaPagarPaymentModal } from './ContaPagarPaymentModal';
import { ContasPagarGrafico } from './ContasPagarGrafico';
import { ContasPagarDespesas } from './ContasPagarDespesas';
import { LancamentoTitulo, LancamentoTituloPayload } from './LancamentoTitulo';
import { DeleteMotivoModal } from '@/components/modals/DeleteMotivoModal';
import { MotivoDialog } from '@/components/MotivoDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ContasPagarTabProps {
  config: AppConfig;
  updateConfig: (data: Partial<AppConfig>) => void;
  user: SessionUser | null;
}

export function ContasPagarTab({ config, updateConfig, user }: ContasPagarTabProps) {
  const { contas, contasCalculadas, titulos, loading, addConta, updateConta, deleteConta } = useContasPagar();
  const actions = useContaPagarActions({ contas, contasCalculadas, config, updateConfig, addConta, updateConta, deleteConta, user });
  const filters = useContasPagarFilters(contasCalculadas);
  const catalog = useContasPagarCatalog();
  const [activeTab, setActiveTab] = useState<'lancamento' | 'despesas' | 'grafico' | 'listagem' | 'credores'>('lancamento');
  const [editingLancamento, setEditingLancamento] = useState<ContaPagar | null>(null);

  const grupos = useMemo(() => agruparContasPorFavorecido(filters.contasFiltradas), [filters.contasFiltradas]);
  const totalFiltrado = useMemo(() => somarValorContas(filters.contasFiltradas), [filters.contasFiltradas]);
  const agruparPorFavorecido = filters.selectedMonth === '';
  const contasConfig = config.contasPagar;

  const saveContasPagarConfig = (patch: Partial<NonNullable<AppConfig['contasPagar']>>) => {
    updateConfig({
      contasPagar: {
        ...contasConfig,
        ...patch,
      },
    });
  };

  const handleSalvarLancamento = async (payload: LancamentoTituloPayload) => {
    const contaPayload: Partial<ContaPagar> = {
      descricao: payload.descricao || `${payload.tipoTituloNome} - ${payload.credorNome}`,
      categoria: 'FORNECEDOR',
      tipoTitulo: payload.tipoTituloNome,
      favorecido: payload.credorNome,
      credorId: payload.credorId,
      valor: payload.valor,
      vencimento: payload.vencimento,
      competencia: payload.vencimento.slice(0, 7),
    };
    if (editingLancamento) {
      await updateConta(editingLancamento.id, contaPayload);
      setEditingLancamento(null);
    } else {
      await addConta(contaPayload as Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>);
    }
  };

  const handleEditarLancamento = (conta: ContaPagar) => {
    setEditingLancamento(conta);
    setActiveTab('lancamento');
  };

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando contas a pagar...</div>;
  }

  return (
    <div className="space-y-4">
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
        <Button type="button" variant={activeTab === 'listagem' ? 'default' : 'outline'} onClick={() => setActiveTab('listagem')}>
          Listagem
        </Button>
        <Button type="button" variant={activeTab === 'credores' ? 'default' : 'outline'} onClick={() => setActiveTab('credores')}>
          Credores
        </Button>
      </div>

      {activeTab === 'lancamento' ? (
        <LancamentoTitulo
          editingConta={editingLancamento}
          onSubmit={handleSalvarLancamento}
          onCancelEdit={() => setEditingLancamento(null)}
        />
      ) : activeTab === 'grafico' ? (
        <ContasPagarGrafico
          contas={contasCalculadas}
          titulos={titulos}
          vendas={config.vendas || []}
          taxa={config.taxa}
          selectedMonth={filters.selectedMonth}
          onSelectMonth={filters.setSelectedMonth}
          onOpenVencidos={() => {
            filters.setStatusFilter('VENCIDO');
            setActiveTab('listagem');
          }}
        />
      ) : activeTab === 'despesas' ? (
        <ContasPagarDespesas
          config={config}
          contas={contas}
          onUpdateConta={updateConta}
          onUpdateConfig={saveContasPagarConfig}
        />
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
                <div className="md:col-span-2">Contatos: {credor.contatos.map(contato => contato.nome).join(', ') || '—'}</div>
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
              <Select value={filters.selectedMonth || 'TODOS'} onValueChange={value => filters.setSelectedMonth(value === 'TODOS' ? '' : value)}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os meses</SelectItem>
                  {filters.monthKeys.map(monthKey => (
                    <SelectItem key={monthKey} value={monthKey}>{monthKey}</SelectItem>
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
  );
}