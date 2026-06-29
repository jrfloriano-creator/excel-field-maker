import { useMemo, useState } from 'react';
import { AppConfig, ContaPagar, ContaPagarCredor, ContaPagarDespesaFixa, ContaPagarGrupoDespesa } from '@/types/titulo';
import { SessionUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/calculos';
import { generateId } from '@/lib/storage';
import { useContasPagar } from '@/hooks/useContasPagar';
import { useContaPagarActions } from '@/hooks/useContaPagarActions';
import { useContasPagarFilters } from '@/hooks/useContasPagarFilters';
import { agruparContasPorFavorecido, formatarResumoGrupo, somarValorContas } from '@/lib/contas-pagar';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarCard } from './ContaPagarCard';
import { ContaPagarPaymentModal } from './ContaPagarPaymentModal';
import { ContasPagarGrafico } from './ContasPagarGrafico';
import { ContasPagarDespesas } from './ContasPagarDespesas';
import { DeleteMotivoModal } from '@/components/modals/DeleteMotivoModal';
import { MotivoDialog } from '@/components/MotivoDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Save, Trash2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'lancamento' | 'despesas' | 'grafico' | 'listagem' | 'credores'>('lancamento');
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(null);
  const [lancamentoForm, setLancamentoForm] = useState({ tipoTitulo: '', credorId: '', valor: '', vencimento: new Date().toISOString().split('T')[0] });
  const [configEdit, setConfigEdit] = useState<'titulo' | 'credor' | 'despesa' | 'grupo' | null>(null);
  const [novoTipoTitulo, setNovoTipoTitulo] = useState('');
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novaDespesaNome, setNovaDespesaNome] = useState('');
  const [novaDespesaGrupo, setNovaDespesaGrupo] = useState('');
  const [credorDraft, setCredorDraft] = useState<ContaPagarCredor>({
    id: '',
    nomeEmpresa: '',
    nomeFantasia: '',
    rua: '',
    bairro: '',
    cep: '',
    numero: '',
    telefone: '',
    telefoneWhatsapp: '',
    contatos: [{ id: generateId(), nome: '', telefone: '', whatsapp: '' }],
    createdAt: '',
    updatedAt: '',
  });

  const grupos = useMemo(() => agruparContasPorFavorecido(filters.contasFiltradas), [filters.contasFiltradas]);
  const totalFiltrado = useMemo(() => somarValorContas(filters.contasFiltradas), [filters.contasFiltradas]);
  const agruparPorFavorecido = filters.selectedMonth === '';
  const contasConfig = config.contasPagar;
  const tiposTitulo = contasConfig?.tiposTitulo || [];
  const credores = contasConfig?.credores || [];
  const despesasFixas = contasConfig?.despesasFixas || [];
  const gruposDetalhados = contasConfig?.gruposDetalhados || [];
  const credorSelecionado = credores.find(item => item.id === lancamentoForm.credorId);

  const saveContasPagarConfig = (patch: Partial<NonNullable<AppConfig['contasPagar']>>) => {
    updateConfig({
      contasPagar: {
        ...contasConfig,
        ...patch,
      },
    });
  };

  const resetCredorDraft = () => setCredorDraft({
    id: '',
    nomeEmpresa: '',
    nomeFantasia: '',
    rua: '',
    bairro: '',
    cep: '',
    numero: '',
    telefone: '',
    telefoneWhatsapp: '',
    contatos: [{ id: generateId(), nome: '', telefone: '', whatsapp: '' }],
    createdAt: '',
    updatedAt: '',
  });

  const handleSalvarTipoTitulo = () => {
    const nome = novoTipoTitulo.trim();
    if (!nome) return toast.error('Informe o tipo de título.');
    if (tiposTitulo.some(item => item.toLowerCase() === nome.toLowerCase())) return toast.error('Tipo já cadastrado.');
    saveContasPagarConfig({ tiposTitulo: [...tiposTitulo, nome] });
    setNovoTipoTitulo('');
    setConfigEdit(null);
    toast.success('Tipo de título salvo com sucesso!');
  };

  const handleSalvarCredor = () => {
    if (!credorDraft.nomeEmpresa.trim()) return toast.error('Informe o nome da empresa.');
    const now = new Date().toISOString();
    const novoCredor: ContaPagarCredor = {
      ...credorDraft,
      id: credorDraft.id || generateId(),
      contatos: credorDraft.contatos.filter(contato => contato.nome.trim()),
      createdAt: credorDraft.createdAt || now,
      updatedAt: now,
    };
    const lista = credorDraft.id
      ? credores.map(item => item.id === credorDraft.id ? novoCredor : item)
      : [...credores, novoCredor];
    saveContasPagarConfig({ credores: lista });
    resetCredorDraft();
    setConfigEdit(null);
    toast.success('Credor salvo com sucesso!');
  };

  const handleSalvarDespesa = () => {
    const nome = novaDespesaNome.trim();
    const grupo = novaDespesaGrupo.trim();
    if (!nome || !grupo) return toast.error('Informe despesa e grupo.');
    const now = new Date().toISOString();
    const novaDespesa: ContaPagarDespesaFixa = { id: generateId(), nome, grupo, ativo: true, createdAt: now, updatedAt: now };
    saveContasPagarConfig({ despesasFixas: [...despesasFixas, novaDespesa] });
    setNovaDespesaNome('');
    setNovaDespesaGrupo('');
    setConfigEdit(null);
    toast.success('Despesa fixa salva com sucesso!');
  };

  const handleSalvarGrupo = () => {
    const nome = novoGrupoNome.trim().toUpperCase();
    if (!nome) return toast.error('Informe o grupo.');
    if (gruposDetalhados.some(item => item.nome === nome)) return toast.error('Grupo já cadastrado.');
    const now = new Date().toISOString();
    const novoGrupo: ContaPagarGrupoDespesa = { id: generateId(), nome, itens: [], createdAt: now, updatedAt: now };
    saveContasPagarConfig({
      gruposDetalhados: [...gruposDetalhados, novoGrupo],
      gruposDespesa: [...(contasConfig?.gruposDespesa || []), nome],
    });
    setNovoGrupoNome('');
    setConfigEdit(null);
    toast.success('Grupo salvo com sucesso!');
  };

  const handleSalvarLancamento = async () => {
    const valor = Number(lancamentoForm.valor.replace(',', '.'));
    if (!lancamentoForm.tipoTitulo || !lancamentoForm.credorId || !lancamentoForm.vencimento || !Number.isFinite(valor) || valor <= 0) {
      return toast.error('Preencha tipo, credor, valor e vencimento.');
    }
    const credor = credores.find(item => item.id === lancamentoForm.credorId);
    if (!credor) return toast.error('Credor inválido.');
    const payload: Partial<ContaPagar> = {
      descricao: `${lancamentoForm.tipoTitulo} - ${credor.nomeEmpresa}`,
      categoria: 'FORNECEDOR',
      tipoTitulo: lancamentoForm.tipoTitulo,
      favorecido: credor.nomeEmpresa,
      credorId: credor.id,
      valor,
      vencimento: lancamentoForm.vencimento,
      competencia: lancamentoForm.vencimento.slice(0, 7),
    };
    try {
      if (editingLancamentoId) {
        await updateConta(editingLancamentoId, payload);
        setEditingLancamentoId(null);
      } else {
        await addConta(payload as Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>);
      }
      setLancamentoForm({ tipoTitulo: '', credorId: '', valor: '', vencimento: new Date().toISOString().split('T')[0] });
      toast.success('Lançamento salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar lançamento.');
    }
  };

  const handleEditarLancamento = (conta: ContaPagar) => {
    setEditingLancamentoId(conta.id);
    setLancamentoForm({
      tipoTitulo: conta.tipoTitulo || '',
      credorId: conta.credorId || '',
      valor: String(conta.valor),
      vencimento: conta.vencimento,
    });
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>TÍTULO</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfigEdit(configEdit === 'titulo' ? null : 'titulo')}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button size="sm" onClick={handleSalvarTipoTitulo}><Save className="h-4 w-4 mr-1" />Salvar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={novoTipoTitulo} onChange={(event) => setNovoTipoTitulo(event.target.value)} placeholder="Novo tipo de título" className={configEdit === 'titulo' ? 'text-red-600' : ''} />
            </div>
            <div className="flex flex-wrap gap-2">
              {tiposTitulo.map(tipo => (
                <div key={tipo} className="rounded border px-3 py-1 text-sm">{tipo}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>CREDOR</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfigEdit(configEdit === 'credor' ? null : 'credor')}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button size="sm" onClick={handleSalvarCredor}><Save className="h-4 w-4 mr-1" />Salvar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Nome Empresa</Label><Input value={credorDraft.nomeEmpresa} onChange={(event) => setCredorDraft(prev => ({ ...prev, nomeEmpresa: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Nome Fantasia</Label><Input value={credorDraft.nomeFantasia || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, nomeFantasia: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Rua</Label><Input value={credorDraft.rua || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, rua: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Bairro</Label><Input value={credorDraft.bairro || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, bairro: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>CEP</Label><Input value={credorDraft.cep || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, cep: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Número</Label><Input value={credorDraft.numero || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, numero: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Telefone</Label><Input value={credorDraft.telefone || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, telefone: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
              <div><Label>Telefone WhatsApp</Label><Input value={credorDraft.telefoneWhatsapp || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, telefoneWhatsapp: event.target.value }))} className={configEdit === 'credor' ? 'text-red-600' : ''} /></div>
            </div>
            <div className="space-y-2">
              <Label>Contatos</Label>
              {credorDraft.contatos.map((contato, index) => (
                <div key={contato.id} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input value={contato.nome} onChange={(event) => setCredorDraft(prev => ({ ...prev, contatos: prev.contatos.map(item => item.id === contato.id ? { ...item, nome: event.target.value } : item) }))} placeholder={`Contato ${index + 1}`} className={configEdit === 'credor' ? 'text-red-600' : ''} />
                  <Input value={contato.telefone || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, contatos: prev.contatos.map(item => item.id === contato.id ? { ...item, telefone: event.target.value } : item) }))} placeholder="Telefone" className={configEdit === 'credor' ? 'text-red-600' : ''} />
                  <Input value={contato.whatsapp || ''} onChange={(event) => setCredorDraft(prev => ({ ...prev, contatos: prev.contatos.map(item => item.id === contato.id ? { ...item, whatsapp: event.target.value } : item) }))} placeholder="WhatsApp" className={configEdit === 'credor' ? 'text-red-600' : ''} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCredorDraft(prev => ({ ...prev, contatos: prev.contatos.filter(item => item.id !== contato.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setCredorDraft(prev => ({ ...prev, contatos: [...prev.contatos, { id: generateId(), nome: '', telefone: '', whatsapp: '' }] }))}>
                <Plus className="h-4 w-4 mr-1" />Adicionar contato
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>DESPESAS</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfigEdit(configEdit === 'despesa' ? null : 'despesa')}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button size="sm" onClick={handleSalvarDespesa}><Save className="h-4 w-4 mr-1" />Salvar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={novaDespesaNome} onChange={(event) => setNovaDespesaNome(event.target.value)} placeholder="Nova despesa fixa" className={configEdit === 'despesa' ? 'text-red-600' : ''} />
              <Select value={novaDespesaGrupo || 'none'} onValueChange={(value) => setNovaDespesaGrupo(value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {gruposDetalhados.map(grupo => <SelectItem key={grupo.id} value={grupo.nome}>{grupo.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {despesasFixas.map(item => <div key={item.id} className="rounded border px-3 py-2 text-sm">{item.nome} • {item.grupo}</div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>GRUPO</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfigEdit(configEdit === 'grupo' ? null : 'grupo')}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button size="sm" onClick={handleSalvarGrupo}><Save className="h-4 w-4 mr-1" />Salvar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={novoGrupoNome} onChange={(event) => setNovoGrupoNome(event.target.value)} placeholder="Novo grupo de despesa" className={configEdit === 'grupo' ? 'text-red-600' : ''} />
            <div className="space-y-2">
              {gruposDetalhados.map(grupo => <div key={grupo.id} className="rounded border px-3 py-2 text-sm">{grupo.nome}</div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'lancamento' ? (
        <Card>
          <CardHeader><CardTitle>Lançamento de Títulos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>Tipo de Título</Label>
                <Select value={lancamentoForm.tipoTitulo || 'none'} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, tipoTitulo: value === 'none' ? '' : value }))}>
                  <SelectTrigger className={editingLancamentoId ? 'text-red-600' : ''}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{tiposTitulo.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credor</Label>
                <Select value={lancamentoForm.credorId || 'none'} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, credorId: value === 'none' ? '' : value }))}>
                  <SelectTrigger className={editingLancamentoId ? 'text-red-600' : ''}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{credores.map(credor => <SelectItem key={credor.id} value={credor.id}>{credor.nomeEmpresa}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input value={lancamentoForm.valor} onChange={(event) => setLancamentoForm(prev => ({ ...prev, valor: event.target.value }))} className={editingLancamentoId ? 'text-red-600' : ''} />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input type="date" value={lancamentoForm.vencimento} onChange={(event) => setLancamentoForm(prev => ({ ...prev, vencimento: event.target.value }))} className={editingLancamentoId ? 'text-red-600' : ''} />
              </div>
            </div>
            {credorSelecionado && <div className="text-sm text-muted-foreground">Credor selecionado: {credorSelecionado.nomeEmpresa}</div>}
            <div className="flex gap-2">
              <Button onClick={handleSalvarLancamento}>Salvar</Button>
              <Button variant="outline" onClick={() => {
                const conta = contas.find(item => item.id === editingLancamentoId);
                if (conta) handleEditarLancamento(conta);
              }}>Editar</Button>
            </div>
          </CardContent>
        </Card>
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
          {credores.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground">Nenhum credor cadastrado.</div>
          ) : credores.map(credor => (
            <Card key={credor.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{credor.nomeEmpresa}</CardTitle>
                  <p className="text-sm text-muted-foreground">{credor.nomeFantasia || 'Sem nome fantasia'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setCredorDraft(credor);
                  setConfigEdit('credor');
                }}>Editar</Button>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
                <div>Rua: {credor.rua || '—'}</div>
                <div>Bairro: {credor.bairro || '—'}</div>
                <div>CEP: {credor.cep || '—'}</div>
                <div>Número: {credor.numero || '—'}</div>
                <div>Telefone: {credor.telefone || '—'}</div>
                <div>WhatsApp: {credor.telefoneWhatsapp || '—'}</div>
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