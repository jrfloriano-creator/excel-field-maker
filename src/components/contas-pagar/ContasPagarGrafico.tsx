// src/components/contas-pagar/ContasPagarGrafico.tsx
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, DollarSign, FileText, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContaPagarComCalculo, Titulo, TituloComCalculo, VendaVista } from '@/types/titulo';
import { calcularTitulo, formatCurrency } from '@/lib/calculos';

interface ContasPagarGraficoProps {
  contas: ContaPagarComCalculo[];
  titulos: Titulo[];
  vendas: VendaVista[];
  taxa: number;
  multa?: number;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenVencidos: () => void;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const RECEITAS_COLOR = '#4facfe';
const PAGAMENTOS_COLOR = '#fc8181';
const PIE_COLORS = ['#4facfe', '#f97316', '#a78bfa', '#43e97b', '#f43f5e', '#06b6d4', '#facc15', '#8b5cf6'];

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getDaysInMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return formatCurrency(value);
}

function normalizeTituloTipo(tipo: string) {
  const normalized = tipo.trim().toUpperCase();
  if (normalized.includes('PROMISS')) return 'PROMISSORIA';
  if (normalized.includes('CADERNO')) return 'CADERNO';
  if (normalized.includes('CHEQUE')) return 'CHEQUE';
  if (normalized.includes('BOLETO')) return 'BOLETO';
  return normalized || 'OUTROS';
}

function DailyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const receitas = Number(payload.find((item: any) => item.dataKey === 'receitas')?.value || 0);
  const pagamentos = Number(payload.find((item: any) => item.dataKey === 'pagamentos')?.value || 0);
  const diferenca = receitas - pagamentos;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <div className="font-semibold mb-2">Dia {label}</div>
      <div className="space-y-1">
        <div style={{ color: RECEITAS_COLOR }}>Receitas: {formatCurrency(receitas)}</div>
        <div style={{ color: PAGAMENTOS_COLOR }}>Pagamentos: {formatCurrency(pagamentos)}</div>
        <div className="font-bold" style={{ color: diferenca >= 0 ? RECEITAS_COLOR : PAGAMENTOS_COLOR }}>
          Diferença: {formatCurrency(diferenca)}
        </div>
      </div>
    </div>
  );
}

