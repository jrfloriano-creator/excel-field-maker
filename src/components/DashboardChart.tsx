import { useMemo } from 'react';
import { TituloComCalculo, VendaVista } from '@/types/titulo';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getMonthKey, formatMonthLabel } from '@/lib/calculos';
import {
  FileText, AlertTriangle, DollarSign, ShoppingCart,
} from 'lucide-react';

interface DashboardChartProps {
  titulos: TituloComCalculo[];
  allTitulos?: TituloComCalculo[];
  showValorTotal?: boolean;
  onClickVencidos?: () => void;
  vendas?: VendaVista[];
  selectedMonth?: string;
}

const COR_VENCIDO = '#ff6b6b';
const COR_NO_PRAZO = '#4facfe';
const COR_PAGO = '#43e97b';
const COR_PAGO_ATRASO = '#fda085';

const TIPOS_FIXOS = ['PROMISSORIA', 'CADERNO', 'CHEQUE', 'BOLETO', 'OUTROS'];
const TIPO_COLORS = ['#4facfe', '#43e97b', '#fda085', '#a78bfa', '#fc8181'];

function tipoNormalizado(t: string): string {
  const up = t.toUpperCase().replace(/\s+\d+(\/\d+)?$/, '').trim();
  if (up.includes('PROMISS')) return 'PROMISSORIA';
  if (up.includes('CADERNO')) return 'CADERNO';
  if (up.includes('CHEQUE')) return 'CHEQUE';
  if (up.includes('BOLETO')) return 'BOLETO';
  return 'OUTROS';
}

function formatCurr(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return formatCurrency(v);
}

