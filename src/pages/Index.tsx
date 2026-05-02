import { useState, useEffect } from 'react';
import { useTitulos } from '@/hooks/useTitulos';
import { calcularTitulo, getMonthKey, formatMonthLabel } from '@/lib/calculos';
import { hashPin, verifyPin } from '@/lib/storage';
import { TituloCard } from '@/components/TituloCard';
import { TituloForm } from '@/components/TituloForm';
import { PagarForm } from '@/components/PagarForm';
import { DashboardChart } from '@/components/DashboardChart';
import { ConfigPanel } from '@/components/ConfigPanel';
import { PinDialog } from '@/components/PinDialog';
import { Relatorios } from '@/components/Relatorios';
import { ClientesManager } from '@/components/ClientesManager';
import { PromissoriaTab } from '@/components/PromissoriaTab';
import { AvatarAjuda } from '@/components/AvatarAjuda';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, List, Settings2, FileText, Users, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Titulo, Proprietario } from '@/types/titulo';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'config';

const Index = () => {
  const { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos } = useTitulos();
  const [tab, setTab] = useState<Tab>('lista');
  const [showForm, setShowForm] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<Titulo | null>(null);
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO'>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardMonth, setDashboardMonth] = useState<string | null>(null);
  const [showPin, setShowPin] = useState<{ mode: 'setup' | 'verify'; action: string } | null>(null);
  const [configUnlocked, setConfigUnlocked] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', config.darkMode);
  }, [config.darkMode]);

  useEffect(() => {
    const handler = () => setShowPin({ mode: 'setup', action: 'reset' });
    window.addEventListener('reset-pin', handler);
    return () => window.removeEventListener('reset-pin', handler);
  }, []);

  const titulosCalculados = titulos
    .map(t => calcularTitulo(t, config.taxa))
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  const monthKeys = Array.from(new Set(titulosCalculados.map(t => getMonthKey(t.vencimento)))).sort();

  useEffect(() => {
    if (monthKeys.length === 0) return;
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultKey = monthKeys.includes(currentKey) ? currentKey : monthKeys[0];
    if (!selectedMonth) setSelectedMonth(defaultKey);
    if (dashboardMonth === null) setDashboardMonth(defaultKey);
  }, [monthKeys, selectedMonth, dashboardMonth]);

  const titulosByMonth = selectedMonth
    ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === selectedMonth)
    : titulosCalculados;

  const titulosFiltrados = filtro === 'TODOS'
    ? titulosByMonth
    : titulosByMonth.filter(t => t.situacao === filtro);

  const handleAdd = (data: {
    tipo: string; cliente: string; clienteId?: string; telefone: string;
    dataEmissao: string; vencimento: string; valor: number; proprietario: Proprietario;
  }) => {
    if (editingTitulo) {
      updateTitulo(editingTitulo.id, data);
      setEditingTitulo(null);
      setShowForm(false);
      toast.success('Título atualizado!');
    } else {
      addTitulo(data);
      setShowForm(false);
      toast.success('Título adicionado!');
      const newMonth = getMonthKey(data.vencimento);
      if (!monthKeys.includes(newMonth)) {
        setSelectedMonth(newMonth);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (config.pin) {
      setPendingDeleteId(id);
      setShowPin({ mode: 'verify', action: 'delete' });
    } else {
      deleteTitulo(id);
      toast.success('Título removido');
    }
  };

  const handleEdit = (id: string) => {
    const titulo = titulos.find(t => t.id === id);
    if (titulo) {
      setEditingTitulo(titulo);
      setShowForm(true);
    }
  };

  const handlePagar = (id: string) => {
    if (config.funcionarios.length === 0) {
      toast.error('Cadastre um funcionário em Configurações antes de receber títulos');
      return;
    }
    setPagarId(id);
  };

  const handleConfirmPagar = (data: { dataPagamento: string; valorPago: number; recebidoPor: string }) => {
    if (pagarId) {
      updateTitulo(pagarId, data);
      setPagarId(null);
      toast.success(`Pagamento registrado por ${data.recebidoPor}!`);
    }
  };

  const handleTabChange = (newTab: Tab) => {
    if (newTab === 'config') {
      if (config.pin && !configUnlocked) {
        setShowPin({ mode: 'verify', action: 'config' });
        return;
      }
      if (!config.pin) {
        setShowPin({ mode: 'setup', action: 'config-first' });
        return;
      }
    }
    setTab(newTab);
  };

  const handlePinSuccess = (pin: string) => {
    if (!showPin) return;
    if (showPin.mode === 'setup') {
      updateConfig({ pin: hashPin(pin) });
      toast.success('Senha cadastrada!');
      setShowPin(null);
      if (showPin.action === 'config-first' || showPin.action === 'reset') {
        setConfigUnlocked(true);
        setTab('config');
      }
    } else {
      if (config.pin && verifyPin(pin, config.pin)) {
        setShowPin(null);
        if (showPin.action === 'config') {
          setConfigUnlocked(true);
          setTab('config');
        } else if (showPin.action === 'delete' && pendingDeleteId) {
          deleteTitulo(pendingDeleteId);
          setPendingDeleteId(null);
          toast.success('Título removido');
        }
      } else {
        toast.error('Senha incorreta');
      }
    }
  };

  const pagarTitulo = pagarId ? titulosCalculados.find(t => t.id === pagarId) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 py-3 shadow-md">
        <h1 className="text-lg font-bold tracking-tight">💰 Controle Financeiro</h1>
        <p className="text-xs opacity-80">Taxa de juros: {(config.taxa * 100).toFixed(1)}% a.m.</p>
      </header>

      {(tab === 'lista' || tab === 'dashboard') && monthKeys.length > 0 && (
        <div className="bg-card border-b border-border px-2 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tab === 'dashboard' && (
              <button
                onClick={() => setDashboardMonth('')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  dashboardMonth === ''
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                Todos
              </button>
            )}
            {monthKeys.map(mk => {
              const active = tab === 'lista' ? selectedMonth === mk : dashboardMonth === mk;
              return (
                <button
                  key={mk}
                  onClick={() => tab === 'lista' ? setSelectedMonth(mk) : setDashboardMonth(mk)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
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
              <TituloForm
                onSubmit={handleAdd}
                onClose={() => { setShowForm(false); setEditingTitulo(null); }}
                editData={editingTitulo}
                clientes={config.clientes}
                proprietarios={config.proprietarios}
              />
            )}

            {pagarId && pagarTitulo && (
              <PagarForm
                clienteNome={pagarTitulo.cliente}
                valorOriginal={pagarTitulo.valorCorrigido}
                funcionarios={config.funcionarios}
                onSubmit={handleConfirmPagar}
                onClose={() => setPagarId(null)}
              />
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['TODOS', 'VENCIDO', 'NO PRAZO', 'PAGO'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filtro === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
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
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {titulosFiltrados.map(t => (
                  <TituloCard
                    key={t.id}
                    titulo={t}
                    onDelete={handleDelete}
                    onPagar={handlePagar}
                    onEdit={handleEdit}
                    chavesPix={config.chavesPix}
                    proprietarios={config.proprietarios}
                    clientes={config.clientes}
                  />
                ))}
              </div>
            )}

            {!showForm && (
              <button
                onClick={() => { setEditingTitulo(null); setShowForm(true); }}
                className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-20"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {tab === 'dashboard' && (
          <DashboardChart
            titulos={dashboardMonth
              ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === dashboardMonth)
              : titulosCalculados}
          />
        )}
        {tab === 'relatorios' && <Relatorios titulos={titulos} config={config} />}
        {tab === 'clientes' && (
          <ClientesManager
            clientes={config.clientes}
            onUpdate={(clientes) => updateConfig({ clientes })}
          />
        )}
        {tab === 'promissoria' && <PromissoriaTab config={config} onAddTitulos={(novos) => addTitulos(novos)} />}
        {tab === 'config' && <ConfigPanel config={config} onUpdate={updateConfig} titulos={titulos} onImportTitulos={replaceTitulos} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'lista' as Tab, icon: List, label: 'Títulos' },
            { id: 'clientes' as Tab, icon: Users, label: 'Clientes' },
            { id: 'promissoria' as Tab, icon: ScrollText, label: 'Promissória' },
            { id: 'dashboard' as Tab, icon: BarChart3, label: 'Dash' },
            { id: 'relatorios' as Tab, icon: FileText, label: 'Relatórios' },
            { id: 'config' as Tab, icon: Settings2, label: 'Config' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                tab === item.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AvatarAjuda ativo={config.avatarAjudaAtivo ?? true} tab={tab} />

      {showPin && (
        <PinDialog
          mode={showPin.mode}
          onSuccess={handlePinSuccess}
          onClose={() => { setShowPin(null); setPendingDeleteId(null); }}
        />
      )}
    </div>
  );
};

export default Index;
