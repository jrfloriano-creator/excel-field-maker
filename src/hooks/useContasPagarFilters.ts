import { useEffect, useMemo, useState } from 'react';
import { ContaPagarComCalculo } from '@/types/titulo';

export type ContaPagarFiltroStatus = 'TODOS' | 'PENDENTE' | 'VENCIDO' | 'PAGO';

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

export function useContasPagarFilters(contasCalculadas: ContaPagarComCalculo[]) {
  const [statusFilter, setStatusFilter] = useState<ContaPagarFiltroStatus>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [favorecidoFilter, setFavorecidoFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState('');

  const monthKeys = useMemo(
    () => Array.from(new Set(contasCalculadas.map(conta => getMonthKey(conta.vencimento)))).sort(),
    [contasCalculadas]
  );

  useEffect(() => {
    if (monthKeys.length === 0 || selectedMonth) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthKeys.includes(currentMonth) ? currentMonth : '');
  }, [monthKeys, selectedMonth]);

  const favorecidos = useMemo(
    () => Array.from(new Set(contasCalculadas.map(conta => conta.favorecido.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [contasCalculadas]
  );

  const contasByMonth = useMemo(
    () => selectedMonth ? contasCalculadas.filter(conta => getMonthKey(conta.vencimento) === selectedMonth) : contasCalculadas,
    [contasCalculadas, selectedMonth]
  );

  const contasByFavorecido = useMemo(
    () => favorecidoFilter === 'TODOS' ? contasByMonth : contasByMonth.filter(conta => conta.favorecido === favorecidoFilter),
    [contasByMonth, favorecidoFilter]
  );

  const contasBySearch = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return contasByFavorecido;
    return contasByFavorecido.filter(conta =>
      [conta.descricao, conta.favorecido, conta.categoria, conta.centroCustoNome, conta.competencia]
        .filter(Boolean)
        .some(value => value!.toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [contasByFavorecido, search]);

  const contasFiltradas = useMemo(
    () => statusFilter === 'TODOS' ? contasBySearch : contasBySearch.filter(conta => conta.status === statusFilter),
    [contasBySearch, statusFilter]
  );

  return {
    statusFilter,
    setStatusFilter,
    selectedMonth,
    setSelectedMonth,
    favorecidoFilter,
    setFavorecidoFilter,
    favorecidos,
    search,
    setSearch,
    monthKeys,
    contasByMonth,
    contasFiltradas,
  };
}