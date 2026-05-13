import { useState, useEffect, useRef } from 'react';
import { Titulo, AppConfig } from '@/types/titulo';
import { getTitulos, saveTitulos, getConfig, saveConfig, generateId, getNextNumero, DEFAULT_CONFIG } from '@/lib/storage';

export function useTitulos() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  // Ref sempre atualizado com o config mais recente — evita closure stale em
  // chamadas consecutivas de updateConfig no mesmo ciclo síncrono (ex: salvar
  // venda + appendLog na mesma função).
  const configRef = useRef<AppConfig>(DEFAULT_CONFIG);

  // Mantém ref sincronizado a cada render
  configRef.current = config;

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [tits, conf] = await Promise.all([getTitulos(), getConfig()]);
      if (mounted) {
        setTitulos(tits);
        configRef.current = conf;
        setConfigState(conf);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const addTitulo = async (data: Omit<Titulo, 'id' | 'numero'>) => {
    const novo: Titulo = {
      ...data,
      id: generateId(),
      numero: getNextNumero(titulos),
    };
    const updated = [...titulos, novo];
    setTitulos(updated);
    await saveTitulos(updated);
    return novo;
  };

  const addTitulos = async (lista: Omit<Titulo, 'id' | 'numero'>[]) => {
    let prox = getNextNumero(titulos);
    const novos: Titulo[] = lista.map(d => ({
      ...d,
      id: generateId(),
      numero: prox++,
    }));
    const updated = [...titulos, ...novos];
    setTitulos(updated);
    await saveTitulos(updated);
    return novos;
  };

  const updateTitulo = async (id: string, data: Partial<Titulo>) => {
    const updated = titulos.map(t => t.id === id ? { ...t, ...data } : t);
    setTitulos(updated);
    await saveTitulos(updated);
  };

  const deleteTitulo = async (id: string) => {
    const updated = titulos.filter(t => t.id !== id);
    setTitulos(updated);
    await saveTitulos(updated);
  };

  const replaceTitulos = async (novos: Titulo[]) => {
    setTitulos(novos);
    await saveTitulos(novos);
  };

  const updateConfig = async (data: Partial<AppConfig>) => {
    const updated = { ...configRef.current, ...data };
    configRef.current = updated;
    setConfigState(updated);
    await saveConfig(updated);
  };

  return { titulos, config, updateConfig, addTitulo, addTitulos, updateTitulo, deleteTitulo, replaceTitulos, loading };
}