// Proprietário agora é um id (string) referenciando um Proprietario cadastrado
export type Proprietario = string;

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

export interface CredorConfig {
  nome: string;
  cpfCnpj: string;
  cidadeEstado?: string;
}

export interface Titulo {
  id: string;
  numero: number;
  tipo: string;
  cliente: string;
  clienteId?: string;
  telefone: string;
  dataEmissao: string;
  vencimento: string;
  valor: number;
  proprietario: Proprietario;
  dataPagamento?: string;
  valorPago?: number;
  recebidoPor?: string;
  formaPagamento?: string;
  maquininhaPagamento?: string; // maquininha usada no recebimento
  creditoAplicado?: number; // crédito do mês anterior usado
  creditoGerado?: number;   // crédito gerado para próximo mês
}

export interface FormaPagamento {
  id: string;
  nome: string;
}

export interface Maquininha {
  id: string;
  nome: string;
}

export interface MotivoAlteracao {
  id: string;
  texto: string;
}

export type ContaPagarCategoria =
  | 'FORNECEDOR'
  | 'FUNCIONARIO'
  | 'IMPOSTO'
  | 'ALUGUEL'
  | 'UTILIDADE'
  | 'SERVICO'
  | 'OUTRO';

export type ContaPagarStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export interface ContaPagar {
  id: string;
  numero: number;
  descricao: string;
  categoria: ContaPagarCategoria;
  tipoTitulo?: string;
  grupo_despesa?: string;
  favorecido: string;
  credorId?: string;
  valor: number;
  vencimento: string;
  competencia?: string;
  status: ContaPagarStatus;
  observacoes?: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  formaPagamentoId?: string;
  formaPagamentoNome?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  paidAmount?: number;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
}

export interface ContaPagarComCalculo extends ContaPagar {
  diasParaVencimento: number;
  agrupamentoFavorecido: string;
}

export interface ContaPagarCentroCusto {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
}

export interface ContaPagarFormaPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
}

export interface ContasPagarConfig {
  ativo: boolean;
  centrosCusto: ContaPagarCentroCusto[];
  formasPagamento: ContaPagarFormaPagamento[];
  categoriasFavoritas: ContaPagarCategoria[];
  gruposDespesa?: string[];
  tiposTitulo?: string[];
  credores?: ContaPagarCredor[];
  despesasFixas?: ContaPagarDespesaFixa[];
  gruposDetalhados?: ContaPagarGrupoDespesa[];
  multa?: number;
}

export interface ContaPagarContato {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
}

export interface ContaPagarCredor {
  id: string;
  nomeEmpresa: string;
  nomeFantasia?: string;
  rua?: string;
  bairro?: string;
  cep?: string;
  numero?: string;
  telefone?: string;
  telefoneWhatsapp?: string;
  contatos: ContaPagarContato[];
  createdAt: string;
  updatedAt: string;
}

