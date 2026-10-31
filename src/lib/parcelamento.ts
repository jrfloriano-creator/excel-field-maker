// src/lib/parcelamento.ts
import { ContaPagar } from '@/types/titulo';
import { generateId } from './storage';

export interface ParcelaGerada {
  valorParcela: number;
  dataVencimento: string;
  numeroParcela: number;
}

/**
 * CORREÇÃO CRÍTICA: Ajuste da última parcela para evitar perda de centavos.
 * Antes: 100,00 em 3x → 33,33 × 3 = 99,99 (perde 1 centavo).
 * Agora: n-1 primeiras arredondadas, última = total - soma das anteriores.
 */
export function gerarParcelas(
  valorTotal: number,
  quantidadeParcelas: number,
  dataPrimeiroVencimento: string
): ParcelaGerada[] {
  if (quantidadeParcelas <= 0) return [];
  if (quantidadeParcelas === 1) {
    const [anoInicio, mesInicio, diaInicio] = dataPrimeiroVencimento.split('-').map(Number);
    const ultimoDiaDoMes = new Date(anoInicio, mesInicio, 0).getDate();
    const diaFinal = Math.min(diaInicio, ultimoDiaDoMes);
    const dataFormatada = `${anoInicio}-${String(mesInicio).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
    return [
      {
        valorParcela: Number(valorTotal.toFixed(2)),
        dataVencimento: dataFormatada,
        numeroParcela: 1,
      },
    ];
  }

  const valorParcelaBase = Math.floor((valorTotal / quantidadeParcelas) * 100) / 100;
  const parcelas: ParcelaGerada[] = [];

  const [anoInicio, mesInicio, diaInicio] = dataPrimeiroVencimento.split('-').map(Number);
  let somaParcelas = 0;

  for (let i = 0; i < quantidadeParcelas; i++) {
    let ano = anoInicio;
    let mes = mesInicio + i;
    while (mes > 12) {
      mes -= 12;
      ano += 1;
    }
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const diaFinal = Math.min(diaInicio, ultimoDiaDoMes);
    const dataFormatada = `${ano}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;

    let valorParcela: number;
    if (i === quantidadeParcelas - 1) {
      // CORREÇÃO: última parcela = total - soma das anteriores (ajuste de centavos)
      valorParcela = Number((valorTotal - somaParcelas).toFixed(2));
    } else {
      valorParcela = valorParcelaBase;
      somaParcelas += valorParcela;
    }

    parcelas.push({
      valorParcela,
      dataVencimento: dataFormatada,
      numeroParcela: i + 1,
    });
  }

  return parcelas;
}

export function criarLancamentosParcelados(
  dadosBase: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>,
  parcelas: ParcelaGerada[],
  numeroBase: string
): Array<Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'> & { competencia: string }> {
  const origemId = generateId();
  const resultado = parcelas.map((p, idx) => {
    const competencia = p.dataVencimento.slice(0, 7);
    return {
      ...dadosBase,
      id: `${origemId}-${idx}`,
      numero: `${numeroBase}-${String(idx + 1).padStart(2, '0')}`,
      valor: p.valorParcela,
      valorTotal: dadosBase.valorTotal || dadosBase.valor * parcelas.length,
      numeroParcelas: parcelas.length,
      numeroParcelaAtual: p.numeroParcela,
      vencimento: p.dataVencimento,
      competencia,
      origemParcelaId: origemId,
    };
  });
  // CORREÇÃO: removido console.log (limpeza)
  return resultado;
}