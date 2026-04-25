// Proprietário agora é um id (string) referenciando um Proprietario cadastrado
export type Proprietario = string;

export interface ProprietarioConfig {
  id: string;
  nome: string;
  // Tailwind/HSL hue value 0-360 used to generate background color
  cor: string; // hex like #fde2c4
  corFundo?: string; // optional explicit background hsl
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpfCnpj?: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string; // sigla UF
}

export interface CredorConfig {
  nome: string;
  cpfCnpj: string;
  cidadeEstado?: string;
}

export interface Titulo {
  id: string;
  numero: number;
  tipo: string;
  cliente: string; // nome (snapshot)
  clienteId?: string; // referencia ao cadastro
  telefone: string;
  dataEmissao: string; // ISO date string
  vencimento: string; // ISO date string
  valor: number;
  proprietario: Proprietario; // id do proprietario
  dataPagamento?: string;
  valorPago?: number;
  recebidoPor?: string;
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
  pin: string;
}

export interface AppConfig {
  taxa: number;
  pin: string | null;
  darkMode: boolean;
  chavesPix: ChavePix[];
  telefonesAlerta: TelefoneAlerta[];
  horarioAlerta: string;
  funcionarios: Funcionario[];
  proprietarios: ProprietarioConfig[];
  clientes: Cliente[];
  credor?: CredorConfig;
}
