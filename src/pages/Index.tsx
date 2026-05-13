import { useState, useEffect, useMemo } from 'react';
import { useTitulos } from '@/hooks/useTitulos';
import { useFilters } from '@/hooks/useFilters';
import { useTituloActions } from '@/hooks/useTituloActions';
import { calcularTitulo, getMonthKey, formatMonthLabel } from '@/lib/calculos';
import { TitulosFilters } from '@/components/TitulosFilters';
import { TitulosTable } from '@/components/TitulosTable';
import { TituloFormModal } from '@/components/modals/TituloFormModal';
import { PagarFormModal } from '@/components/modals/PagarFormModal';
import { DeleteMotivoModal } from '@/components/modals/DeleteMotivoModal';
import { DashboardChart } from '@/components/DashboardChart';
import { ConfigPanel } from '@/components/ConfigPanel';
import { Relatorios } from '@/components/Relatorios';
import { ClientesManager } from '@/components/ClientesManager';
import { PromissoriaTabs } from '@/components/PromissoriaTabs';
import { AvatarAjuda } from '@/components/AvatarAjuda';
import { LoginScreen } from '@/components/LoginScreen';
import { VendasTab } from '@/components/VendasTab';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, List, Settings2, FileText, Users, ScrollText, LogOut, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { SessionUser, getSession, setSession, appendLog, hasPerm } from '@/lib/auth';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config';

const Index = () => {
  const { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos, loading } = useTitulos();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tab, setTab] = useState<Tab>('lista');

  useEffect(() => {
    getSession().then(u => { setUser(u); setLoadingSession(false); });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', config.darkMode);
  }, [config.darkMode]);

  const titulosCalculados = useMemo(
    () => titulos.map(t => calcularTitulo(t, config.taxa)).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()),
    [titulos, config.taxa]
  );

  const filters = useFilters(titulosCalculados);
  const actions = useTituloActions({ titulos, titulosCalculados, config, updateConfig, addTitulo, updateTitulo, deleteTitulo, user });

  if (loading || loadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando dados...</p>
      </div>
    );
  }

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

      {(tab === 'lista' || tab === 'dashboard') && filters.monthKeys.length > 0 && (
        <div className="bg-card border-b border-border px-2 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tab === 'dashboard' && (
              <button onClick={() => filters.setDashboardMonth('')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${filters.dashboardMonth === '' ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'}`}>
                Todos
              </button>
            )}
            {filters.monthKeys.map(mk => {
              const active = tab === 'lista' ? filters.selectedMonth === mk : filters.dashboardMonth === mk;
              return (
                <button key={mk}
                  onClick={() => tab === 'lista' ? filters.setSelectedMonth(mk) : filters.setDashboardMonth(mk)}
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
            <TituloFormModal
              show={actions.showForm}
              editData={actions.editingTitulo}
              config={config}
              user={user}
              onSubmit={actions.handleAdd}
              onClose={() => { actions.setShowForm(false); actions.setEditingTitulo(null); }}
            />
            <PagarFormModal
              pagarId={actions.pagarId}
              titulo={actions.pagarTitulo}
              creditoCliente={actions.creditoCliente}
              config={config}
              onSubmit={actions.handleConfirmPagar}
              onClose={() => actions.setPagarId(null)}
            />
            <TitulosFilters
              filtro={filters.filtro}
              setFiltro={filters.setFiltro}
              titulosByMonth={filters.titulosByMonth}
            />
            <TitulosTable
              titulosFiltrados={filters.titulosFiltrados}
              config={config}
              onEdit={actions.handleEdit}
              onDelete={actions.askDelete}
              onPagar={actions.handlePagar}
              onAddNew={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }}
            />
            {!actions.showForm && (
              <button onClick={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }}
                className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20">
                <Plus className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {tab === 'dashboard' && (
          <DashboardChart
            titulos={filters.dashboardMonth ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === filters.dashboardMonth) : titulosCalculados}
            showValorTotal={hasPerm(config, user, 'dash.valorTotal')}
            onClickVencidos={() => { filters.setFiltro('VENCIDO'); setTab('lista'); }}
          />
        )}
        {tab === 'relatorios' && <Relatorios titulos={titulos} config={config} />}
        {tab === 'clientes' && (
          <ClientesManager
            clientes={config.clientes}
            onUpdate={(clientes) => updateConfig({ clientes })}
            titulos={titulos}
            requirePin={(kind, id) => {
              if (kind === 'delete') actions.setPendingDelete({ kind: 'cliente', id });
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

      <DeleteMotivoModal
        pendingDelete={actions.pendingDelete}
        motivosAlteracao={config.motivosAlteracao || []}
        onConfirm={actions.confirmDelete}
        onClose={() => actions.setPendingDelete(null)}
      />
    </div>
  );
};

export default Index;
