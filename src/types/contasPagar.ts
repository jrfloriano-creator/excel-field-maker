// ===== Novo modelo de dados para o módulo Contas a Pagar =====
// Este arquivo define as entidades usadas pelo novo driver `contasPagarDb.ts`.
// São entidades independentes das já existentes em `titulo.ts` (ContaPagar, ContaPagarCredor, etc.)
// para permitir uma evolução gradual do módulo sem quebrar o que já está em produção.

export type TipoTitulo = 'BOLETO' | 'CHEQUE' | 'CARTAO' | 'OUTROS';

export interface TituloConfig {
  id: string;
  nome: string;
  tipo: TipoTitulo;
  ativo: boolean;
}

export interface ContaPagarContatoInfo {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
}

export interface Credor {
  id: string;
  nomeEmpresa: string;
  nomeFantasia?: string;
  rua?: string;
  bairro?: string;
  cep?: string;
  numero?: string;
  telefone?: string;
  whatsapp?: string;
  contatos: ContaPagarContatoInfo[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface GrupoDespesa {
  id: string;
  nome: string;
  cor?: string;
  icone?: string;
}

export interface DespesaFixa {
  id: string;
  nome: string;
  grupoId: string;
  valorPadrao: number;
  recorrente: boolean;
  diaVencimento?: number;
}

export type TituloPagarStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO';

export interface TituloPagar {
  id: string;
  tipoTituloId: string;
  credorId: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: TituloPagarStatus;
  descricao?: string;
  createdAt: string;
  updatedAt: string;
  pagoPor?: string;
  observacao?: string;
}

export interface DespesaLancamento {
  id: string;
  despesaFixaId: string;
  mes: number;
  ano: number;
  valor: number;
  pago: boolean;
  dataPagamento?: string;
}

export interface MetaSemanal {
  semana: string;
  inicio: string;
  fim: string;
  meta: number;
  realizado: number;
  saldo: number;
}
