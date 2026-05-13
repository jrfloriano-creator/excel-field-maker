import { TituloComCalculo } from '@/types/titulo';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculos';

interface DashboardChartProps {
  titulos: TituloComCalculo[];
  showValorTotal?: boolean;
  onClickVencidos?: () => void;
}

const COR_VENCIDO = 'hsl(0, 72%, 51%)';
const COR_NO_PRAZO = 'hsl(217, 91%, 55%)';
const COR_PAGO = 'hsl(142, 60%, 40%)';
const COR_PAGO_ATRASO = 'hsl(48, 96%, 53%)';

const TIPOS_FIXOS = ['PROMISSORIA', 'CADERNO', 'CHEQUE', 'BOLETO', 'OUTROS'];

function tipoNormalizado(t: string): string {
  const up = t.toUpperCase().replace(/\s+\d+(\/\d+)?$/, '').trim();
  if (up.includes('PROMISS')) return 'PROMISSORIA';
  if (up.includes('CADERNO')) return 'CADERNO';
  if (up.includes('CHEQUE')) return 'CHEQUE';
  if (up.includes('BOLETO')) return 'BOLETO';
  return 'OUTROS';
}

export function DashboardChart({ titulos, showValorTotal = true, onClickVencidos }: DashboardChartProps) {
  const vencidos = titulos.filter(t => t.situacao === 'VENCIDO');
  const noPrazo = titulos.filter(t => t.situacao === 'NO PRAZO');
  const pagos = titulos.filter(t => t.situacao === 'PAGO');
  const pagosEmAtraso = pagos.filter(t => {
    if (!t.dataPagamento) return false;
    return new Date(t.dataPagamento) > new Date(t.vencimento);
  });

  const data = [
    { name: 'Vencido', value: vencidos.length, color: COR_VENCIDO },
    { name: 'No Prazo', value: noPrazo.length, color: COR_NO_PRAZO },
    { name: 'Pago', value: pagos.length, color: COR_PAGO },
    { name: 'Pagos em Atraso', value: pagosEmAtraso.length, color: COR_PAGO_ATRASO },
  ].filter(d => d.value > 0);

  const totalValor = titulos.reduce((s, t) => s + t.valor, 0);
  const totalJuros = titulos.reduce((s, t) => s + t.valorJuros, 0);

  const tipoCounts: Record<string, number> = { PROMISSORIA: 0, CADERNO: 0, CHEQUE: 0, BOLETO: 0, OUTROS: 0 };
  titulos.forEach(t => { tipoCounts[tipoNormalizado(t.tipo)]++; });

  if (titulos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Adicione títulos para ver o dashboard
        </CardContent>
      </Card>
    );
  }

  const legenda = [
    { name: 'Vencido', value: vencidos.length, color: COR_VENCIDO },
    { name: 'No Prazo', value: noPrazo.length, color: COR_NO_PRAZO },
    { name: 'Pago', value: pagos.length, color: COR_PAGO },
    { name: 'Pagos em Atraso', value: pagosEmAtraso.length, color: COR_PAGO_ATRASO },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center mb-2">Total de Títulos por Tipo</p>
            <div className="space-y-1 text-sm">
              {TIPOS_FIXOS.map(k => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-semibold">{tipoCounts[k] || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card
          className={onClickVencidos ? 'cursor-pointer hover:bg-accent/30' : ''}
          onClick={onClickVencidos}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-overdue">{vencidos.length}</p>
            <p className="text-xs text-muted-foreground">Vencidos {onClickVencidos && '👆'}</p>
          </CardContent>
        </Card>
        {showValorTotal && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</p>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-overdue">{formatCurrency(totalJuros)}</p>
            <p className="text-xs text-muted-foreground">Juros Total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Situação dos Títulos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-8 space-y-1">
            {legenda.map(l => (
              <div key={l.name} className="flex items-center gap-2 text-sm">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span>{l.name}: <strong>{l.value}</strong></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
