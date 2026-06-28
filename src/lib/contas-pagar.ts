import { ContaPagar, ContaPagarComCalculo } from '@/types/titulo';
import { formatCurrency } from '@/lib/calculos';

export function calcularStatusConta(conta: ContaPagar, now = new Date()): ContaPagarComCalculo {
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const vencimento = new Date(`${conta.vencimento}T00:00:00`).getTime();
  const diasParaVencimento = Math.round((vencimento - hoje) / 86400000);

  let status = conta.status;
  if (status !== 'PAGO' && status !== 'CANCELADO') {
    status = diasParaVencimento < 0 ? 'VENCIDO' : 'PENDENTE';
  }

  return {
    ...conta,
    status,
    diasParaVencimento,
    agrupamentoFavorecido: (conta.favorecido || 'Sem favorecido').trim().toLocaleLowerCase('pt-BR'),
  };
}

export function ordenarContasPagar(contas: ContaPagarComCalculo[]): ContaPagarComCalculo[] {
  return [...contas].sort((a, b) => {
    const byDate = new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
    if (byDate !== 0) return byDate;
    const byFavorecido = a.favorecido.localeCompare(b.favorecido, 'pt-BR');
    if (byFavorecido !== 0) return byFavorecido;
    return a.numero - b.numero;
  });
}

export function agruparContasPorFavorecido(contas: ContaPagarComCalculo[]) {
  const groups = new Map<string, { favorecido: string; contas: ContaPagarComCalculo[] }>();

  contas.forEach(conta => {
    const key = conta.agrupamentoFavorecido;
    const current = groups.get(key);
    if (current) {
      current.contas.push(conta);
      return;
    }
    groups.set(key, { favorecido: conta.favorecido || 'Sem favorecido', contas: [conta] });
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    contas: ordenarContasPagar(group.contas),
  }));
}

export function somarValorContas(contas: ContaPagarComCalculo[]) {
  return contas.reduce((total, conta) => total + conta.valor, 0);
}

export function formatarResumoGrupo(contas: ContaPagarComCalculo[]) {
  return `${contas.length} lançamento(s) • ${formatCurrency(somarValorContas(contas))}`;
}