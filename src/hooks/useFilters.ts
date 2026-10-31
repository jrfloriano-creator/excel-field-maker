// src/hooks/useFilters.ts
import { useState, useEffect, useMemo, useRef } from 'react';
import { TituloComCalculo } from '@/types/titulo';
import { getMonthKey } from '@/lib/calculos';

export type FiltroSituacao = 'TODOS' | 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export function useFilters(titulosCalculados: TituloComCalculo[]) {
  const [filtro, setFiltro] = useState<FiltroSituacao>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardMonth, setDashboardMonth] = useState<string | null>(null);
  const [proprietarioFilter, setProprietarioFilter] = useState<string>('TODOS');
  const [dashboardProprietarioFilter, setDashboardProprietarioFilter] = useState<string>('TODOS');

  // CORREÇÃO: useRef para aplicar padrão apenas uma vez
  const padraoAplicado = useRef(false);

  const monthKeys = useMemo(
    () => Array.from(new Set(titulosCalculados.map(t => getMonthKey(t.vencimento)))).sort(),
    [titulosCalculados]
  );

  // ============================================================
  // CORREÇÃO CRÍTICA: Aplica mês padrão apenas uma vez.
  // Antes: se o mês atual não existia, pegava o primeiro (mais antigo),
  // o que era confuso. Agora: usa o mês atual se existir, senão deixa vazio.
  // ============================================================
  useEffect(() => {
    if (padraoAplicado.current) return;
    if (monthKeys.length === 0) return;

    const now = new Date();
    const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // CORREÇÃO: usa mês atual se existir, senão o mais recente
    const def = monthKeys.includes(k) ? k : monthKeys[monthKeys.length - 1];

    if (!selectedMonth) setSelectedMonth(def);
    if (dashboardMonth === null) setDashboardMonth(def);
    
    padraoAplicado.current = true;
  }, [monthKeys]); // CORREÇÃO: remove selectedMonth e dashboardMonth das deps

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