export function DashboardChart({
  titulos,
  allTitulos,
  showValorTotal = true,
  onClickVencidos,
  vendas = [],
  selectedMonth = '',
}: DashboardChartProps) {
  const vencidos = titulos.filter(t => t.situacao === 'VENCIDO');
  const noPrazo = titulos.filter(t => t.situacao === 'NO PRAZO');
  const pagos = titulos.filter(t => t.situacao === 'PAGO');

  // Pendentes = vencidos + no prazo
  const totalPendente = titulos
    .filter(t => t.situacao !== 'PAGO')
    .reduce((s, t) => s + t.valorCorrigido, 0);

  const totalValor = titulos.reduce((s, t) => s + t.valor, 0);

  // Vendas do período
  const vendaFilter = selectedMonth || new Date().toISOString().slice(0, 7);
  const vendasPeriodo = vendas.filter(v => v.data.startsWith(vendaFilter));
  const totalVendasPeriodo = vendasPeriodo.reduce((s, v) => {
    const desc = v.descontoTipo === 'porcento' ? v.valor * v.desconto / 100 : v.desconto;
    return s + (v.valor - desc);
  }, 0);

  // Tipos pie chart
  const tipoCounts: Record<string, number> = { PROMISSORIA: 0, CADERNO: 0, CHEQUE: 0, BOLETO: 0, OUTROS: 0 };
  titulos.forEach(t => { tipoCounts[tipoNormalizado(t.tipo)]++; });
  const tipoData = TIPOS_FIXOS
    .map((k, i) => ({ name: k, value: tipoCounts[k] || 0, color: TIPO_COLORS[i] }))
    .filter(d => d.value > 0);

  // Situacao pie chart
  const situacaoData = [
    { name: 'Vencido', value: vencidos.length, color: COR_VENCIDO },
    { name: 'No Prazo', value: noPrazo.length, color: COR_NO_PRAZO },
    { name: 'Pago', value: pagos.length, color: COR_PAGO },
  ].filter(d => d.value > 0);

  // Bar chart: monthly data from allTitulos
  const barData = useMemo(() => {
    const src = allTitulos || titulos;
    const months: Record<string, { mes: string; Recebido: number; Vencido: number; 'No Prazo': number }> = {};
    src.forEach(t => {
      const mk = getMonthKey(t.vencimento);
      if (!months[mk]) months[mk] = { mes: formatMonthLabel(mk), Recebido: 0, Vencido: 0, 'No Prazo': 0 };
      if (t.situacao === 'PAGO') months[mk].Recebido += t.valorPago || t.valor;
      else if (t.situacao === 'VENCIDO') months[mk].Vencido += t.valorCorrigido;
      else months[mk]['No Prazo'] += t.valor;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allTitulos, titulos]);

  if (titulos.length === 0 && (!allTitulos || allTitulos.length === 0)) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Adicione títulos para ver o dashboard
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="zoom-kpi-grid">
        {/* Títulos Vencidos - always visible */}
        <div
          className={`zoom-kpi-card clickable`}
          onClick={onClickVencidos}
          role={onClickVencidos ? 'button' : undefined}
        >
          <div className="zoom-kpi-icon red">
            <AlertTriangle className="w-[26px] h-[26px] text-white" />
          </div>
          <div>
            <div className="zoom-kpi-label">Títulos Vencidos</div>
            <div className="zoom-kpi-value" style={{ color: '#e53e3e' }}>{vencidos.length}</div>
            <div className="zoom-kpi-click">👆 clique para ver</div>
          </div>
        </div>

        {/* Total Títulos */}
        <div className="zoom-kpi-card">
          <div className="zoom-kpi-icon blue">
            <FileText className="w-[26px] h-[26px] text-white" />
          </div>
          <div>
            <div className="zoom-kpi-label">Total Títulos</div>
            <div className="zoom-kpi-value">{titulos.length}</div>
            <div className="zoom-kpi-sub">em carteira</div>
          </div>
        </div>

        {/* Vendas do Período - only with permission */}
        {showValorTotal && (
          <div className="zoom-kpi-card">
            <div className="zoom-kpi-icon orange">
              <ShoppingCart className="w-[26px] h-[26px] text-white" />
            </div>
            <div>
              <div className="zoom-kpi-label">Vendas do Período</div>
              <div className="zoom-kpi-value" style={{ fontSize: totalVendasPeriodo > 99999 ? '15px' : undefined }}>
                {formatCurr(totalVendasPeriodo)}
              </div>
              <div className="zoom-kpi-sub">{vendasPeriodo.length} vendas</div>
            </div>
          </div>
        )}

        {/* A Receber - only with permission */}
        {showValorTotal && (
          <div className="zoom-kpi-card">
            <div className="zoom-kpi-icon green">
              <DollarSign className="w-[26px] h-[26px] text-white" />
            </div>
            <div>
              <div className="zoom-kpi-label">A Receber</div>
              <div className="zoom-kpi-value" style={{ fontSize: totalPendente > 99999 ? '15px' : undefined }}>
                {formatCurr(totalPendente)}
              </div>
              <div className="zoom-kpi-sub">em aberto</div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: barData.length > 0 ? '1fr 320px' : '1fr' }}>
        {/* Bar Chart */}
        {barData.length > 0 && (
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Receitas x Vencimentos (mensal)</CardTitle>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#4facfe' }} /> Recebido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#fc8181' }} /> Vencido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#68d391' }} /> No Prazo
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fontFamily: 'Poppins' }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Poppins' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  />
                  <Bar dataKey="Recebido" fill="#4facfe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Vencido" fill="#fc8181" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="No Prazo" fill="#68d391" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pie Charts Column */}
        <div className="space-y-4">
          {/* Tipos Pie */}
          {tipoData.length > 0 && (
            <Card>
              <CardHeader className="pb-1 border-b">
                <CardTitle className="text-sm font-semibold">Tipos de Títulos</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={tipoData}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={65}
                      paddingAngle={3} dataKey="value"
                    >
                      {tipoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {tipoData.map(d => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name}: <strong>{d.value}</strong>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Situação Pie */}
          {situacaoData.length > 0 && (
            <Card>
              <CardHeader className="pb-1 border-b">
                <CardTitle className="text-sm font-semibold">Situação dos Títulos</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={situacaoData}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={58}
                      paddingAngle={3} dataKey="value"
                    >
                      {situacaoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {situacaoData.map(d => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name}: <strong>{d.value}</strong>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tipos por contagem */}
      <Card>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-semibold">Total de Títulos por Tipo</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TIPOS_FIXOS.map((k, i) => (
              <div key={k} className="text-center">
                <div className="text-2xl font-bold" style={{ color: TIPO_COLORS[i] }}>{tipoCounts[k] || 0}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