export function ContasPagarGrafico({
  contas,
  titulos,
  vendas,
  taxa,
  multa = 0,
  selectedMonth,
  onSelectMonth,
  onOpenVencidos,
}: ContasPagarGraficoProps) {
  const titulosCalculados = useMemo<TituloComCalculo[]>(
    () => titulos.map(titulo => calcularTitulo(titulo, taxa, multa)),
    [titulos, taxa, multa]
  );

  // CORREÇÃO CRÍTICA: Lista de meses considera apenas contas a pagar (não polui com títulos)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    contas.forEach(conta => months.add(getMonthKey(conta.vencimento)));
    return Array.from(months).sort();
  }, [contas]);

  // CORREÇÃO CRÍTICA: Seletor de ano independente
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    contas.forEach(c => yearsSet.add(new Date(c.vencimento).getFullYear()));
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [contas]);

  // CORREÇÃO CRÍTICA: effectiveMonth não tem fallback para último mês
  // Se selectedMonth === '', mostra TODAS as contas
  const effectiveMonth = selectedMonth;

  // CORREÇÃO CRÍTICA: filtra CANCELADO dos cálculos
  const contasDoMes = useMemo(() => {
    const base = contas.filter(c => c.status !== 'CANCELADO');
    return effectiveMonth
      ? base.filter(conta => getMonthKey(conta.vencimento) === effectiveMonth)
      : base;
  }, [contas, effectiveMonth]);

  const overdueCount = useMemo(() => contasDoMes.filter(conta => conta.status === 'VENCIDO').length, [contasDoMes]);

  // CORREÇÃO CRÍTICA: 'A Pagar' só soma PENDENTE e VENCIDO (exclui CANCELADO)
  const pendingTotal = useMemo(
    () => contasDoMes
      .filter(conta => conta.status === 'PENDENTE' || conta.status === 'VENCIDO')
      .reduce((sum, conta) => sum + conta.valor, 0),
    [contasDoMes]
  );

  const totalVendas = useMemo(
    () => vendas
      .filter(venda => !effectiveMonth || venda.data.startsWith(effectiveMonth))
      .reduce((sum, venda) => sum + venda.valor, 0),
    [effectiveMonth, vendas]
  );

  const totalTitulosPorTipo = useMemo(() => {
    const grouped = new Map<string, number>();
    contasDoMes.forEach(conta => {
      const key = normalizeTituloTipo(conta.tipoTitulo || conta.categoria);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [contasDoMes]);

  const dailyData = useMemo(() => {
    if (!effectiveMonth) return [];
    const days = getDaysInMonth(effectiveMonth);
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const dayString = `${effectiveMonth}-${String(day).padStart(2, '0')}`;
      const receitas = vendas
        .filter(venda => venda.data === dayString)
        .reduce((sum, venda) => sum + venda.valor, 0);
      const pagamentos = contasDoMes
        .filter(conta => conta.vencimento === dayString)
        .reduce((sum, conta) => sum + conta.valor, 0);
      return {
        dia: String(day).padStart(2, '0'),
        receitas,
        pagamentos,
      };
    });
  }, [contasDoMes, effectiveMonth, vendas]);

  const credorData = useMemo(() => {
    const grouped = new Map<string, number>();
    contasDoMes.forEach(conta => {
      const key = conta.favorecido?.trim() || 'Sem favorecido';
      grouped.set(key, (grouped.get(key) || 0) + conta.valor);
    });
    const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(grouped.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [contasDoMes]);

  const handleSelectMonth = (monthNumber: number) => {
    const monthKey = `${selectedYear}-${String(monthNumber).padStart(2, '0')}`;
    onSelectMonth(monthKey);
  };

  const handleSelectAll = () => {
    onSelectMonth('');
  };

  const activeMonthNumber = selectedMonth ? parseInt(selectedMonth.slice(5, 7), 10) : 0;

  return (
    <div className="space-y-6">
      {/* CORREÇÃO CRÍTICA: Seletor de ano + meses */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Ano:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {/* CORREÇÃO CRÍTICA: Botão "Todos" funciona de verdade */}
            <Button
              type="button"
              variant="outline"
              className={selectedMonth === '' ? 'bg-primary text-primary-foreground border-primary' : ''}
              onClick={handleSelectAll}
            >
              Todos
            </Button>
            {MONTH_LABELS.map((label, index) => {
              const monthNumber = index + 1;
              const active = activeMonthNumber === monthNumber;
              return (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  className={active ? 'bg-primary text-primary-foreground border-primary' : ''}
                  onClick={() => handleSelectMonth(monthNumber)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={onOpenVencidos} className="text-left">
          <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-full p-3 bg-red-500">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Títulos Vencidos</div>
                <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
                <div className="text-xs text-muted-foreground">Clique para abrir a listagem</div>
              </div>
            </CardContent>
          </Card>
        </button>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Total de Títulos</div>
              <div className="text-2xl font-bold">{totalTitulosPorTipo.reduce((sum, item) => sum + item.total, 0)}</div>
              <div className="text-xs text-muted-foreground truncate">
                {totalTitulosPorTipo.map(item => `${item.tipo}: ${item.total}`).join(' • ')}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full p-3 bg-sky-500">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total de Vendas</div>
              <div className="text-2xl font-bold">{formatCompactCurrency(totalVendas)}</div>
              <div className="text-xs text-muted-foreground">
                {vendas.filter(venda => !effectiveMonth || venda.data.startsWith(effectiveMonth)).length} venda(s)
                {effectiveMonth ? ' no período' : ' no total'}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full p-3 bg-orange-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">A Pagar (pendente/vencido)</div>
              <div className="text-2xl font-bold">{formatCompactCurrency(pendingTotal)}</div>
              <div className="text-xs text-muted-foreground">Exclui contas canceladas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold">
              {effectiveMonth
                ? `Receitas x Pagamentos — ${MONTH_LABELS[parseInt(effectiveMonth.slice(5, 7), 10) - 1]}/${effectiveMonth.slice(0, 4)}`
                : 'Receitas x Pagamentos (selecione um mês para ver o detalhamento diário)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {effectiveMonth ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value))}
                  />
                  <Tooltip content={<DailyTooltip />} />
                  <Bar dataKey="receitas" fill={RECEITAS_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pagamentos" fill={PAGAMENTOS_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <p className="text-4xl mb-2">📊</p>
                <p>Selecione um mês para ver o detalhamento diário</p>
                <p className="text-xs mt-1">Ou clique em "Todos" para ver o panorama geral</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold">
              Distribuição por credor
              {effectiveMonth && (
                <span className="text-xs text-muted-foreground ml-2">
                  — {MONTH_LABELS[parseInt(effectiveMonth.slice(5, 7), 10) - 1]}/{effectiveMonth.slice(0, 4)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {credorData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Nenhuma conta no período selecionado
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={credorData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {credorData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {credorData.map(item => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-muted-foreground">{item.percent.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}