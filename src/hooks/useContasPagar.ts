// src/hooks/useContasPagar.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContaPagar, SituacaoConta, Titulo } from '@/types/titulo';
import {
  generateId,
  getContasPagar,
  getNextNumeroContaPagar,
  getTitulos,
} from '@/lib/storage';
import { dbDriver } from '@/lib/database'; // CORREÇÃO: usa dbDriver centralizado
import { calcularStatusConta, ordenarContasPagar } from '@/lib/contas-pagar';
import { useContasPagarCatalog } from './useContasPagarCatalog';

// CORREÇÃO CRÍTICA: StatusFiltro agora usa 'VENCIDO' e 'PAGO'
// (antes usava 'VENCIDA'/'PAGA' que não casavam com o modelo)
export type StatusFiltro = 'TODOS' | 'PENDENTE' | 'VENCIDO' | 'PAGO' | 'CANCELADO';

/**
 * CORREÇÃO CRÍTICA: Hook agora usa ref para evitar gravação
 * dentro do setState (que causava execução dupla no StrictMode
 * e condições de corrida).
 */
export function useContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('TODOS');

  // CORREÇÃO CRÍTICA: refs para ter sempre o valor atual em handlers assíncronos
  const contasRef = useRef<ContaPagar[]>([]);
  contasRef.current = contas;

  // CORREÇÃO: estado "now" atualizado à meia-noite para recalcular status 'vencido'
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const calcularProximaMeiaNoite = () => {
      const proxima = new Date();
      proxima.setDate(proxima.getDate() + 1);
      proxima.setHours(0, 0, 0, 100);
      return proxima;
    };
    const timeout = setTimeout(() => {
      setNow(new Date());
    }, calcularProximaMeiaNoite().getTime() - Date.now());
    return () => clearTimeout(timeout);
  }, [now]);

  const catalogo = useContasPagarCatalog();

  // CORREÇÃO CRÍTICA: carregamento com try/catch e tratamento de erro
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [contasData, titulosData] = await Promise.all([
          getContasPagar(),
          getTitulos(),
        ]);
        if (!mounted) return;
        setContas(contasData);
        setTitulos(titulosData);
        setError(null);
      } catch (e) {
        console.error('useContasPagar: erro ao carregar dados', e);
        if (mounted) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // CORREÇÃO: memoiza reload do catálogo para evitar re-renders
  const catalog = useMemo(
    () => ({
      credores: catalogo.credores,
      tituloConfigs: catalogo.tituloConfigs,
      gruposDespesa: catalogo.gruposDespesa,
      despesasFixas: catalogo.despesasFixas,
      loading: catalogo.loading,
      reload: catalogo.reload,
    }),
    [
      catalogo.credores,
      catalogo.tituloConfigs,
      catalogo.gruposDespesa,
      catalogo.despesasFixas,
      catalogo.loading,
      catalogo.reload,
    ]
  );

  // CORREÇÃO CRÍTICA: contasCalculadas depende de `now` para recalcular vencidos
  const contasCalculadas = useMemo(
    () => ordenarContasPagar(contas.map((conta) => calcularStatusConta(conta, now))),
    [contas, now]
  );

  const contasFiltradas = useMemo(() => {
    if (filtroStatus === 'TODOS') return contasCalculadas;
    return contasCalculadas.filter((c) => c.status === filtroStatus);
  }, [contasCalculadas, filtroStatus]);

  // ============================================================
  // CORREÇÃO CRÍTICA: addConta, updateConta, deleteConta
  // - Não gravam mais dentro do setState
  // - Geram id/numero fora do updater
  // - Aguardam o save com try/catch
  // - Revertem o estado em caso de erro
  // ============================================================
  const addConta = useCallback(
    async (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const nowIso = new Date().toISOString();
      const currentContas = contasRef.current;
      const novaConta: ContaPagar = {
        ...data,
        id: generateId(),
        numero: getNextNumeroContaPagar(currentContas),
        createdAt: nowIso,
        updatedAt: nowIso,
        status: 'PENDENTE' as SituacaoConta,
      };

      // Atualiza UI otimistamente
      const listaAtualizada = [...currentContas, novaConta];
      setContas(listaAtualizada);

      try {
        // CORREÇÃO: usa saveConta por registro (não lista inteira)
        await dbDriver.saveConta(novaConta);
        return novaConta;
      } catch (e) {
        console.error('addConta: falha ao salvar', e);
        // reverte
        setContas(currentContas);
        throw e;
      }
    },
    []
  );

  const updateConta = useCallback(async (id: string, data: Partial<ContaPagar>) => {
    const currentContas = contasRef.current;
    const existente = currentContas.find((c) => c.id === id);
    if (!existente) throw new Error(`Conta ${id} não encontrada`);

    const updated: ContaPagar = {
      ...existente,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const listaAtualizada = currentContas.map((c) => (c.id === id ? updated : c));
    setContas(listaAtualizada);

    try {
      await dbDriver.saveConta(updated);
    } catch (e) {
      console.error('updateConta: falha ao salvar', e);
      setContas(currentContas);
      throw e;
    }
  }, []);

  const deleteConta = useCallback(async (id: string) => {
    const currentContas = contasRef.current;
    const listaAtualizada = currentContas.filter((c) => c.id !== id);
    setContas(listaAtualizada);

    try {
      await dbDriver.deleteConta(id);
    } catch (e) {
      console.error('deleteConta: falha ao excluir', e);
      setContas(currentContas);
      throw e;
    }
  }, []);

  const marcarComoPaga = useCallback(
    async (id: string, dataPagamento?: string) => {
      await updateConta(id, {
        status: 'PAGO', // CORREÇÃO: era 'PAGA'
        dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
        paidAt: dataPagamento || new Date().toISOString(),
      });
    },
    [updateConta]
  );

  // CORREÇÃO CRÍTICA: totais agora usam os status corretos
  const totais = useMemo(() => {
    const aberto = contasCalculadas
      .filter((c) => c.status === 'PENDENTE')
      .reduce((s, c) => s + c.valor, 0);
    const vencido = contasCalculadas
      .filter((c) => c.status === 'VENCIDO')
      .reduce((s, c) => s + c.valor, 0);
    const pago = contasCalculadas
      .filter((c) => c.status === 'PAGO')
      .reduce((s, c) => s + (c.valorPago ?? c.valor), 0);
    return { aberto, vencido, pago };
  }, [contasCalculadas]);

  return {
    contas,
    contasCalculadas,
    contasFiltradas,
    titulos,
    loading,
    error, // CORREÇÃO: expõe erro
    filtroStatus,
    setFiltroStatus,
    totais,
    catalog,
    addConta,
    updateConta,
    deleteConta,
    marcarComoPaga,
    reload: catalogo.reload, // CORREÇÃO: expõe reload para a UI
  };
}