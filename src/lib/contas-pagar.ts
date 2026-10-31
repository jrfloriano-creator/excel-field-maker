// src/lib/contas-pagar.ts
import { ContaPagar, ContaPagarComCalculo } from '@/types/titulo';
import { formatCurrency } from '@/lib/calculos';

/**
 * CORREÇÃO: agora aceita parâmetro `now` opcional para recalcular status 'vencido'
 * quando o app fica aberto de um dia para o outro.
 */
export function calcularStatusConta(conta: ContaPagar, now: Date = new Date()): ContaPagarComCalculo {
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
    valorAtualizado: conta.valor, // CORREÇÃO: campo obrigatório em ContaPagarComCalculo
    agrupamentoFavorecido: (conta.favorecido || 'Sem favorecido').trim().toLocaleLowerCase('pt-BR'),
  } as ContaPagarComCalculo;
}

export function ordenarContasPagar(contas: ContaPagarComCalculo[]): ContaPagarComCalculo[] {
  return [...contas].sort((a, b) => {
    const byDate = new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
    if (byDate !== 0) return byDate;
    const byFavorecido = a.favorecido.localeCompare(b.favorecido, 'pt-BR');
    if (byFavorecido !== 0) return byFavorecido;
    // CORREÇÃO: usa numeric:true para ordenar '10' depois de '2'
    return a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true });
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

// CORREÇÃO CRÍTICA: filtra CANCELADO e usa valorPago se disponível
export function somarValorContas(contas: ContaPagarComCalculo[]) {
  return contas
    .filter(c => c.status !== 'CANCELADO')
    .reduce((total, conta) => {
      const valor = conta.status === 'PAGO' ? (conta.valorPago ?? conta.valor) : conta.valor;
      return total + valor;
    }, 0);
}

export function formatarResumoGrupo(contas: ContaPagarComCalculo[]) {
  return `${contas.length} lançamento(s) • ${formatCurrency(somarValorContas(contas))}`;
}

export function formatarMesAno(mesAno: string): string {
  if (!mesAno || mesAno.length !== 7) return mesAno;
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  const indiceMes = parseInt(mes, 10) - 1;
  return `${nomesMeses[indiceMes]}/${ano}`;
}

// ============================================================
// CORREÇÃO CRÍTICA: Helper para data local (evita problemas com UTC)
// new Date().toISOString().split('T')[0] devolve o dia seguinte depois das 21h em SP
// ============================================================
export function hojeLocal(): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// CORREÇÃO: helper para competência local
export function competenciaLocal(data?: string): string {
  const d = data ? new Date(`${data}T00:00:00`) : new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}