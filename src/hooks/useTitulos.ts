import { useState, useEffect } from 'react';
import { Titulo, AppConfig } from '@/types/titulo';
import { getTitulos, saveTitulos, getConfig, saveConfig, generateId, getNextNumero } from '@/lib/storage';

export function useTitulos() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [config, setConfigState] = useState<AppConfig>(getConfig());

  useEffect(() => {
    setTitulos(getTitulos());
    setConfigState(getConfig());
  }, []);

  const addTitulo = (data: Omit<Titulo, 'id' | 'numero'>) => {
    const novo: Titulo = {
      ...data,
      id: generateId(),
      numero: getNextNumero(titulos),
    };
    const updated = [...titulos, novo];
    setTitulos(updated);
    saveTitulos(updated);
    return novo;
  };

  const updateTitulo = (id: string, data: Partial<Titulo>) => {
    const updated = titulos.map(t => t.id === id ? { ...t, ...data } : t);
    setTitulos(updated);
    saveTitulos(updated);
  };

  const deleteTitulo = (id: string) => {
    const updated = titulos.filter(t => t.id !== id);
    setTitulos(updated);
    saveTitulos(updated);
  };

  const replaceTitulos = (novos: Titulo[]) => {
    setTitulos(novos);
    saveTitulos(novos);
  };

  const updateConfig = (data: Partial<AppConfig>) => {
    const updated = { ...config, ...data };
    setConfigState(updated);
    saveConfig(updated);
  };

  return { titulos, config, updateConfig, addTitulo, updateTitulo, deleteTitulo, replaceTitulos };
}
