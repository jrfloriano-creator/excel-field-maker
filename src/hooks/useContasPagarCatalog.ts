import { useCallback, useEffect, useState, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);
  const inicializado = useRef(false); // ✅ Evita recarregar várias vezes

  const reload = useCallback(async () => {
    if (inicializado.current) return; // ✅ Já carregou? Pula
    inicializado.current = true;
    setLoading(true);
    try {
      await contasPagarDbDriver.init();
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
    } catch (err) {
      console.warn('Catálogo: erro ao carregar', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Remove o carregamento automático do useEffect
  // Agora só carrega quando alguém chamar reload() explicitamente

  return { 
    tituloConfigs, 
    credores, 
    gruposDespesa, 
    despesasFixas, 
    loading,
    reload, // Chamar ao entrar na tela de Contas a Pagar
  };
}