import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Sidebar } from '@/components/Sidebar';
import { IdleTimerManager } from '@/components/IdleTimerManager';
import { AniversariantesPage } from '@/components/AniversariantesPage';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SessionUser, getSession, setSession, appendLog, hasPerm } from '@/lib/auth';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config' | 'aniversariantes';

// Real-time clock hook
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const TAB_SUBTITLES: Record<Tab, string> = {
  lista: 'Títulos',
  dashboard: 'Dashboard',
  relatorios: 'Relatórios',
  clientes: 'Clientes',
  promissoria: 'Promissórias',
  vendas: 'Vendas',
  config: 'Configurações',
  aniversariantes: 'Aniversariantes',
};

const Index = () => {
  const { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos, loading } = useTitulos();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const now = useClock();

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

  const formAreaRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    setTimeout(() => {
      formAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleEdit = (id: string) => {
    actions.handleEdit(id);
    scrollToForm();
  };

  const handlePagar = (id: string) => {
    actions.handlePagar(id);
    scrollToForm();
  };

  if (loading || loadingSession) {
    return (
      <div className="min-h-screen bg-[#1a2035] flex items-center justify-center">
        <p className="text-white/60 animate-pulse font-[Poppins]">Carregando dados...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        config={config}
        loading={loading}
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

  // Format clock
  const clockDate = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const clockTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const showMonthBar = tab === 'lista' || tab === 'dashboard';

  return (
    <div className="zoom-layout">
      {/* Sidebar */}
      <Sidebar
        tab={tab}
        onTabChange={(t) => setTab(t)}
        onLogout={logout}
        userName={user.nome}
        userLevel={user.nivel}
        logoEmpresa={config.logoEmpresa}
      />

      {/* Main wrapper */}
      <div className="zoom-main">
        {/* Top Header */}
        <header className="zoom-top-header">
          <div className="zoom-header-title">
            Sistema <span>ZOOM</span>
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#718096', marginLeft: '8px' }}>
              • {TAB_SUBTITLES[tab]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="zoom-clock">
              <div className="zoom-clock-date">{clockDate}</div>
              <div className="zoom-clock-time">{clockTime}</div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs hidden sm:flex"
              onClick={logout}
            >
              Sair
            </Button>
          </div>
        </header>

        {/* Month bar */}
        {showMonthBar && filters.monthKeys.length > 0 && (
          <div className="zoom-month-bar">
            <div className="zoom-month-bar-inner">
              {tab === 'dashboard' && (
                <button
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                  style={filters.dashboardMonth === ''
                    ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 }
                    : { background: '#1a2035', border: '1px solid #334155' }}
                  onClick={() => filters.setDashboardMonth('')}
                >
                  Todos
                </button>
              )}
              {tab === 'lista' && (
                <button
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                  style={filters.selectedMonth === ''
                    ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 }
                    : { background: '#1a2035', border: '1px solid #334155' }}
                  onClick={() => filters.setSelectedMonth('')}
                >
                  Todos
                </button>
              )}
              {filters.monthKeys.map(mk => {
                const active = tab === 'lista' ? filters.selectedMonth === mk : filters.dashboardMonth === mk;
                return (
                  <button
                    key={mk}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                    style={active
                      ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 }
                      : { background: '#1a2035', border: '1px solid #334155' }}
                    onClick={() => tab === 'lista' ? filters.setSelectedMonth(mk) : filters.setDashboardMonth(mk)}
                  >
                    {formatMonthLabel(mk)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="zoom-content">
          {/* Page title */}
          <div className="mb-5 flex items-baseline gap-3 flex-wrap">
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c', fontFamily: 'Poppins, sans-serif' }}>
              {TAB_SUBTITLES[tab]}
            </h2>
          </div>

          {/* TÍTULOS */}
          {tab === 'lista' && (
            <>
              <div ref={formAreaRef}>
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
                  user={user}
                  onSubmit={actions.handleConfirmPagar}
                  onClose={() => actions.setPagarId(null)}
                />
              </div>
              <TitulosFilters
                filtro={filters.filtro}
                setFiltro={filters.setFiltro}
                titulosByMonth={filters.titulosByMonth}
                proprietarioFilter={filters.proprietarioFilter}
                setProprietarioFilter={filters.setProprietarioFilter}
                proprietarios={config.proprietarios}
              />
              <TitulosTable
                titulosFiltrados={filters.titulosFiltrados}
                config={config}
                onEdit={handleEdit}
                onDelete={actions.askDelete}
                onPagar={handlePagar}
                onAddNew={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }}
              />
              {!actions.showForm && (
                <button
                  onClick={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }}
                  className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center z-20"
                  style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', boxShadow: '0 4px 16px rgba(79,172,254,.5)' }}
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </>
          )}

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <>
              {config.proprietarios.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Proprietário:</span>
                  <Select
                    value={filters.dashboardProprietarioFilter}
                    onValueChange={filters.setDashboardProprietarioFilter}
                  >
                    <SelectTrigger className="h-8 text-xs w-48">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {config.proprietarios.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DashboardChart
                titulos={
                  filters.dashboardMonth
                    ? filters.titulosDashboardByProprietario.filter(t => getMonthKey(t.vencimento) === filters.dashboardMonth)
                    : filters.titulosDashboardByProprietario
                }
                allTitulos={filters.titulosDashboardByProprietario}
                showValorTotal={hasPerm(config, user, 'dash.valorTotal')}
                onClickVencidos={() => { filters.setFiltro('VENCIDO'); setTab('lista'); }}
                vendas={config.vendas || []}
                selectedMonth={filters.dashboardMonth ?? undefined}
              />
            </>
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

          {tab === 'promissoria' && <PromissoriaTabs config={config} titulos={titulos} onAddTitulos={(novos) => addTitulos(novos)} />}

          {tab === 'aniversariantes' && <AniversariantesPage config={config} />}

          {tab === 'vendas' && (
            <VendasTab config={config} onUpdate={updateConfig} user={user} onNewCliente={() => setTab('clientes')} />
          )}

          {tab === 'config' && (
            <ConfigPanel config={config} onUpdate={updateConfig} titulos={titulos} onImportTitulos={replaceTitulos} user={user} />
          )}
        </main>
      </div>

      <AvatarAjuda ativo={config.avatarAjudaAtivo ?? true} tab={tab} />

      <IdleTimerManager config={config} onIdle={() => {
        appendLog(config, updateConfig, user, 'logout', `Logout automático por ociosidade de ${user.nome}`);
        setSession(null);
        setUser(null);
      }} />

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
