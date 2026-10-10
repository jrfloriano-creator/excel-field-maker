import { ContaPagar } from '@/types/titulo';
import { generateId } from './storage';

export interface ParcelaGerada {
  valorParcela: number;
  dataVencimento: string;
  numeroParcela: number;
}

export function gerarParcelas(
  valorTotal: number,
  quantidadeParcelas: number,
  dataPrimeiroVencimento: string
): ParcelaGerada[] {
  if (quantidadeParcelas <= 0) return [];
  
  const valorParcela = valorTotal / quantidadeParcelas;
  const parcelas: ParcelaGerada[] = [];
  
  const [anoInicio, mesInicio, diaInicio] = dataPrimeiroVencimento.split('-').map(Number);
  
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
    
    parcelas.push({
      valorParcela: Number(valorParcela.toFixed(2)),
      dataVencimento: dataFormatada,
      numeroParcela: i + 1,
    });
  }
  
  console.log('✅ Parcelas geradas:', parcelas);
  return parcelas;
}

export function criarLancamentosParcelados(
  dadosBase: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>,
  parcelas: ParcelaGerada[],
  numeroBase: string
): Array<
  Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'> & { competencia: string }
> {
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
  
  console.log('✅ Lançamentos prontos:', resultado);
  return resultado;
}