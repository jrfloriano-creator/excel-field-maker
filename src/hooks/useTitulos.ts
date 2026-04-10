import { useState, useEffect } from 'react';
import { Titulo } from '@/types/titulo';
import { getTitulos, saveTitulos, getTaxa, saveTaxa, generateId, getNextNumero } from '@/lib/storage';

export function useTitulos() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [taxa, setTaxaState] = useState(0.01);

  useEffect(() => {
    setTitulos(getTitulos());
    setTaxaState(getTaxa());
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

  const setTaxa = (value: number) => {
    setTaxaState(value);
    saveTaxa(value);
  };

  return { titulos, taxa, setTaxa, addTitulo, updateTitulo, deleteTitulo };
}
