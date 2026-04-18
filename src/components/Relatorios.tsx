import { useMemo, useState, useEffect } from 'react';
import { Titulo, AppConfig } from '@/types/titulo';
import { calcularTitulo, formatCurrency, formatDate, getMonthKey, formatMonthLabel } from '@/lib/calculos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
}

export function Relatorios({ titulos, config }: Props) {
  const calculados = useMemo(
    () => titulos.map(t => calcularTitulo(t, config.taxa)),
    [titulos, config.taxa]
  );

  // Build month keys from payment date (for received) and due date (for overdue)
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    calculados.forEach(t => {
      if (t.situacao === 'PAGO' && t.dataPagamento) {
        keys.add(getMonthKey(t.dataPagamento));
      } else if (t.situacao === 'VENCIDO') {
        keys.add(getMonthKey(t.vencimento));
      }
    });
    return Array.from(keys).sort();
  }, [calculados]);

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    if (!selectedMonth && monthKeys.length > 0) {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(monthKeys.includes(currentKey) ? currentKey : monthKeys[monthKeys.length - 1]);
    }
  }, [monthKeys, selectedMonth]);

  const recebidos = calculados
    .filter(t => t.situacao === 'PAGO' && (!selectedMonth || (t.dataPagamento && getMonthKey(t.dataPagamento) === selectedMonth)))
    .sort((a, b) => (b.dataPagamento || '').localeCompare(a.dataPagamento || ''));

  const atrasados = calculados
    .filter(t => t.situacao === 'VENCIDO' && (!selectedMonth || getMonthKey(t.vencimento) === selectedMonth))
    .sort((a, b) => a.diasAVencer - b.diasAVencer);

  const totalRecebido = recebidos.reduce((s, t) => s + (t.valorPago || 0), 0);
  const totalAtrasadoOrig = atrasados.reduce((s, t) => s + t.valor, 0);
  const totalAtrasadoJuros = atrasados.reduce((s, t) => s + t.valorJuros, 0);
  const totalAtrasadoCorrigido = atrasados.reduce((s, t) => s + t.valorCorrigido, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relatórios</h2>
      </div>

      {monthKeys.length > 0 && (
        <div className="-mx-4 px-2 py-2 bg-card border-y border-border overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <button
              onClick={() => setSelectedMonth('')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedMonth === ''
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Todos
            </button>
            {monthKeys.map(mk => (
              <button
                key={mk}
                onClick={() => setSelectedMonth(mk)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedMonth === mk
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {formatMonthLabel(mk)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recebidos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✅ Títulos Recebidos ({recebidos.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Total recebido: <strong className="text-paid">{formatCurrency(totalRecebido)}</strong></p>
        </CardHeader>
        <CardContent className="space-y-2">
          {recebidos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum título recebido no período</p>
          ) : (
            recebidos.map(t => (
              <div key={t.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold truncate">{t.cliente}</p>
                  <p className="text-paid font-semibold whitespace-nowrap">{formatCurrency(t.valorPago || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <p>📅 {t.dataPagamento ? formatDate(t.dataPagamento) : '-'}</p>
                  <p>👤 {t.recebidoPor || '—'}</p>
                  <p className="col-span-2">{t.proprietario === 'RAMON' ? '🔵 Ramon' : '🟠 Tania'} • Nº {t.numero}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Atrasados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚠️ Títulos Atrasados ({atrasados.length})</CardTitle>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Valor original: <strong>{formatCurrency(totalAtrasadoOrig)}</strong></p>
            <p>Juros acumulados: <strong className="text-overdue">{formatCurrency(totalAtrasadoJuros)}</strong></p>
            <p>Total com juros: <strong className="text-overdue">{formatCurrency(totalAtrasadoCorrigido)}</strong></p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {atrasados.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum título atrasado no período 🎉</p>
          ) : (
            atrasados.map(t => (
              <div key={t.id} className="border border-overdue/30 rounded-md p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold truncate">{t.cliente}</p>
                  <span className="text-xs bg-overdue/10 text-overdue px-2 py-0.5 rounded-full whitespace-nowrap">
                    {Math.abs(t.diasAVencer)}d atraso
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-2">
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatCurrency(t.valor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Juros</p>
                    <p className="font-medium text-overdue">{formatCurrency(t.valorJuros)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Total com juros</p>
                    <p className="font-semibold text-overdue">{formatCurrency(t.valorCorrigido)}</p>
                  </div>
                  <p className="col-span-2 text-muted-foreground">
                    {t.proprietario === 'RAMON' ? '🔵 Ramon' : '🟠 Tania'} • Venc: {formatDate(t.vencimento)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
