// src/lib/juros.ts
import { hojeLocal } from './calculos';

// ============================================================
// CORREÇÃO CRÍTICA: Unificação com calculos.ts.
// Antes: usava new Date() que pode dar problema com UTC.
// Agora: usa hojeLocal() para consistência.
// Taxas são PERCENTUAIS (2 = 2%, 1 = 1% ao mês).
// ============================================================

/**
 * Calcula juros e multa em tempo real para um título em atraso.
 * @param valorOriginal Valor original do título
 * @param dataVencimento Data de vencimento no formato YYYY-MM-DD
 * @param taxaMultaPercentual Percentual de multa (ex: 2 = 2%)
 * @param taxaJurosMensalPercentual Percentual de juros ao mês (ex: 1 = 1%)
 */
export function calcularJurosEmTempoReal(
  valorOriginal: number,
  dataVencimento: string,
  taxaMultaPercentual: number = 2,
  taxaJurosMensalPercentual: number = 1
): { valorAtual: number; juros: number; multa: number; diasAtraso: number; texto: string } {
  // CORREÇÃO: usa hojeLocal() para evitar problema com UTC
  const hojeStr = hojeLocal();
  const hoje = new Date(`${hojeStr}T00:00:00`);
  const vencimento = new Date(`${dataVencimento}T00:00:00`);

  if (hoje <= vencimento) {
    return {
      valorAtual: valorOriginal,
      juros: 0,
      multa: 0,
      diasAtraso: 0,
      texto: '✅ Em dia — sem juros',
    };
  }

  const diasAtraso = Math.ceil(
    (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
  );

  // CORREÇÃO: taxas como percentuais (2% = 2, não 0,02)
  const multa = valorOriginal * (taxaMultaPercentual / 100);
  const jurosDiario = taxaJurosMensalPercentual / 30 / 100;
  const valorJuros = valorOriginal * jurosDiario * diasAtraso;

  const jurosTotal = multa + valorJuros;
  const valorAtual = valorOriginal + jurosTotal;

  return {
    valorAtual: Number(valorAtual.toFixed(2)),
    juros: Number(valorJuros.toFixed(2)),
    multa: Number(multa.toFixed(2)),
    diasAtraso,
    texto: `⚠️ ${diasAtraso} dia(s) de atraso — Juros: ${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(jurosTotal)}`,
  };
}