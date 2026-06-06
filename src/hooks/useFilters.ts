import { useState, useEffect, useMemo } from 'react';
import { TituloComCalculo } from '@/types/titulo';
import { getMonthKey } from '@/lib/calculos';

export type FiltroSituacao = 'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export function useFilters(titulosCalculados: TituloComCalculo[]) {
  const [filtro, setFiltro] = useState<FiltroSituacao>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardMonth, setDashboardMonth] = useState<string | null>(null);
  const [proprietarioFilter, setProprietarioFilter] = useState<string>('TODOS');
  const [dashboardProprietarioFilter, setDashboardProprietarioFilter] = useState<string>('TODOS');

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

  // Títulos filtered by proprietário (for lista tab)
  const titulosByProprietario = useMemo(
    () => proprietarioFilter === 'TODOS'
      ? titulosCalculados
      : titulosCalculados.filter(t => t.proprietario === proprietarioFilter),
    [titulosCalculados, proprietarioFilter]
  );

  const titulosByMonth = useMemo(
    () => selectedMonth
      ? titulosByProprietario.filter(t => getMonthKey(t.vencimento) === selectedMonth)
      : titulosByProprietario,
    [titulosByProprietario, selectedMonth]
  );

  const titulosFiltrados = useMemo(
    () => filtro === 'TODOS' ? titulosByMonth : titulosByMonth.filter(t => t.situacao === filtro),
    [titulosByMonth, filtro]
  );

  // Títulos filtered by proprietário (for dashboard tab)
  const titulosDashboardByProprietario = useMemo(
    () => dashboardProprietarioFilter === 'TODOS'
      ? titulosCalculados
      : titulosCalculados.filter(t => t.proprietario === dashboardProprietarioFilter),
    [titulosCalculados, dashboardProprietarioFilter]
  );

  return {
    filtro, setFiltro,
    selectedMonth, setSelectedMonth,
    dashboardMonth, setDashboardMonth,
    monthKeys,
    titulosByMonth,
    titulosFiltrados,
    proprietarioFilter, setProprietarioFilter,
    dashboardProprietarioFilter, setDashboardProprietarioFilter,
    titulosDashboardByProprietario,
  };
}
