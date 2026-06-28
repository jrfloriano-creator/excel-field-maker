import { useMemo, useState } from 'react';
import { AppConfig, ContaPagar } from '@/types/titulo';
import { formatCurrency, formatMonthLabel, getMonthKey } from '@/lib/calculos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ContasPagarDespesasProps {
  config: AppConfig;
  contas: ContaPagar[];
  onUpdateConta: (id: string, data: Partial<ContaPagar>) => Promise<void>;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DEFAULT_GRUPOS_DESPESA = [
  'Remunerações',
  'Encargos Sociais',
  'Benefícios',
  'Ocupação',
  'Tarifas Públicas',
  'Prestadores de Serviços',
  'Seguros',
  'Manutenção',
  'Marketing',
  'Viagens',
  'Gerais',
  'Financeiros',
  'Depreciação',
];

function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function ContasPagarDespesas({ config, contas, onUpdateConta }: ContasPagarDespesasProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const companyName = config.nomeEmpresa || config.empresa || config.credor?.nome || 'Empresa';
  const gruposDespesa = config.contasPagar?.gruposDespesa?.length ? config.contasPagar.gruposDespesa : DEFAULT_GRUPOS_DESPESA;

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    contas.forEach(conta => {
      if (conta.vencimento) months.add(getMonthKey(conta.vencimento));
    });
    return Array.from(months).sort();
  }, [contas]);

  const contasFiltradas = useMemo(() => {
    if (selectedMonth === 'TODOS') return contas;
    return contas.filter(conta => getMonthKey(conta.vencimento) === selectedMonth);
  }, [contas, selectedMonth]);

  const grupos = useMemo(() => {
    return gruposDespesa.map(grupo => {
      const items = contasFiltradas.filter(conta => (conta.grupo_despesa || '').trim() === grupo);
      const total = items.reduce((sum, conta) => sum + conta.valor, 0);
      return { grupo, items, total };
    });
  }, [contasFiltradas, gruposDespesa]);

  const totalGeral = useMemo(
    () => grupos.reduce((sum, grupo) => sum + grupo.total, 0),
    [grupos]
  );

  const startEditing = (conta: ContaPagar) => {
    setEditingId(conta.id);
    setEditingValue(conta.valor.toFixed(2).replace('.', ','));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEditing = async (conta: ContaPagar) => {
    const parsed = parseCurrencyInput(editingValue);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    await onUpdateConta(conta.id, { valor: parsed });
    cancelEditing();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card px-4 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Contas a Pagar • Despesas</p>
            <h2 className="text-2xl font-semibold tracking-tight">{companyName}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedMonth === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMonth('TODOS')}
            >
              Todos
            </Button>
            {MONTH_LABELS.map((label, index) => {
              const monthValue = String(index + 1).padStart(2, '0');
              const monthKey = availableMonths.findLast(item => item.endsWith(`-${monthValue}`));
              const isActive = selectedMonth !== 'TODOS' && selectedMonth.endsWith(`-${monthValue}`);
              return (
                <Button
                  key={label}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  disabled={!monthKey}
                  onClick={() => monthKey && setSelectedMonth(monthKey)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedMonth === 'TODOS' ? 'Exibindo todas as despesas cadastradas.' : `Competência selecionada: ${formatMonthLabel(selectedMonth)}`}
          </p>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total geral</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map(({ grupo, items, total }) => (
          <Card key={grupo} className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{grupo}</CardTitle>
                  <p className="text-xs text-muted-foreground">{items.length} item(ns)</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatCurrency(total)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma despesa neste grupo.
                </div>
              ) : (
                items.map(conta => {
                  const isEditing = editingId === conta.id;
                  return (
                    <div key={conta.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{conta.descricao || conta.favorecido}</p>
                          <p className="truncate text-xs text-muted-foreground">{conta.favorecido}</p>
                        </div>
                        <div className="min-w-[120px] text-right">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editingValue}
                                onChange={event => setEditingValue(event.target.value)}
                                inputMode="decimal"
                                className="h-8 text-right"
                                autoFocus
                                onKeyDown={async event => {
                                  if (event.key === 'Enter') await saveEditing(conta);
                                  if (event.key === 'Escape') cancelEditing();
                                }}
                              />
                              <div className="flex justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>Cancelar</Button>
                                <Button type="button" size="sm" onClick={() => saveEditing(conta)}>Salvar</Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={cn('text-sm font-semibold text-primary hover:underline', 'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm')}
                              onClick={() => startEditing(conta)}
                            >
                              {formatCurrency(conta.valor)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}