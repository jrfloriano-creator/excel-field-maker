export interface Titulo {
  id: string;
  numero: number;
  tipo: string;
  cliente: string;
  telefone: string;
  vencimento: string; // ISO date string
  valor: number;
  dataPagamento?: string; // ISO date string
  valorPago?: number;
}

export type Situacao = 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export interface TituloComCalculo extends Titulo {
  diasAVencer: number;
  situacao: Situacao;
  valorJuros: number;
  valorCorrigido: number;
}
