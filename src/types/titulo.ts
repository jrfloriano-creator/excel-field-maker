// src/types/titulo.ts

export type NivelUsuario = 'USUARIO' | 'GERENCIAL' | 'MASTER';

export type Permissao = 
  | 'titulo.editar.recebimento'
  | 'titulo.receber'
  | 'caderno.criar'
  | 'relatorios.emitir'
  | 'config.pix'
  | 'config.formasPagamento'
  | 'config.maquininhas'
  | 'config.telefonesAlerta'
  | 'config.emailCobranca'
  | 'config.emailEnviar'
  | 'config.darkMode'
  | 'config.avatar'
  | 'config.backup'
  | 'config.restaurar'
  | 'contasPagar.visualizar'
  | 'contasPagar.editar'
  | 'contasPagar.excluir';

export const ALL_PERMISSOES: Permissao[] = [
  'titulo.editar.recebimento',
  'titulo.receber',
  'caderno.criar',
  'relatorios.emitir',
  'config.pix',
  'config.formasPagamento',
  'config.maquininhas',
  'config.telefonesAlerta',
  'config.emailCobranca',
  'config.emailEnviar',
  'config.darkMode',
  'config.avatar',
  'config.backup',
  'config.restaurar',
  'contasPagar.visualizar',
  'contasPagar.editar',
  'contasPagar.excluir',
];

export const PERMISSAO_LABELS: Record<Permissao, string> = {
  'titulo.editar.recebimento': 'Editar Recebimento',
  'titulo.receber': 'Receber Títulos',
  'caderno.criar': 'Criar Cadernos',
  'relatorios.emitir': 'Emitir Relatórios',
  'config.pix': 'Configurar PIX',
  'config.formasPagamento': 'Formas de Pagamento',
  'config.maquininhas': 'Maquininhas',
  'config.telefonesAlerta': 'Telefones de Alerta',
  'config.emailCobranca': 'E-mail de Cobrança',
  'config.emailEnviar': 'Enviar E-mails',
  'config.darkMode': 'Modo Escuro',
  'config.avatar': 'Avatar',
  'config.backup': 'Backup Completo',
  'config.restaurar': 'Restaurar Sistema',
  'contasPagar.visualizar': 'Ver Contas a Pagar',
  'contasPagar.editar': 'Editar Contas a Pagar',
  'contasPagar.excluir': 'Excluir Contas a Pagar',
};

// ✅ CATEGORIAS DE DESPESAS — usado em ContasPagarDespesas.tsx
export const CATEGORIA_DESPESA_NOMES: Record<string, string> = {
  REMUNERACAO: 'Remuneração',
  ENCARGOS_SOCIAIS: 'Encargos Sociais',
  BENEFICIOS: 'Benefícios',
  OCUPACAO: 'Ocupação',
  TARIFAS_PUBLICAS: 'Tarifas Públicas',
  PRESTADORES_SERVICOS: 'Prestadores de Serviços',
  SEGUROS: 'Seguros',
  MANUTENCAO: 'Manutenção',
  MARKETING: 'Marketing',
  FINANCEIROS: 'Financeiros',
  VIAGENS: 'Viagens',
  GERAIS: 'Gerais',
  FORNECEDOR: 'Fornecedor / Título',
};

export interface ProprietarioConfig {
  id: string;
  nome: string;
  cor: string;
  corFundo?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  apelido?: string;
  telefone: string;
  email?: string;
  dataNascimento?: string;
  cpfCnpj?: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  dataCadastro?: string;
  indicacao?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  pin: string;
  nivel: NivelUsuario;
  permissoes: Permissao[];
  ativo: boolean;
  dataCriacao: string;
  ultimoAcesso?: string;
}

export interface ChavePix {
  id: string;
  tipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  valor: string;
  descricao?: string;
  banco: string;
  ativa: boolean;
}

export interface FormaPagamento {
  id: string;
  nome: string;
  ativa: boolean;
  prazoRecebimento?: number;
  taxa?: number;
}

export interface Desconto {
  id: string;
  nome: string;
  valor: number;
  tipo: 'valor' | 'percentual';
  ativo: boolean;
}

export interface ContaPagarCategoria {
  id: string;
  nome: string;
  tipo: 'fixa' | 'variavel' | 'investimento';
  ativa: boolean;
}

export interface Credor {
  id: string;
  nomeEmpresa: string;
  nomeFantasia?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  contatos: Array<{ nome: string; cargo?: string; telefone?: string }>;
  observacoes?: string;
  dataCadastro: string;
  ativo: boolean;
}

export interface ContaPagar {
  id: string;
  numero: number;
  descricao: string;
  categoria: string;
  favorecido: string;
  credorId?: string;
  valor: number;
  valorTotal?: number;
  numeroParcelas?: number;
  vencimento: string;
  competencia: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  dataPagamento?: string;
  valorPago?: number;
  observacoes?: string;
  tipoTitulo?: string;
  numeroCheque?: string;
  banco?: string;
  bandeiraCartao?: string;
  emissorCartao?: string;
  recorrente?: boolean;
  origemRecorrencia?: string;
  vigenciaMeses?: number;
  criadoPor?: string;
  atualizadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContaPagarComCalculo extends ContaPagar {
  diasParaVencimento: number;
  valorAtualizado: number;
}

export interface Titulo {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  valor: number;
  valorOriginal: number;
  entrada: number;
  parcelas: number;
  valorParcela: number;
  vencimento: string;
  competencia: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  formaPagamento?: string;
  observacoes?: string;
  dataPagamento?: string;
  valorPago?: number;
  jurosAplicados?: number;
  multaAplicada?: number;
  criadoPor?: string;
  atualizadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhes: string;
  ip?: string;
}

export type LogTipo = 'sucesso' | 'aviso' | 'erro' | 'info';

export interface ContasPagarConfig {
  multa: number;
  jurosDia: number;
  categorias: ContaPagarCategoria[];
  credores: Credor[];
  motivoExclusao: string[];
}

export interface AppConfig {
  empresa: {
    nome: string;
    cpfCnpj: string;
    endereco: string;
    telefone: string;
    email: string;
    logo?: string;
  };
  taxa: number;
  multa: number;
  juros: number;
  chavesPix: ChavePix[];
  formasPagamento: FormaPagamento[];
  descontos: Desconto[];
  maquininhas: Array<{
    id: string;
    nome: string;
    taxaCredito: number;
    taxaDebito: number;
    ativa: boolean;
  }>;
  proprietarios: ProprietarioConfig[];
  usuarios: Usuario[];
  contasPagar?: ContasPagarConfig;
  motivosAlteracao: string[];
  telefonesAlerta: string[];
  emailCobranca: {
    remetente: string;
    remetenteNome: string;
    smtpServidor: string;
    smtpPorta: number;
    smtpUsuario: string;
    smtpSenha: string;
    smtpSeguranca: 'tls' | 'ssl' | 'nenhuma';
  };
  aparencia: {
    tema: 'claro' | 'escuro' | 'sistema';
    corPrimaria: string;
    corSecundaria: string;
  };
  vendas: Array<{
    id: string;
    data: string;
    valor: number;
    fonte: string;
  }>;
  backup: {
    ultimoBackup?: string;
    agendamento?: 'diario' | 'semanal' | 'mensal' | 'desativado';
  };
}

export interface ProjecaoSemanal {
  semana: string;
  dataInicio: string;
  dataFim: string;
  valorContas: number;
  valorNecessario: number;
  valorProjetado: number;
  saldo: number;
}