export interface ContaPagarDespesaFixa {
  id: string;
  nome: string;
  grupo: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContaPagarGrupoDespesa {
  id: string;
  nome: string;
  itens: string[];
  createdAt: string;
  updatedAt: string;
}

export type Situacao = 'VENCIDO' | 'NO PRAZO' | 'PAGO';

export interface TituloComCalculo extends Titulo {
  diasAVencer: number;
  situacao: Situacao;
  valorJuros: number;
  valorMulta: number;
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

// ===== Descontos pré-definidos =====
export interface Desconto {
  id: string;
  apelido: string;
  valor: number;
  tipo: 'valor' | 'porcento'; // porcento: 0–100
}

// ===== Controle de Acesso =====
export type NivelUsuario = 'USUARIO' | 'GERENCIAL' | 'MASTER';

export type Permissao =
  | 'titulo.editar.valor'
  | 'titulo.editar.recebimento'
  | 'titulo.editar.proprietario'
  | 'titulo.editar.cliente'
  | 'titulo.editar.telefone'
  | 'titulo.editar.emissao'
  | 'titulo.editar.vencimento'
  | 'cliente.editar'
  | 'promissoria.criar'
  | 'promissoria.pdf'
  | 'caderno.criar'
  | 'dash.valorTotal'
  | 'relatorios.emitir'
  | 'config.proprietarios'
  | 'config.proprietariosCor'
  | 'config.credor'
  | 'config.taxa'
  | 'config.pix'
  | 'config.formasPagamento'
  | 'config.maquininhas'
  | 'config.telefonesAlerta'
  | 'config.emailCobranca'
  | 'config.emailEnviar'
  | 'config.darkMode'
  | 'config.avatar'
  | 'config.backup'
  | 'titulo.receber';

export interface Usuario {
  id: string;
  nome: string;
  pin: string; // hash
  nivel: NivelUsuario;
  master?: boolean; // master inicial não pode ser excluído
}

export interface PermissoesPorNivel {
  USUARIO: Permissao[];
  GERENCIAL: Permissao[];
  MASTER: Permissao[];
}

// ===== Vendas a vista =====
export interface VendaVista {
  id: string;
  data: string;
  hora?: string; // HH:mm
  clienteId?: string;
  clienteNome: string;
  valor: number;
  desconto: number;
  descontoTipo: 'valor' | 'porcento';
  formaPagamento: string;
  parcelas?: number;
  maquininha?: string;
  registradoPor: string;
  obs?: string;
}

// ===== Log =====
export type LogTipo =
  | 'login' | 'logout'
  | 'titulo.criar' | 'titulo.editar' | 'titulo.excluir' | 'titulo.pagar'
  | 'conta-pagar.criar' | 'conta-pagar.editar' | 'conta-pagar.excluir' | 'conta-pagar.pagar' | 'conta-pagar.reverter'
  | 'cliente.criar' | 'cliente.editar' | 'cliente.excluir'
  | 'venda.vista'
  | 'whatsapp.pagamento';

export interface LogEntry {
  id: string;
  data: string; // ISO
  usuario: string;
  tipo: LogTipo;
  descricao: string;
  metadata?: Record<string, any>;
}

export interface AppConfig {
  taxa: number;
  pin: string | null;
  metaSemanal?: number;
  nomeEmpresa?: string;
  empresa?: string;
  darkMode: boolean;
  chavesPix: ChavePix[];
  telefonesAlerta: TelefoneAlerta[];
  horarioAlerta: string;
  funcionarios?: Funcionario[]; // kept for backward compat with old configs
  proprietarios: ProprietarioConfig[];
  clientes: Cliente[];
  credor?: CredorConfig;
  textoCobrancaEmail?: string;
  avatarAjudaAtivo?: boolean;
  formasPagamento?: FormaPagamento[];
  maquininhas?: Maquininha[];
  motivosAlteracao?: MotivoAlteracao[];
  usuarios?: Usuario[];
  permissoes?: PermissoesPorNivel;
  logoEmpresa?: string; // base64
  vendas?: VendaVista[];
  logs?: LogEntry[];
  caminhoSalvarDados?: string; // caminho/pasta para salvar PDFs e promissórias
  idleAtivo?: boolean;
  idleMinutes?: number;
  descontos?: Desconto[]; // descontos pré-definidos
  mensagemAniversario?: string; // mensagem padrão para aniversariantes
  contasPagar?: ContasPagarConfig;
}

export const PERMISSAO_LABELS: Record<Permissao, string> = {
  'titulo.editar.valor': 'Editar título: Valor',
  'titulo.editar.recebimento': 'Editar título: valor recebido, data e tipo',
  'titulo.editar.proprietario': 'Editar título: Proprietário',
  'titulo.editar.cliente': 'Editar título: Cliente',
  'titulo.editar.telefone': 'Editar título: Telefone',
  'titulo.editar.emissao': 'Editar título: Emissão',
  'titulo.editar.vencimento': 'Editar título: Vencimento',
  'cliente.editar': 'Editar todos os dados do cliente',
  'promissoria.criar': 'Criar Notas Promissórias',
  'promissoria.pdf': 'Criar PDF e Imprimir promissórias',
  'caderno.criar': 'Criar Lançamento Caderno',
  'dash.valorTotal': 'Dash: ver Card "Valor Total"',
  'relatorios.emitir': 'Emitir relatórios',
  'config.proprietarios': 'Config: Proprietários',
  'config.proprietariosCor': 'Config: Cor de fundo dos títulos',
  'config.credor': 'Config: Credor (Promissória)',
  'config.taxa': 'Config: Taxa de juros',
  'config.pix': 'Config: Chaves PIX',
  'config.formasPagamento': 'Config: Formas de pagamento',
  'config.maquininhas': 'Config: Maquininhas/Operadoras',
  'config.telefonesAlerta': 'Config: Telefones para alertas',
  'config.emailCobranca': 'Config: E-mail de cobrança (Gmail)',
  'config.emailEnviar': 'Config: Enviar e-mail (Gmail)',
  'config.darkMode': 'Config: Fundo escuro',
  'config.avatar': 'Config: Avatar de ajuda',
  'config.backup': 'Config: Backup do sistema',
  'titulo.receber': 'Receber título (registrar pagamento)',
};

export const ALL_PERMISSOES = Object.keys(PERMISSAO_LABELS) as Permissao[];
