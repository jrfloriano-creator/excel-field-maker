import { TituloComCalculo } from '@/types/titulo';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculos';

interface DashboardChartProps {
  titulos: TituloComCalculo[];
}

export function DashboardChart({ titulos }: DashboardChartProps) {
  const vencidos = titulos.filter(t => t.situacao === 'VENCIDO');
  const noPrazo = titulos.filter(t => t.situacao === 'NO PRAZO');
  const pagos = titulos.filter(t => t.situacao === 'PAGO');
  const pagosEmAtraso = pagos.filter(t => {
    if (!t.dataPagamento) return false;
    const pgto = new Date(t.dataPagamento);
    const venc = new Date(t.vencimento);
    return pgto > venc;
  });

  const data = [
    { name: 'Vencido', value: vencidos.length, color: 'hsl(0, 72%, 51%)' },
    { name: 'No Prazo', value: noPrazo.length, color: 'hsl(38, 92%, 50%)' },
    { name: 'Pago', value: pagos.length, color: 'hsl(142, 60%, 40%)' },
    { name: 'Pagos em Atraso', value: pagosEmAtraso.length, color: 'hsl(48, 96%, 53%)' },
  ].filter(d => d.value > 0);

  const totalValor = titulos.reduce((s, t) => s + t.valor, 0);
  const totalJuros = titulos.reduce((s, t) => s + t.valorJuros, 0);

  if (titulos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Adicione títulos para ver o dashboard
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{titulos.length}</p>
            <p className="text-xs text-muted-foreground">Total Títulos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-overdue">{vencidos.length}</p>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
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
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
