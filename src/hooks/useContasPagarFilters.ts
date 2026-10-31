// src/hooks/useContasPagarFilters.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContaPagarComCalculo } from '@/types/titulo';

export type ContaPagarFiltroStatus = 'TODOS' | 'PENDENTE' | 'VENCIDO' | 'PAGO' | 'CANCELADO';

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

export function useContasPagarFilters(contasCalculadas: ContaPagarComCalculo[]) {
  const [statusFilter, setStatusFilter] = useState<ContaPagarFiltroStatus>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [favorecidoFilter, setFavorecidoFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState('');

  // CORREÇÃO: useRef para aplicar mês padrão apenas uma vez (não a cada render)
  const mesPadraoAplicado = useRef(false);

  const monthKeys = useMemo(() => {
    const mesesUnicos = new Set<string>();
    contasCalculadas.forEach(conta => {
      const chave = conta.competencia || getMonthKey(conta.vencimento);
      if (chave) mesesUnicos.add(chave);
    });
    return Array.from(mesesUnicos).sort();
  }, [contasCalculadas]);

  // ============================================================
  // CORREÇÃO CRÍTICA: Aplica mês padrão apenas uma vez (não sobrescreve
  // o selectedMonth='' quando o usuário clica em "Todos").
  // Antes: effect reaplicava o mês atual sempre que selectedMonth ficava vazio,
  // tornando o botão "Todos" inalcançável.
  // ============================================================
  useEffect(() => {
    if (mesPadraoAplicado.current) return;
    if (monthKeys.length === 0) return;
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // CORREÇÃO: usa o mês atual se existir, senão deixa vazio (mostra todos)
    if (monthKeys.includes(currentMonth)) {
      setSelectedMonth(currentMonth);
    }
    // CORREÇÃO: marca como aplicado para não sobrescrever mais
    mesPadraoAplicado.current = true;
  }, [monthKeys]);

  const favorecidos = useMemo(
    () => Array.from(new Set(contasCalculadas.map(conta => conta.favorecido.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [contasCalculadas]
  );

  const contasByMonth = useMemo(() => {
    // CORREÇÃO: se selectedMonth vazio, retorna todas as contas (modo "Todos")
    if (!selectedMonth) return contasCalculadas;
    return contasCalculadas.filter(conta => {
      const mesReferencia = conta.competencia || getMonthKey(conta.vencimento);
      return mesReferencia === selectedMonth;
    });
  }, [contasCalculadas, selectedMonth]);

  const contasByFavorecido = useMemo(
    () => favorecidoFilter === 'TODOS' ? contasByMonth : contasByMonth.filter(conta => conta.favorecido === favorecidoFilter),
    [contasByMonth, favorecidoFilter]
  );

  const contasBySearch = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return contasByFavorecido;
    return contasByFavorecido.filter(conta =>
      [conta.descricao, conta.favorecido, conta.categoria, conta.centroCusto, conta.competencia]
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