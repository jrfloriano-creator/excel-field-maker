import { useState, useEffect, useMemo } from 'react';
import { useTitulos } from '@/hooks/useTitulos';
import { calcularTitulo, getMonthKey, formatMonthLabel, buildPagamentoWhatsMsg, whatsLink } from '@/lib/calculos';
import { TituloCard } from '@/components/TituloCard';
import { TituloForm } from '@/components/TituloForm';
import { PagarForm } from '@/components/PagarForm';
import { DashboardChart } from '@/components/DashboardChart';
import { ConfigPanel } from '@/components/ConfigPanel';
import { Relatorios } from '@/components/Relatorios';
import { ClientesManager } from '@/components/ClientesManager';
import { PromissoriaTabs } from '@/components/PromissoriaTabs';
import { AvatarAjuda } from '@/components/AvatarAjuda';
import { LoginScreen } from '@/components/LoginScreen';
import { MotivoDialog } from '@/components/MotivoDialog';
import { VendasTab } from '@/components/VendasTab';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, List, Settings2, FileText, Users, ScrollText, LogOut, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Titulo, Proprietario } from '@/types/titulo';
import { SessionUser, getSession, setSession, appendLog, hasPerm } from '@/lib/auth';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config';

const Index = () => {
  const { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos } = useTitulos();
  const [user, setUser] = useState<SessionUser | null>(getSession());
  const [tab, setTab] = useState<Tab>('lista');
  const [showForm, setShowForm] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<Titulo | null>(null);
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO'>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardMonth, setDashboardMonth] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'titulo' | 'cliente'; id: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', config.darkMode);
  }, [config.darkMode]);

  const titulosCalculados = useMemo(
    () => titulos.map(t => calcularTitulo(t, config.taxa)).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()),
    [titulos, config.taxa]
  );
  const monthKeys = Array.from(new Set(titulosCalculados.map(t => getMonthKey(t.vencimento)))).sort();

  useEffect(() => {
    if (monthKeys.length === 0) return;
    const now = new Date();
    const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const def = monthKeys.includes(k) ? k : monthKeys[0];
    if (!selectedMonth) setSelectedMonth(def);
    if (dashboardMonth === null) setDashboardMonth(def);
  }, [monthKeys, selectedMonth, dashboardMonth]);

  if (!user) {
    return (
      <LoginScreen
        config={config}
        onUpdate={updateConfig}
        onLogin={(u) => {
          setSession(u);
          setUser(u);
          appendLog(config, updateConfig, u, 'login', `Login de ${u.nome} (${u.nivel})`);
          toast.success(`Bem-vindo, ${u.nome}`);
        }}
      />
    );
  }

  const logout = () => {
    appendLog(config, updateConfig, user, 'logout', `Logout de ${user.nome}`);
    setSession(null);
    setUser(null);
  };

  const titulosByMonth = selectedMonth
    ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === selectedMonth)
    : titulosCalculados;
  const titulosFiltrados = filtro === 'TODOS' ? titulosByMonth : titulosByMonth.filter(t => t.situacao === filtro);

  const handleAdd = (data: any) => {
    if (editingTitulo) {
      updateTitulo(editingTitulo.id, data);
      appendLog(config, updateConfig, user, 'titulo.editar', `Editou título #${editingTitulo.numero}`);
      setEditingTitulo(null); setShowForm(false);
      toast.success('Título atualizado!');
    } else {
      addTitulo(data);
      appendLog(config, updateConfig, user, 'titulo.criar', `Criou título ${data.tipo} ${data.cliente} ${data.valor}`);
      setShowForm(false);
      toast.success('Título adicionado!');
    }
  };

  const askDelete = (id: string) => setPendingDelete({ kind: 'titulo', id });

  const confirmDelete = (motivo: string) => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'titulo') {
      const t = titulos.find(x => x.id === pendingDelete.id);
      deleteTitulo(pendingDelete.id);
      appendLog(config, updateConfig, user, 'titulo.excluir', `Excluiu título #${t?.numero} (${t?.cliente}). Motivo: ${motivo}`);
      toast.success('Título removido');
    } else {
      const c = config.clientes.find(x => x.id === pendingDelete.id);
      updateConfig({ clientes: config.clientes.filter(c => c.id !== pendingDelete.id) });
      appendLog(config, updateConfig, user, 'cliente.excluir', `Excluiu cliente ${c?.nome}. Motivo: ${motivo}`);
      toast.success('Cliente removido');
    }
    setPendingDelete(null);
  };

  const handleEdit = (id: string) => {
    const t = titulos.find(x => x.id === id);
    if (t) { setEditingTitulo(t); setShowForm(true); }
  };

  const handlePagar = (id: string) => {
    if (config.funcionarios.length === 0) { toast.error('Cadastre um funcionário em Configurações'); return; }
    setPagarId(id);
  };

  const handleConfirmPagar = (data: any) => {
    if (!pagarId) return;
    const t = titulosCalculados.find(x => x.id === pagarId);
    updateTitulo(pagarId, {
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago,
      recebidoPor: data.recebidoPor,
      formaPagamento: data.formaPagamento,
      creditoAplicado: data.creditoAplicado,
      creditoGerado: data.creditoGerado,
    });
    appendLog(config, updateConfig, user, 'titulo.pagar',
      `Recebeu título #${t?.numero} ${t?.cliente} ${data.formaPagamento} ${data.valorPago} por ${data.recebidoPor}${data.enviarWhats ? ' [WhatsApp enviado]' : ''}`);
    if (data.enviarWhats && t?.telefone) {
      const cli = config.clientes.find(c => c.id === t.clienteId);
      const apelido = (cli?.apelido && cli.apelido.trim()) || t.cliente;
      const msg = buildPagamentoWhatsMsg({
        apelido,
        formaPagamento: data.formaPagamento,
        valorPago: data.valorPago,
        tipoTitulo: t.tipo,
        recebidoPor: data.recebidoPor,
        creditoGerado: data.creditoGerado,
      });
      window.open(whatsLink(t.telefone, msg), '_blank');
      appendLog(config, updateConfig, user, 'whatsapp.pagamento', `WhatsApp pagamento p/ ${apelido}`);
    }
    setPagarId(null);
    toast.success('Pagamento registrado!');
  };

  const pagarTitulo = pagarId ? titulosCalculados.find(t => t.id === pagarId) : null;
  // Calcula crédito disponível do cliente (soma de creditoGerado de meses anteriores não consumidos é simplificado: usa apenas o mais recente pago)
  const creditoCliente = pagarTitulo
    ? titulos.filter(x => x.clienteId === pagarTitulo.clienteId && x.id !== pagarTitulo.id && x.creditoGerado).reduce((s, x) => s + (x.creditoGerado || 0), 0)
      - titulos.filter(x => x.clienteId === pagarTitulo.clienteId && x.id !== pagarTitulo.id).reduce((s, x) => s + (x.creditoAplicado || 0), 0)
    : 0;

  const navItems = [
    { id: 'lista' as Tab, icon: List, label: 'Títulos' },
    { id: 'clientes' as Tab, icon: Users, label: 'Clientes' },
    { id: 'promissoria' as Tab, icon: ScrollText, label: 'Promiss.' },
    { id: 'vendas' as Tab, icon: ShoppingCart, label: 'Vendas' },
    { id: 'dashboard' as Tab, icon: BarChart3, label: 'Dash' },
    { id: 'relatorios' as Tab, icon: FileText, label: 'Relat.' },
    { id: 'config' as Tab, icon: Settings2, label: 'Config' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-3 py-2 shadow-md">
        <div className="flex items-center gap-2">
          {config.logoEmpresa && (
            <img src={config.logoEmpresa} alt="Logo" className="h-9 object-contain bg-white rounded p-0.5" />
          )}
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold tracking-tight">💰 Controle Financeiro ZOOM</h1>
            <p className="text-[10px] opacity-80">Taxa: {(config.taxa * 100).toFixed(1)}% a.m. • {user.nome} ({user.nivel})</p>
          </div>
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={logout}>
            <LogOut className="h-3 w-3 mr-1" /> LOGIN
          </Button>
        </div>
      </header>

      {(tab === 'lista' || tab === 'dashboard') && monthKeys.length > 0 && (
        <div className="bg-card border-b border-border px-2 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tab === 'dashboard' && (
              <button onClick={() => setDashboardMonth('')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${dashboardMonth === '' ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'}`}>
                Todos
              </button>
            )}
            {monthKeys.map(mk => {
              const active = tab === 'lista' ? selectedMonth === mk : dashboardMonth === mk;
              return (
                <button key={mk}
                  onClick={() => tab === 'lista' ? setSelectedMonth(mk) : setDashboardMonth(mk)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${active ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'}`}>
                  {formatMonthLabel(mk)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-28 space-y-4">
        {tab === 'lista' && (
          <>
            {showForm && (
              <TituloForm onSubmit={handleAdd} onClose={() => { setShowForm(false); setEditingTitulo(null); }}
                editData={editingTitulo} clientes={config.clientes} proprietarios={config.proprietarios} />
            )}
            {pagarId && pagarTitulo && (
              <PagarForm
                clienteNome={pagarTitulo.cliente}
                valorOriginal={pagarTitulo.valorCorrigido}
                creditoDisponivel={Math.max(0, creditoCliente)}
                funcionarios={config.funcionarios}
                formasPagamento={config.formasPagamento || []}
                onSubmit={handleConfirmPagar}
                onClose={() => setPagarId(null)}
              />
            )}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['TODOS','VENCIDO','NO PRAZO','PAGO'] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${filtro === f ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'}`}>
                  {f === 'TODOS' ? `Todos (${titulosByMonth.length})` :
                   f === 'VENCIDO' ? `Vencidos (${titulosByMonth.filter(t => t.situacao === 'VENCIDO').length})` :
                   f === 'NO PRAZO' ? `No Prazo (${titulosByMonth.filter(t => t.situacao === 'NO PRAZO').length})` :
                   `Pagos (${titulosByMonth.filter(t => t.situacao === 'PAGO').length})`}
                </button>
              ))}
            </div>
            {titulosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-4xl mb-2">📋</p>
                <p>Nenhum título encontrado</p>
                <Button className="mt-4" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {titulosFiltrados.map(t => (
                  <TituloCard key={t.id} titulo={t} onDelete={askDelete} onPagar={handlePagar} onEdit={handleEdit}
                    chavesPix={config.chavesPix} proprietarios={config.proprietarios} clientes={config.clientes} />
                ))}
              </div>
            )}
            {!showForm && (
              <button onClick={() => { setEditingTitulo(null); setShowForm(true); }}
                className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20">
                <Plus className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {tab === 'dashboard' && (
          <DashboardChart
            titulos={dashboardMonth ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === dashboardMonth) : titulosCalculados}
            showValorTotal={hasPerm(config, user, 'dash.valorTotal')}
            onClickVencidos={() => { setFiltro('VENCIDO'); setTab('lista'); }}
          />
        )}
        {tab === 'relatorios' && <Relatorios titulos={titulos} config={config} />}
        {tab === 'clientes' && (
          <ClientesManager
            clientes={config.clientes}
            onUpdate={(clientes) => updateConfig({ clientes })}
            titulos={titulos}
            requirePin={(kind, id) => {
              if (kind === 'delete') setPendingDelete({ kind: 'cliente', id });
              else window.dispatchEvent(new CustomEvent('cliente-edit-unlock', { detail: id }));
            }}
          />
        )}
        {tab === 'promissoria' && <PromissoriaTabs config={config} onAddTitulos={(novos) => addTitulos(novos)} />}
        {tab === 'vendas' && <VendasTab config={config} onUpdate={updateConfig} user={user} onNewCliente={() => setTab('clientes')} />}
        {tab === 'config' && <ConfigPanel config={config} onUpdate={updateConfig} titulos={titulos} onImportTitulos={replaceTitulos} user={user} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center py-2 ${tab === item.id ? 'text-primary ring-2 ring-primary ring-inset rounded-md' : 'text-muted-foreground'}`}>
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AvatarAjuda ativo={config.avatarAjudaAtivo ?? true} tab={tab} />

      {pendingDelete && (
        <MotivoDialog
          acao={pendingDelete.kind === 'titulo' ? 'Excluindo título' : 'Excluindo cliente'}
          motivos={config.motivosAlteracao || []}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

export default Index;
