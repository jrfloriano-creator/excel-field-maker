import { Desconto } from '@/types/titulo';

/**
 * Applies a pre-defined or ad-hoc discount to a total value.
 * Percentage is clamped to [0, 100]. Result is always >= 0.
 */
export function aplicarDesconto(valorTotal: number, desconto: Desconto): number {
  let valorDesconto: number;
  if (desconto.tipo === 'porcento') {
    const pct = Math.min(Math.max(desconto.valor, 0), 100);
    valorDesconto = valorTotal * (pct / 100);
  } else {
    valorDesconto = Math.max(desconto.valor, 0);
  }
  return Math.max(0, valorTotal - valorDesconto);
}

/**
 * Formats a discount for display (e.g. "10%" or "R$ 50,00").
 */
export function formatarDesconto(desconto: Desconto): string {
  if (desconto.tipo === 'porcento') {
    return `${desconto.valor}%`;
  }
  return desconto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
