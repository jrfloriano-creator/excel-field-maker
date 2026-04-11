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

export interface ChavePix {
  id: string;
  nome: string;
  chave: string;
}

export interface TelefoneAlerta {
  numero: string;
  ativo: boolean;
}

export interface AppConfig {
  taxa: number;
  pin: string | null; // 4-digit PIN hash
  darkMode: boolean;
  chavesPix: ChavePix[];
  telefonesAlerta: TelefoneAlerta[];
}
