export type Proprietario = 'TANIA' | 'RAMON';

export interface Titulo {
  id: string;
  numero: number;
  tipo: string;
  cliente: string;
  telefone: string;
  dataEmissao: string; // ISO date string
  vencimento: string; // ISO date string
  valor: number;
  proprietario: Proprietario;
  dataPagamento?: string; // ISO date string
  valorPago?: number;
  recebidoPor?: string; // funcionario nome
}

export type Situacao = 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export interface TituloComCalculo extends Titulo {
  diasAVencer: number;
  situacao: Situacao;
  valorJuros: number;
  valorCorrigido: number;
}

export interface ChavePix {
  id: string;
  nome: string;
  chave: string;
}

export interface TelefoneAlerta {
  numero: string;
  ativo: boolean;
}

export interface Funcionario {
  id: string;
  nome: string;
  pin: string; // hashed
}

export interface AppConfig {
  taxa: number;
  pin: string | null; // 4-digit PIN hash (admin/config)
  darkMode: boolean;
  chavesPix: ChavePix[];
  telefonesAlerta: TelefoneAlerta[];
  horarioAlerta: string; // HH:mm format
  funcionarios: Funcionario[];
}
