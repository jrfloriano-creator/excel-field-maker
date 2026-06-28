import { useEffect, useMemo, useState } from 'react';
import { ContaPagar, Titulo } from '@/types/titulo';
import { generateId, getContasPagar, getNextNumeroContaPagar, getTitulos, saveContasPagar } from '@/lib/storage';
import { calcularStatusConta, ordenarContasPagar } from '@/lib/contas-pagar';

export function useContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getContasPagar(), getTitulos()]).then(([contasData, titulosData]) => {
      if (!mounted) return;
      setContas(contasData);
      setTitulos(titulosData);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const contasCalculadas = useMemo(
    () => ordenarContasPagar(contas.map(conta => calcularStatusConta(conta))),
    [contas]
  );

  const addConta = async (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const now = new Date().toISOString();
    const nova: ContaPagar = {
      ...data,
      id: generateId(),
      numero: getNextNumeroContaPagar(contas),
      createdAt: now,
      updatedAt: now,
      status: 'PENDENTE',
    };
    const updated = [...contas, nova];
    setContas(updated);
    await saveContasPagar(updated);
    return nova;
  };

  const updateConta = async (id: string, data: Partial<ContaPagar>) => {
    const updated = contas.map(conta => conta.id === id ? { ...conta, ...data, updatedAt: new Date().toISOString() } : conta);
    setContas(updated);
    await saveContasPagar(updated);
  };

  const deleteConta = async (id: string) => {
    const updated = contas.filter(conta => conta.id !== id);
    setContas(updated);
    await saveContasPagar(updated);
  };

  return { contas, contasCalculadas, titulos, loading, addConta, updateConta, deleteConta };
}