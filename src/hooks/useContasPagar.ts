import { useEffect, useMemo, useState } from 'react';
import { ContaPagar, Titulo } from '@/types/titulo';
import { generateId, getContasPagar, getNextNumeroContaPagar, getTitulos, saveContasPagar } from '@/lib/storage';
import { calcularStatusConta, ordenarContasPagar } from '@/lib/contas-pagar';
// ✅ Importa o catálogo com os credores do SQLite
import { useContasPagarCatalog } from './useContasPagarCatalog';

export type StatusFiltro = 'TODOS' | 'PENDENTE' | 'VENCIDA' | 'PAGA';

export function useContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('TODOS');
  
  // ✅ Carrega referência do catálogo (sem executar carregamento pesado no início)
  const catalogo = useContasPagarCatalog();

  // ✅ Carrega contas/títulos rapidamente — tela de login aparece logo
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

  // ✅ Carrega catálogo (credores) SOMENTE DEPOIS que os dados principais estão prontos
  // Isso evita travar a tela de login
  useEffect(() => {
    if (!catalogo.reload) return;
    // Dispara o carregamento em segundo plano, sem bloquear a interface
    const timer = setTimeout(() => {
      catalogo.reload();
    }, 100);
    return () => clearTimeout(timer);
  }, [catalogo]);

  const contasCalculadas = useMemo(
    () => ordenarContasPagar(contas.map(conta => calcularStatusConta(conta))),
    [contas]
  );

  const contasFiltradas = useMemo(() => {
    if (filtroStatus === 'TODOS') return contasCalculadas;
    return contasCalculadas.filter(c => c.status === filtroStatus);
  }, [contasCalculadas, filtroStatus]);

  // ✅ Disponibiliza credores e catálogo para os componentes
  const catalog = useMemo(() => ({
    credores: catalogo.credores,
    tituloConfigs: catalogo.tituloConfigs,
    gruposDespesa: catalogo.gruposDespesa,
    despesasFixas: catalogo.despesasFixas,
    loading: catalogo.loading,
    reload: catalogo.reload,
  }), [catalogo]);

  // ✅ CORRIGIDO: Usa função de atualização para sempre pegar o valor mais recente
  const addConta = async (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const now = new Date().toISOString();
    
    let novaConta: ContaPagar;
    
    setContas(contasAtuais => {
      novaConta = {
        ...data,
        id: generateId(),
        numero: getNextNumeroContaPagar(contasAtuais),
        createdAt: now,
        updatedAt: now,
        status: 'PENDENTE',
      };
      
      const listaAtualizada = [...contasAtuais, novaConta];
      saveContasPagar(listaAtualizada);
      return listaAtualizada;
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    return novaConta!;
  };

  // ✅ CORRIGIDO: Mesmo padrão para update
  const updateConta = async (id: string, data: Partial<ContaPagar>) => {
    setContas(contasAtuais => {
      const updated = contasAtuais.map(conta => 
        conta.id === id ? { ...conta, ...data, updatedAt: new Date().toISOString() } : conta
      );
      saveContasPagar(updated);
      return updated;
    });
  };

  // ✅ CORRIGIDO: Mesmo padrão para delete
  const deleteConta = async (id: string) => {
    setContas(contasAtuais => {
      const updated = contasAtuais.filter(conta => conta.id !== id);
      saveContasPagar(updated);
      return updated;
    });
  };

  const marcarComoPaga = async (id: string, dataPagamento?: string) => {
    await updateConta(id, {
      status: 'PAGA',
      dataPagamento: dataPagamento || new Date().toISOString().split('T')[0]
    });
  };

  const totais = useMemo(() => {
    const aberto = contasCalculadas.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + c.valor, 0);
    const vencido = contasCalculadas.filter(c => c.status === 'VENCIDA').reduce((s, c) => s + c.valor, 0);
    const pago = contasCalculadas.filter(c => c.status === 'PAGA').reduce((s, c) => s + c.valor, 0);
    return { aberto, vencido, pago };
  }, [contasCalculadas]);

  return {
    contas,
    contasCalculadas,
    contasFiltradas,
    titulos,
    loading,
    filtroStatus,
    setFiltroStatus,
    totais,
    catalog, // ✅ Disponível para LancamentoTitulo
    addConta,
    updateConta,
    deleteConta,
    marcarComoPaga
  };
}