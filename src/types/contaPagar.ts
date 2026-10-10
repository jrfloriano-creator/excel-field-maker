export type StatusConta = 'aberto' | 'vencido' | 'pago';

export interface ContaPagar {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  categoria: string;
  status: StatusConta;
  recorrencia?: 'mensal' | 'semanal' | 'unica';
  observacao?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProjecaoSemanal {
  semana: string;
  dataInicio: string;
  dataFim: string;
  totalContas: number;
  margemLucro: number;
  precisaVender: number;
  vendasEsperadas?: number;
  saldoProjetado: number;
}

export type NovaContaPagar = Omit<ContaPagar, 'id' | 'criadoEm' | 'atualizadoEm'>;