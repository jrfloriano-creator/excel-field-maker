// Cálculo de juros — padrão: 2% multa + 1% ao mês
export function calcularJurosEmTempoReal(
  valorOriginal: number,
  dataVencimento: string,
  taxaMultaPercentual: number = 2,
  taxaJurosMensalPercentual: number = 1
): { valorAtual: number; juros: number; diasAtraso: number; texto: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(`${dataVencimento}T00:00:00`);
  vencimento.setHours(0, 0, 0, 0);
  
  if (hoje <= vencimento) {
    return {
      valorAtual: valorOriginal,
      juros: 0,
      diasAtraso: 0,
      texto: '✅ Em dia — sem juros',
    };
  }
  
  const diasAtraso = Math.ceil((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
  const multa = valorOriginal * (taxaMultaPercentual / 100);
  const jurosDiario = (taxaJurosMensalPercentual / 30) / 100;
  const valorJuros = valorOriginal * jurosDiario * diasAtraso;
  const jurosTotal = multa + valorJuros;
  const valorAtual = valorOriginal + jurosTotal;

  return {
    valorAtual: Number(valorAtual.toFixed(2)),
    juros: Number(jurosTotal.toFixed(2)),
    diasAtraso,
    texto: `⚠️ ${diasAtraso} dia(s) de atraso — Juros: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jurosTotal)}`,
  };
}