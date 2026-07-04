import { useCallback, useEffect, useState } from 'react';
import { contasPagarDbDriver } from '@/lib/contasPagarDb';
import { Credor, DespesaFixa, GrupoDespesa, TituloConfig } from '@/types/contasPagar';

/**
 * Hook compartilhado para acesso ao catálogo do módulo Contas a Pagar
 * (tipos de título, credores, grupos de despesa e despesas fixas)
 * persistido através do driver `contasPagarDb` (Dexie/Tauri SQLite).
 */
export function useContasPagarCatalog() {
  const [tituloConfigs, setTituloConfigs] = useState<TituloConfig[]>([]);
  const [credores, setCredores] = useState<Credor[]>([]);
  const [gruposDespesa, setGruposDespesa] = useState<GrupoDespesa[]>([]);
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await contasPagarDbDriver.init();
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [reload]);

  return { tituloConfigs, credores, gruposDespesa, despesasFixas, loading, reload };
}
