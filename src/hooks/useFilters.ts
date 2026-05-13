import { useState, useEffect, useMemo } from 'react';
import { TituloComCalculo } from '@/types/titulo';
import { getMonthKey } from '@/lib/calculos';

export type FiltroSituacao = 'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export function useFilters(titulosCalculados: TituloComCalculo[]) {
  const [filtro, setFiltro] = useState<FiltroSituacao>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardMonth, setDashboardMonth] = useState<string | null>(null);

  const monthKeys = useMemo(
    () => Array.from(new Set(titulosCalculados.map(t => getMonthKey(t.vencimento)))).sort(),
    [titulosCalculados]
  );

  useEffect(() => {
    if (monthKeys.length === 0) return;
    const now = new Date();
    const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const def = monthKeys.includes(k) ? k : monthKeys[0];
    if (!selectedMonth) setSelectedMonth(def);
    if (dashboardMonth === null) setDashboardMonth(def);
  }, [monthKeys, selectedMonth, dashboardMonth]);

  const titulosByMonth = useMemo(
    () => selectedMonth
      ? titulosCalculados.filter(t => getMonthKey(t.vencimento) === selectedMonth)
      : titulosCalculados,
    [titulosCalculados, selectedMonth]
  );

  const titulosFiltrados = useMemo(
    () => filtro === 'TODOS' ? titulosByMonth : titulosByMonth.filter(t => t.situacao === filtro),
    [titulosByMonth, filtro]
  );

  return {
    filtro, setFiltro,
    selectedMonth, setSelectedMonth,
    dashboardMonth, setDashboardMonth,
    monthKeys,
    titulosByMonth,
    titulosFiltrados,
  };
}
