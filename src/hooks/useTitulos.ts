// src/hooks/useTitulos.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Titulo, AppConfig } from '@/types/titulo';
import {
  getTitulos,
  saveTitulos,
  saveTitulo,
  deleteTitulo,
  getConfig,
  saveConfig,
  generateId,
  getNextNumero,
  DEFAULT_CONFIG,
} from '@/lib/storage';
import { toast } from 'sonner';

export function useTitulos() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ✅ CORREÇÃO CRÍTICA: Refs sempre atualizados evitam closure stale
  // em chamadas consecutivas no mesmo ciclo síncrono (ex: receber vários títulos)
  const configRef = useRef<AppConfig>(DEFAULT_CONFIG);
  const titulosRef = useRef<Titulo[]>([]);

  // Mantém refs sincronizados a cada render
  configRef.current = config;
  titulosRef.current = titulos;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [tits, conf] = await Promise.all([getTitulos(), getConfig()]);
        if (!mounted) return;
        setTitulos(tits);
        titulosRef.current = tits;
        configRef.current = conf;
        setConfigState(conf);
        setError(null);
      } catch (err) {
        console.error('[useTitulos] erro ao carregar dados:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          toast.error('Falha ao carregar dados. Verifique o console.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const addTitulo = useCallback(async (data: Omit<Titulo, 'id' | 'numero'>) => {
    const currentTitulos = titulosRef.current;
    const novo: Titulo = {
      ...data,
      id: generateId(),
      numero: getNextNumero(currentTitulos),
    };

    // ✅ CORREÇÃO: Atualiza ref imediatamente (antes do setState completar)
    const updated = [...currentTitulos, novo];
    titulosRef.current = updated;
    setTitulos(updated);

    try {
      // ✅ CORREÇÃO: Usa saveTitulo por registro (não reescreve todos)
      await saveTitulo(novo);
      return novo;
    } catch (err) {
      console.error('[useTitulos] erro ao salvar título:', err);
      // Reverte em caso de erro
      titulosRef.current = currentTitulos;
      setTitulos(currentTitulos);
      throw err;
    }
  }, []);

  const addTitulos = useCallback(async (lista: Omit<Titulo, 'id' | 'numero'>[]) => {
    const currentTitulos = titulosRef.current;
    let prox = getNextNumero(currentTitulos);
    const novos: Titulo[] = lista.map((d) => ({
      ...d,
      id: generateId(),
      numero: prox++,
    }));

    const updated = [...currentTitulos, ...novos];
    titulosRef.current = updated;
    setTitulos(updated);

    try {
      // ✅ CORREÇÃO: Salva todos em lote via saveTitulos (transação)
      await saveTitulos(updated);
      return novos;
    } catch (err) {
      console.error('[useTitulos] erro ao salvar lote de títulos:', err);
      titulosRef.current = currentTitulos;
      setTitulos(currentTitulos);
      throw err;
    }
  }, []);

  // ✅ CORREÇÃO CRÍTICA: updateTitulo agora usa ref atualizado
  // e salva apenas o registro alterado (não reescreve todos)
  const updateTitulo = useCallback(async (id: string, data: Partial<Titulo>) => {
    const currentTitulos = titulosRef.current;
    const existente = currentTitulos.find((t) => t.id === id);
    if (!existente) {
      throw new Error(`Título ${id} não encontrado`);
    }

    const updatedTitulo: Titulo = {
      ...existente,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const updated = currentTitulos.map((t) => (t.id === id ? updatedTitulo : t));
    titulosRef.current = updated;
    setTitulos(updated);

    try {
      await saveTitulo(updatedTitulo);
    } catch (err) {
      console.error('[useTitulos] erro ao atualizar título:', err);
      titulosRef.current = currentTitulos;
      setTitulos(currentTitulos);
      throw err;
    }
  }, []);

  // ✅ CORREÇÃO CRÍTICA: updateTitulos para operações em lote
  // (ex: receber vários títulos de uma vez no RecebimentoTitulosDialog)
  const updateTitulos = useCallback(
    async (patches: Array<{ id: string; data: Partial<Titulo> }>) => {
      const currentTitulos = titulosRef.current;
      const patchMap = new Map(patches.map((p) => [p.id, p.data]));

      const updated = currentTitulos.map((t) => {
        const patch = patchMap.get(t.id);
        if (!patch) return t;
        return { ...t, ...patch, updatedAt: new Date().toISOString() };
      });

      titulosRef.current = updated;
      setTitulos(updated);

      try {
        // ✅ CORREÇÃO: Salva todos de uma vez em transação
        await saveTitulos(updated);
      } catch (err) {
        console.error('[useTitulos] erro ao atualizar lote:', err);
        titulosRef.current = currentTitulos;
        setTitulos(currentTitulos);
        throw err;
      }
    },
    []
  );

  // ✅ CORREÇÃO: deleteTitulo agora usa delete por registro
  const deleteTituloFn = useCallback(async (id: string) => {
    const currentTitulos = titulosRef.current;
    const updated = currentTitulos.filter((t) => t.id !== id);
    titulosRef.current = updated;
    setTitulos(updated);

    try {
      await deleteTitulo(id);
    } catch (err) {
      console.error('[useTitulos] erro ao excluir título:', err);
      titulosRef.current = currentTitulos;
      setTitulos(currentTitulos);
      throw err;
    }
  }, []);

  // ✅ CORREÇÃO: Typo corrigido (novos → novos)
  const replaceTitulos = useCallback(async (novos: Titulo[]) => {
    titulosRef.current = novos;
    setTitulos(novos);

    try {
      await saveTitulos(novos);
    } catch (err) {
      console.error('[useTitulos] erro ao substituir títulos:', err);
      throw err;
    }
  }, []);

  const updateConfig = useCallback(async (data: Partial<AppConfig>) => {
    const updated = { ...configRef.current, ...data };
    configRef.current = updated;
    setConfigState(updated);

    try {
      await saveConfig(updated);
    } catch (err) {
      console.error('[useTitulos] erro ao salvar config:', err);
      throw err;
    }
  }, []);

  return {
    titulos,
    config,
    updateConfig,
    addTitulo,
    addTitulos,
    updateTitulo,
    updateTitulos, // ✅ NOVO: para operações em lote
    deleteTitulo: deleteTituloFn,
    replaceTitulos,
    loading,
    error, // ✅ NOVO: expõe erro para a UI
  };
}