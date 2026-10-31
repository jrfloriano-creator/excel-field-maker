// src/types/titulo.ts

// ============================================================
// CORREÇÃO: Adicionados tipos e campos que estavam faltando
// e que eram usados pelo código mas não declarados aqui.
// ============================================================

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

// ============================================================
// CORREÇÃO: Chaves agora usam acento para casar com o que a
// UI busca (ex: 'REMUNERAÇÕES' em Despesas). Mantemos também
// a versão sem acento como alias para compatibilidade.
// ============================================================
export const CATEGORIA_DESPESA_NOMES: Record<string, string> = {
  REMUNERAÇÕES: 'Remuneração',
  REMUNERACAO: 'Remuneração', // alias legado
  ENCARGOS_SOCIAIS: 'Encargos Sociais',
  BENEFÍCIOS: 'Benefícios',
  BENEFICIOS: 'Benefícios', // alias legado
  OCUPAÇÃO: 'Ocupação',
  OCUPACAO: 'Ocupação', // alias legado
  TARIFAS_PUBLICAS: 'Tarifas Públicas',
  TARIFAS_PÚBLICAS: 'Tarifas Públicas', // alias legado
  PRESTADORES_SERVICOS: 'Prestadores de Serviços',
  PRESTADORES_SERVIÇOS: 'Prestadores de Serviços', // alias legado
  SEGUROS: 'Seguros',
  MANUTENÇÃO: 'Manutenção',
  MANUTENCAO: 'Manutenção', // alias legado
  MARKETING: 'Marketing',
  FINANCEIROS: 'Financeiros',
  VIAGENS: 'Viagens',
  GERAIS: 'Gerais',
  FORNECEDOR: 'Fornecedor / Título',
};

// ============================================================
// CORREÇÃO: Tipo literal exportado para CategoriaDespesa,
// usado em formulários que antes tratavam ContaPagarCategoria
// como string.
// ============================================================
export type CategoriaDespesa = keyof typeof CATEGORIA_DESPESA_NOMES;

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
  // CORREÇÃO: campos que estavam faltando e são usados por auth.ts
  pinExpirado?: boolean; // força troca no 1º acesso
  tentativasFalhas?: number;
  bloqueadoAte?: string;
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

// ============================================================
// CORREÇÃO: Tipo literal único para 'valor' | 'percentual',
// antes havia divergência com 'porcento' em descontos.ts.
// ============================================================
export type DescontoTipo = 'valor' | 'percentual';

export interface Desconto {
  id: string;
  nome: string;
  valor: number;
  tipo: DescontoTipo;
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

// ============================================================
// CORREÇÃO CRÍTICA: Campos adicionados ao ContaPagar:
// - numero agora é string (localeCompare em contas-pagar.ts)
// - paidAt, paidAmount (padrão moderno)
// - tipo, centroCusto, formaPagamento
// - numeroParcelaAtual, origemParcelaId (parcelamento real)
// - grupoRecorrenciaId (recorrência com ID próprio)
// - status agora é tipado como SituacaoConta
// ============================================================
export type SituacaoConta = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export interface ContaPagar {
  id: string;
  numero: string; // CORREÇÃO: era number, agora string
  descricao: string;
  categoria: string;
  favorecido: string;
  creditorId?: string; // alias legado
  credorId?: string;
  valor: number;
  valorTotal?: number;
  numeroParcelas?: number;
  vencimento: string;
  competencia: string;
  status: SituacaoConta;
  dataPagamento?: string;
  paidAt?: string; // CORREÇÃO: alias moderno
  valorPago?: number;
  paidAmount?: number; // CORREÇÃO: alias moderno
  observacoes?: string;
  observacao?: string; // CORREÇÃO: alias legado (Despesas)
  tipo?: string; // CORREÇÃO: tipo do título (CARTAO, CHEQUE, etc)
  tipoTitulo?: string;
  tipoTituloId?: string; // CORREÇÃO: ID normalizado (CARTAOCRED, CHEQUE...)
  centroCusto?: string; // CORREÇÃO
  centroCustoId?: string; // CORREÇÃO
  formaPagamento?: string; // CORREÇÃO
  formaPagamentoId?: string; // CORREÇÃO
  numeroCheque?: string;
  banco?: string;
  bandeiraCartao?: string;
  emissorCartao?: string;
  recorrente?: boolean;
  origemRecorrencia?: string;
  grupoRecorrenciaId?: string; // CORREÇÃO: ID do grupo de recorrência
  vigenciaMeses?: number;
  numeroParcelaAtual?: number; // CORREÇÃO: parcela atual (1, 2, 3...)
  origemParcelaId?: string; // CORREÇÃO: ID da 1ª parcela do lote
  loteId?: string; // CORREÇÃO: ID do lote (para ações em lote)
  motivoExclusao?: string;
  criadoPor?: string;
  atualizadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContaPagarComCalculo extends ContaPagar {
  diasParaVencimento: number;
  valorAtualizado: number;
  juros?: number;
  multa?: number;
}

// CORREÇÃO: Alias para compatibilidade com código legado
export type TituloComCalculo = ContaPagarComCalculo;
export type Situacao = SituacaoConta;

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
  status: SituacaoConta;
  formaPagamento?: string;
  observacoes?: string;
  dataPagamento?: string;
  valorPago?: number;
  jurosAplicados?: number;
  multaAplicada?: number;
  // CORREÇÃO: campos para ações em lote
  loteId?: string;
  origemParcelaId?: string;
  numeroParcelaAtual?: number;
  tipoTituloId?: string;
  criadoPor?: string;
  atualizadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

// CORREÇÃO: Alias para compatibilidade
export type VendaVista = Titulo;

export interface LogEntry {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhes: string;
  ip?: string;
  tipo?: 'sucesso' | 'aviso' | 'erro' | 'info'; // CORREÇÃO: LogTipo inline
}

export type LogTipo = 'sucesso' | 'aviso' | 'erro' | 'info';

export interface ContasPagarConfig {
  multa: number;
  jurosDia: number;
  categorias: ContaPagarCategoria[];
  credores: Credor[];
  motivoExclusao: string[];
}

// ============================================================
// CORREÇÃO CRÍTICA: AppConfig agora inclui clientes, logs e
// permissoes, que eram usados pelo código mas não declarados.
// ============================================================
export interface AppConfig {
  versao?: number; // CORREÇÃO: para validação de backup
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
    ultimoAutomatico?: string; // CORREÇÃO: para agendamento correto
    agendamento?: 'diario' | 'semanal' | 'mensal' | 'desativado';
  };
  // CORREÇÃO: campos que estavam faltando
  clientes?: Cliente[];
  logs?: LogEntry[];
  permissoes?: Record<string, Permissao[]>;
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

// ============================================================
// CORREÇÃO: CredorConfig como alias para Credor, evitando
// duplicação de tipos em diferentes módulos.
// ============================================================
export type CredorConfig = Credor;