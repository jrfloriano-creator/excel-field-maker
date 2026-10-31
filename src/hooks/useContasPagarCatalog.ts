// src/hooks/useContasPagarCatalog.ts
import { useCallback, useEffect, useState, useRef } from 'react';
import { contasPagarDbDriver } from '@/lib/contasPagarDb';
import { Credor, DespesaFixa, GrupoDespesa, TituloConfig } from '@/types/contasPagar';

/**
 * CORREÇÃO CRÍTICA: Hook separado em init (uma vez) e reload (sempre).
 * Antes, o guard `inicializado.current` fazia reload() virar no-op
 * depois da 1ª chamada, impedindo atualizações em Configurações.
 */
export function useContasPagarCatalog() {
  const [tituloConfigs, setTituloConfigs] = useState<TituloConfig[]>([]);
  const [credores, setCredores] = useState<Credor[]>([]);
  const [gruposDespesa, setGruposDespesa] = useState<GrupoDespesa[]>([]);
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // CORREÇÃO: Promise compartilhada para init (executa uma única vez)
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // CORREÇÃO: contador de versão para forçar re-renders quando necessário
  const versionRef = useRef(0);
  const [, forceUpdate] = useState(0);

  // CORREÇÃO: init garante que as tabelas existem (uma vez)
  const init = useCallback(async () => {
    if (initPromiseRef.current) return initPromiseRef.current;
    initPromiseRef.current = (async () => {
      try {
        await contasPagarDbDriver.init();
      } catch (e) {
        initPromiseRef.current = null; // permite retry
        throw e;
      }
    })();
    return initPromiseRef.current;
  }, []);

  // CORREÇÃO CRÍTICA: reload sempre recarrega, sem guard de "já carregou"
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await init(); // garante que tabelas existem
      const [t, c, g, d] = await Promise.all([
        contasPagarDbDriver.getTituloConfigs(),
        contasPagarDbDriver.getCredores(),
        contasPagarDbDriver.getGruposDespesa(),
        contasPagarDbDriver.getDespesasFixas(),
      ]);
      setTituloConfigs(t);
      setCredores(c);
      setGruposDespesa(g);
      setDespesasFixas(d);
      versionRef.current += 1;
      forceUpdate(versionRef.current);
    } catch (err) {
      console.error('Catálogo: erro ao carregar', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [init]);

  // CORREÇÃO CRÍTICA: carrega automaticamente ao montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await reload();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // monta uma única vez

  return {
    tituloConfigs,
    credores,
    gruposDespesa,
    despesasFixas,
    loading,
    error, // CORREÇÃO: expõe erro para a UI permitir retry
    reload, // CORREÇÃO: agora sempre recarrega
    init, // CORREÇÃO: expõe init para quem quiser garantir inicialização
  };
}