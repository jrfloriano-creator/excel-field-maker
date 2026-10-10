import { agendarBackupAutomatico } from '@/lib/backup';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { ContasPagarTab } from '@/components/contas-pagar/ContasPagarTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronRight, Home, Users, Building2, CreditCard, Database, Bell, Palette, Coins, Tag, Key, Settings, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { SessionUser, getSession, setSession, appendLog, hasPerm } from '@/lib/auth';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config' | 'aniversariantes' | 'contas-pagar';
type PainelAba = 'cadastros' | 'financeiro' | 'contas-pagar' | 'alertas' | 'aparencia' | 'sistema';

// 📋 NÍVEL 1 — Grupos Principais
interface GrupoConfig {
  id: PainelAba;
  titulo: string;
  descricao: string;
  icone: any;
  cor: string;
}

// 📋 NÍVEL 2 — Cards dentro de cada grupo
interface CardInterno {
  id: string;
  nome: string;
  descricao: string;
  icone: any;
}

const GRUPOS_PRINCIPAIS: GrupoConfig[] = [
  { id: 'cadastros', titulo: 'Cadastros', descricao: 'Dados básicos do sistema', icone: Users, cor: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { id: 'financeiro', titulo: 'Financeiro', descricao: 'Taxas, juros e parâmetros monetários', icone: CreditCard, cor: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  { id: 'contas-pagar', titulo: 'Contas a Pagar', descricao: 'Gestão de despesas a vencer', icone: Building2, cor: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'alertas', titulo: 'Alertas', descricao: 'Notificações e avisos do sistema', icone: Bell, cor: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { id: 'aparencia', titulo: 'Aparência', descricao: 'Tema, cores e identidade visual', icone: Palette, cor: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  { id: 'sistema', titulo: 'Sistema', descricao: 'Backup, restauração e manutenção', icone: Database, cor: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' },
];

// 📋 CARDS INTERNOS de cada grupo
const CARDS_POR_GRUPO: Record<PainelAba, CardInterno[]> = {
  financeiro: [
    { id: 'taxas', nome: '💰 Taxa de Juros e Multa', descricao: 'Percentuais de juros e multa por atraso', icone: Coins },
    { id: 'descontos', nome: '🏷️ Descontos Pré-definidos', descricao: 'Valores fixos ou percentuais de desconto', icone: Tag },
    { id: 'apelido', nome: '📝 Apelido', descricao: 'Nomes alternativos para exibição', icone: Tag },
    { id: 'tipo', nome: '📋 Tipo', descricao: 'Classificação de tipos financeiros', icone: Settings },
    { id: 'pix', nome: '🔑 Chaves PIX', descricao: 'Gerenciar chaves PIX cadastradas', icone: Key },
    { id: 'formas-pagamento', nome: '💳 Formas de Pagamento', descricao: 'Boletos, cartões, PIX, cheques', icone: CreditCard },
    { id: 'maquininhas', nome: '💳 Maquininhas/Operadoras', descricao: 'Taxas e prazos de recebimento', icone: Wrench },
  ],
  cadastros: [
    { id: 'usuarios', nome: '🔑 Usuários do Sistema', descricao: 'Controle de acesso e perfis' },
    { id: 'proprietarios', nome: '🎨 Proprietários', descricao: 'Cadastro de empresas/proprietários' },
    { id: 'credores', nome: '📝 Credores', descricao: 'Quem recebe os valores' },
    { id: 'motivos', nome: '📝 Motivos de Alteração', descricao: 'Justificativas de exclusão/edição' },
  ],
  'contas-pagar': [
    { id: 'parametros', nome: '⚙️ Parâmetros', descricao: 'Dias de aviso, numeração padrão' },
    { id: 'centros', nome: '🏢 Centros de Custo', descricao: 'Departamentos e setores' },
    { id: 'formas-pagar', nome: '💳 Formas de Pagamento', descricao: 'Boletos, cartões, PIX' },
    { id: 'categorias', nome: '📂 Categorias', descricao: 'Classificação de despesas' },
  ],
  alertas: [
    { id: 'avisos', nome: '🔔 Avisos', descricao: 'Configuração de lembretes' },
    { id: 'notificacoes', nome: '📧 Notificações', descricao: 'E-mails e alertas automáticos' },
  ],
  aparencia: [
    { id: 'tema', nome: '🎨 Tema', descricao: 'Modo claro/escuro, cores' },
    { id: 'logo', nome: '🖼️ Logo e Identidade', descricao: 'Imagem e nome da empresa' },
    { id: 'fonte', nome: '🔤 Fonte e Exibição', descricao: 'Tamanho e estilo das letras' },
  ],
  sistema: [
    { id: 'backup', nome: '💾 Backup Completo', descricao: 'Exportar todos os dados' },
    { id: 'restaurar', nome: '📥 Restaurar Backup', descricao: 'Importar dados salvos' },
    { id: 'pasta', nome: '📁 Pasta de Salvamento', descricao: 'Onde salvar PDFs e arquivos' },
    { id: 'log', nome: '📋 Registros de Acesso', descricao: 'Histórico de uso do sistema' },
  ],
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const TAB_SUBTITLES: Record<Tab, string> = {
  lista: 'Títulos', dashboard: 'Dashboard', relatorios: 'Relatórios',
  clientes: 'Clientes', promissoria: 'Promissórias', vendas: 'Vendas',
  config: 'Configurações', aniversariantes: 'Aniversariantes', 'contas-pagar': 'Contas a Pagar',
};

const VALID_TABS: Tab[] = ['lista', 'dashboard', 'relatorios', 'clientes', 'promissoria', 'vendas', 'config', 'aniversariantes', 'contas-pagar'];

function sanitizeTab(requestedTab: Tab | null, userLevel?: SessionUser['nivel']): Tab {
  if (!requestedTab || !VALID_TABS.includes(requestedTab)) return 'dashboard';
  if (requestedTab === 'contas-pagar' && userLevel !== 'MASTER') return 'dashboard';
  return requestedTab;
}

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos, loading } = useTitulos();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tab, setTab] = useState<Tab>(() => sanitizeTab((new URLSearchParams(window.location.search).get('tab') as Tab | null), undefined));
  
  // ✅ NAVEGAÇÃO EM 2 NÍVEIS
  const [grupoAtivo, setGrupoAtivo] = useState<PainelAba | null>(null); // null = mostra grupos principais
  const [abaPainelAtiva, setAbaPainelAtiva] = useState<PainelAba>('cadastros');
  const [buscaConfig, setBuscaConfig] = useState('');
  const [cardSelecionadoId, setCardSelecionadoId] = useState<string | null>(null);
  
  const painelRef = useRef<HTMLDivElement>(null);
  const now = useClock();
  
  useEffect(() => { getSession().then(u => { setUser(u); setLoadingSession(false); }); }, []);
  
  const requestedTab = searchParams.get('tab') as Tab | null;
  const resolvedTab = sanitizeTab(requestedTab, user?.nivel);
  useEffect(() => { setTab(c => c === resolvedTab ? c : resolvedTab); }, [resolvedTab]);
  
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  }, [tab, searchParams, setSearchParams]);
  
  useEffect(() => { document.documentElement.classList.toggle('dark', config.darkMode); }, [config.darkMode]);
  
  const titulosCalculados = useMemo(
    () => titulos.map(t => calcularTitulo(t, config.taxa, config.contasPagar?.multa || 0)).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()),
    [titulos, config.taxa]
  );
  
  const filters = useFilters(titulosCalculados);
  const actions = useTituloActions({ titulos, titulosCalculados, config, updateConfig, addTitulo, updateTitulo, deleteTitulo, user });
  const formAreaRef = useRef<HTMLDivElement>(null);
  
  const scrollToForm = () => {
    setTimeout(() => { formAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  };
  
  const handleEdit = (id: string) => { actions.handleEdit(id); scrollToForm(); };
  const handlePagar = (id: string) => { actions.handlePagar(id); scrollToForm(); };
  
  // ✅ ABRIR GRUPO → mostra os cards internos
  const abrirGrupo = (grupoId: PainelAba) => {
    setGrupoAtivo(grupoId);
    setAbaPainelAtiva(grupoId);
    setBuscaConfig('');
    setCardSelecionadoId(null);
    setTimeout(() => {
      if (painelRef.current) painelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  
  // ✅ CLICAR NUM CARD INTERNO → rola até a seção real
  const selecionarCard = (cardId: string, nomeExibicao: string) => {
    setCardSelecionadoId(cardId);
    setTimeout(() => {
      if (painelRef.current) painelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast.success(`✅ ${nomeExibicao}`);
    }, 50);
  };
  
  // ✅ VOLTAR para os grupos principais
  const voltarGrupos = () => {
    setGrupoAtivo(null);
    setCardSelecionadoId(null);
    setBuscaConfig('');
  };
  
  // Filtro de busca — funciona nos grupos principais
  const gruposFiltrados = useMemo(() => {
    if (!buscaConfig.trim()) return GRUPOS_PRINCIPAIS;
    const termo = buscaConfig.toLowerCase().trim();
    return GRUPOS_PRINCIPAIS.filter(grupo => 
      grupo.titulo.toLowerCase().includes(termo) || grupo.descricao.toLowerCase().includes(termo)
    );
  }, [buscaConfig]);
  
  // Cards do grupo aberto
  const cardsAtuais = grupoAtivo ? CARDS_POR_GRUPO[grupoAtivo] : [];
  const dadosGrupoAtual = grupoAtivo ? GRUPOS_PRINCIPAIS.find(g => g.id === grupoAtivo) : null;
  
  if (loading || loadingSession) {
    return <div className="min-h-screen bg-[#1a2035] flex items-center justify-center"><p className="text-white/60 animate-pulse font-[Poppins]">Carregando...</p></div>;
  }
  
  if (!user) {
    return <LoginScreen config={config} loading={loading} onUpdate={updateConfig} onLogin={(u) => { setSession(u); setUser(u); appendLog(config, updateConfig, u, 'login', `Login de ${u.nome}`); toast.success(`Bem-vindo, ${u.nome}`); }} />;
  }
  
  const logout = () => { appendLog(config, updateConfig, user, 'logout', `Logout de ${user.nome}`); setSession(null); setUser(null); };
  const clockDate = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const clockTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const showMonthBar = tab === 'lista' || tab === 'dashboard';
  
  return (
    <div className="zoom-layout">
      <Sidebar tab={tab} onTabChange={(t) => { setTab(t); setGrupoAtivo(null); setBuscaConfig(''); }} onLogout={logout} userName={user.nome} userLevel={user.nivel} logoEmpresa={config.logoEmpresa} />
      
      <div className="zoom-main">
        <header className="zoom-top-header">
          <div className="zoom-header-title">Sistema <span>ZOOM</span><span style={{ fontSize: '12px', fontWeight: 400, color: '#718096', marginLeft: '8px' }}>• {TAB_SUBTITLES[tab]}</span></div>
          <div className="flex items-center gap-4">
            <div className="zoom-clock"><div className="zoom-clock-date">{clockDate}</div><div className="zoom-clock-time">{clockTime}</div></div>
            <Button size="sm" variant="destructive" className="h-8 text-xs hidden sm:flex" onClick={logout}>Sair</Button>
          </div>
        </header>
        
        {showMonthBar && filters.monthKeys.length > 0 && (
          <div className="zoom-month-bar">
            <div className="zoom-month-bar-inner">
              {tab === 'dashboard' && (
                <button className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                  style={filters.dashboardMonth === '' ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 } : { background: '#1a2035', border: '1px solid #334155' }}
                  onClick={() => filters.setDashboardMonth('')}>Todos</button>
              )}
              {tab === 'lista' && (
                <button className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                  style={filters.selectedMonth === '' ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 } : { background: '#1a2035', border: '1px solid #334155' }}
                  onClick={() => filters.setSelectedMonth('')}>Todos</button>
              )}
              {filters.monthKeys.map(mk => {
                const active = tab === 'lista' ? filters.selectedMonth === mk : filters.dashboardMonth === mk;
                return (
                  <button key={mk} className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 whitespace-nowrap"
                    style={active ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 2px 8px rgba(79,172,254,0.4)', fontWeight: 600 } : { background: '#1a2035', border: '1px solid #334155' }}
                    onClick={() => tab === 'lista' ? filters.setSelectedMonth(mk) : filters.setDashboardMonth(mk)}>
                    {formatMonthLabel(mk)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <main className="zoom-content">
          {tab === 'lista' && (
            <>
              <div ref={formAreaRef}>
                <TituloFormModal show={actions.showForm} editData={actions.editingTitulo} config={config} user={user} onSubmit={actions.handleAdd} onClose={() => { actions.setShowForm(false); actions.setEditingTitulo(null); }} />
                <PagarFormModal pagarId={actions.pagarId} titulo={actions.pagarTitulo} creditoCliente={actions.creditoCliente} config={config} user={user} onSubmit={actions.handleConfirmPagar} onClose={() => actions.setPagarId(null)} />
              </div>
              <TitulosFilters filtro={filters.filtro} setFiltro={filters.setFiltro} titulosByMonth={filters.titulosByMonth} proprietarioFilter={filters.proprietarioFilter} setProprietarioFilter={filters.setProprietarioFilter} proprietarios={config.proprietarios} />
              <TitulosTable titulosFiltrados={filters.titulosFiltrados} config={config} onEdit={handleEdit} onDelete={actions.askDelete} onPagar={handlePagar} onAddNew={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }} />
              {!actions.showForm && (<button onClick={() => { actions.setEditingTitulo(null); actions.setShowForm(true); }} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center z-20" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', boxShadow: '0 4px 16px rgba(79,172,254,.5)' }}><Plus className="h-6 w-6" /></button>)}
            </>
          )}
          
          {tab === 'dashboard' && (
            <>
              {config.proprietarios.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Proprietário:</span>
                  <select value={filters.dashboardProprietarioFilter} onChange={(e) => filters.setDashboardProprietarioFilter(e.target.value)} className="h-8 text-xs w-48 rounded-md border border-input bg-background px-3 py-1">
                    <option value="TODOS">Todos</option>
                    {config.proprietarios.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                  </select>
                </div>
              )}
              <DashboardChart titulos={filters.dashboardMonth ? filters.titulosDashboardByProprietario.filter(t => getMonthKey(t.vencimento) === filters.dashboardMonth) : filters.titulosDashboardByProprietario} allTitulos={filters.titulosDashboardByProprietario} showValorTotal={hasPerm(config, user, 'dash.valorTotal')} onClickVencidos={() => { filters.setFiltro('VENCIDO'); setTab('lista'); }} vendas={config.vendas || []} selectedMonth={filters.dashboardMonth ?? undefined} config={config} />
            </>
          )}
          
          {tab === 'relatorios' && <Relatorios titulos={titulos} config={config} />}
          {tab === 'clientes' && <ClientesManager clientes={config.clientes} onUpdate={(clientes) => updateConfig({ clientes })} titulos={titulos} requirePin={(kind, id) => { if (kind === 'delete') actions.setPendingDelete({ kind: 'cliente', id }); else window.dispatchEvent(new CustomEvent('cliente-edit-unlock', { detail: id })); }} config={config} user={user} updateTitulo={updateTitulo} updateConfig={updateConfig} />}
          {tab === 'promissoria' && <PromissoriaTabs config={config} titulos={titulos} onAddTitulos={(novos) => addTitulos(novos)} />}
          {tab === 'aniversariantes' && <AniversariantesPage config={config} />}
          {tab === 'vendas' && <VendasTab config={config} onUpdate={updateConfig} user={user} onNewCliente={() => setTab('clientes')} />}
          
          {/* ⭐ CONFIGURAÇÕES — NAVEGAÇÃO EM 2 NÍVEIS */}
          {tab === 'config' && (
            <div className="space-y-6">
              {/* ✅ TRILHA DE NAVEGAÇÃO */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b">
                <div className="flex items-center gap-1 flex-wrap text-sm">
                  {!grupoAtivo ? (
                    <span className="font-medium text-foreground">Configurações</span>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={voltarGrupos}>
                        <Home className="h-3.5 w-3.5 mr-1" />Início
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      <span className="font-medium text-foreground">{dadosGrupoAtual?.titulo}</span>
                    </>
                  )}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={buscaConfig} onChange={(e) => setBuscaConfig(e.target.value)} className="pl-9" />
                </div>
              </div>
              
              {!grupoAtivo ? (
                // ✅ NÍVEL 1 — Mostra os 6 Grupos Principais
                <>
                  <div><h2 className="text-2xl font-bold">Configurações</h2><p className="text-muted-foreground">Selecione uma área para ver os detalhes</p></div>
                  {gruposFiltrados.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground"><p className="text-4xl mb-2">🔍</p><p>Nenhum resultado para "{buscaConfig}"</p></div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {gruposFiltrados.map(grupo => {
                        const Icone = grupo.icone;
                        return (
                          <Card key={grupo.id} className="cursor-pointer hover:shadow-md transition-all duration-200 group" onClick={() => abrirGrupo(grupo.id)}>
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-lg ${grupo.cor}`}><Icone className="h-5 w-5" /></div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                              </div>
                              <CardTitle className="mt-2 text-lg">{grupo.titulo}</CardTitle>
                              <CardDescription>{grupo.descricao}</CardDescription>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                // ✅ NÍVEL 2 — Mostra os Cards INTERNOS do grupo selecionado
                <>
                  <div>
                    <h2 className="text-2xl font-bold">{dadosGrupoAtual?.titulo}</h2>
                    <p className="text-muted-foreground">{dadosGrupoAtual?.descricao}</p>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    {cardsAtuais.map(card => {
                      const IconeCard = card.icone || Settings;
                      const isSelecionado = cardSelecionadoId === card.id;
                      return (
                        <Card key={card.id} className={`cursor-pointer hover:shadow-md transition-all duration-200 ${isSelecionado ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30' : ''}`}
                          onClick={() => selecionarCard(card.id, card.nome)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5"><IconeCard className="h-5 w-5 text-muted-foreground" /></div>
                                <div>
                                  <h3 className="font-medium">{card.nome}</h3>
                                  <p className="text-sm text-muted-foreground mt-0.5">{card.descricao}</p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* ✅ PAINEL REAL — Aba sincronizada */}
                  <div ref={painelRef} className="pt-4 border-t mt-4">
                    <ConfigPanel config={config} onUpdate={updateConfig} titulos={titulos} onImportTitulos={replaceTitulos} user={user} initialTab={abaPainelAtiva} abaAtivaExterna={abaPainelAtiva} cardFocado={cardSelecionadoId} />
                  </div>
                </>
              )}
            </div>
          )}
          
          {tab === 'contas-pagar' && <ContasPagarTab config={config} updateConfig={updateConfig} user={user} />}
        </main>
      </div>
      
      <AvatarAjuda ativo={config.avatarAjudaAtivo ?? true} tab={tab} />
      <IdleTimerManager config={config} onIdle={() => { appendLog(config, updateConfig, user, 'logout', `Logout automático por ociosidade de ${user.nome}`); setSession(null); setUser(null); }} />
      <DeleteMotivoModal pendingDelete={actions.pendingDelete} motivosAlteracao={config.motivosAlteracao || []} onConfirm={actions.confirmDelete} onClose={() => actions.setPendingDelete(null)} />
    </div>
  );
};

export default Index;