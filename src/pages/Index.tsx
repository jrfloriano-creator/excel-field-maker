import { useState } from 'react';
import { useTitulos } from '@/hooks/useTitulos';
import { calcularTitulo } from '@/lib/calculos';
import { TituloCard } from '@/components/TituloCard';
import { TituloForm } from '@/components/TituloForm';
import { PagarForm } from '@/components/PagarForm';
import { DashboardChart } from '@/components/DashboardChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, BarChart3, List, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'lista' | 'dashboard' | 'config';

const Index = () => {
  const { titulos, taxa, setTaxa, addTitulo, updateTitulo, deleteTitulo } = useTitulos();
  const [tab, setTab] = useState<Tab>('lista');
  const [showForm, setShowForm] = useState(false);
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO'>('TODOS');

  const titulosCalculados = titulos
    .map(t => calcularTitulo(t, taxa))
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  const titulosFiltrados = filtro === 'TODOS'
    ? titulosCalculados
    : titulosCalculados.filter(t => t.situacao === filtro);

  const handleAdd = (data: { tipo: string; cliente: string; telefone: string; vencimento: string; valor: number }) => {
    addTitulo(data);
    setShowForm(false);
    toast.success('Título adicionado!');
  };

  const handleDelete = (id: string) => {
    deleteTitulo(id);
    toast.success('Título removido');
  };

  const handlePagar = (id: string) => {
    setPagarId(id);
  };

  const handleConfirmPagar = (data: { dataPagamento: string; valorPago: number }) => {
    if (pagarId) {
      updateTitulo(pagarId, data);
      setPagarId(null);
      toast.success('Pagamento registrado!');
    }
  };

  const pagarTitulo = pagarId ? titulosCalculados.find(t => t.id === pagarId) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 py-3 shadow-md">
        <h1 className="text-lg font-bold tracking-tight">💰 Controle Financeiro</h1>
        <p className="text-xs opacity-80">Taxa de juros: {(taxa * 100).toFixed(1)}% a.m.</p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 space-y-4">
        {tab === 'lista' && (
          <>
            {showForm && (
              <TituloForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />
            )}

            {pagarId && pagarTitulo && (
              <PagarForm
                clienteNome={pagarTitulo.cliente}
                valorOriginal={pagarTitulo.valorCorrigido}
                onSubmit={handleConfirmPagar}
                onClose={() => setPagarId(null)}
              />
            )}

            {/* Filter pills */}
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
                  {f === 'TODOS' ? `Todos (${titulosCalculados.length})` :
                   f === 'VENCIDO' ? `Vencidos (${titulosCalculados.filter(t => t.situacao === 'VENCIDO').length})` :
                   f === 'NO PRAZO' ? `No Prazo (${titulosCalculados.filter(t => t.situacao === 'NO PRAZO').length})` :
                   `Pagos (${titulosCalculados.filter(t => t.situacao === 'PAGO').length})`}
                </button>
              ))}
            </div>

            {/* List */}
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
                  <TituloCard key={t.id} titulo={t} onDelete={handleDelete} onPagar={handlePagar} />
                ))}
              </div>
            )}

            {/* FAB */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-20"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {tab === 'dashboard' && (
          <DashboardChart titulos={titulosCalculados} />
        )}

        {tab === 'config' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Configurações</h2>
            <div>
              <label className="text-sm text-muted-foreground">Taxa de juros mensal (%)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={(taxa * 100).toFixed(1)}
                onChange={e => setTaxa(parseFloat(e.target.value) / 100)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'lista' as Tab, icon: List, label: 'Títulos' },
            { id: 'dashboard' as Tab, icon: BarChart3, label: 'Dashboard' },
            { id: 'config' as Tab, icon: Settings2, label: 'Config' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
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
    </div>
  );
};

export default Index;
