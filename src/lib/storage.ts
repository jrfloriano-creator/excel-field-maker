// src/lib/storage.ts
import {
  Titulo,
  AppConfig,
  Cliente,
  ProprietarioConfig,
  Usuario,
  LogEntry,
  ContasPagarConfig,
  ContaPagar,
} from '@/types/titulo';
import { dbDriver } from './database';
import { defaultPermissoes } from './auth';

const CONFIG_KEY = 'config';
const LS_TITULOS_KEY = 'financeiro_titulos';
const LS_CONFIG_KEY = 'financeiro_config';
const LS_MIGRATED_FLAG = 'financeiro_sqlite_migrated';
const LEGACY_TANIA_ID = 'legacy-tania';
const LEGACY_RAMON_ID = 'legacy-ramon';

const DEFAULT_PROPRIETARIOS: ProprietarioConfig[] = [
  { id: LEGACY_TANIA_ID, nome: 'Tania', cor: '#FFD9B3' },
  { id: LEGACY_RAMON_ID, nome: 'Ramon', cor: '#BFE0FA' },
];

export const DEFAULT_CONTAS_PAGAR_CONFIG: ContasPagarConfig = {
  multa: 0,
  jurosDia: 0,
  categorias: [],
  credores: [],
  motivoExclusao: [],
};

export const DEFAULT_CONFIG: AppConfig = {
  versao: 2,
  empresa: {
    nome: '',
    cpfCnpj: '',
    endereco: '',
    telefone: '',
    email: '',
  },
  taxa: 0.01,
  multa: 0,
  juros: 0,
  chavesPix: [],
  formasPagamento: [],
  descontos: [],
  maquininhas: [],
  proprietarios: DEFAULT_PROPRIETARIOS,
  usuarios: [],
  contasPagar: DEFAULT_CONTAS_PAGAR_CONFIG,
  motivosAlteracao: [],
  telefonesAlerta: [],
  emailCobranca: {
    remetente: '',
    remetenteNome: '',
    smtpServidor: '',
    smtpPorta: 587,
    smtpUsuario: '',
    smtpSenha: '',
    smtpSeguranca: 'tls',
  },
  aparencia: {
    tema: 'sistema',
    corPrimaria: '#3b82f6',
    corSecundaria: '#64748b',
  },
  vendas: [],
  backup: {
    ultimoAutomatico: undefined,
    agendamento: 'diario',
  },
  clientes: [],
  logs: [],
  // ✅ CORREÇÃO CRÍTICA: permissoes agora usa defaultPermissoes()
  // Em vez de {} (que era truthy e fazia hasPerm falhar)
  permissoes: defaultPermissoes(),
};

// ✅ CORREÇÃO CRÍTICA: Flag para bloquear gravações se config não carregou
let configCarregada = false;

function normalizeTitulo(t: any): Titulo {
  let proprietario = t.proprietario;
  if (proprietario === 'TANIA') proprietario = LEGACY_TANIA_ID;
  else if (proprietario === 'RAMON') proprietario = LEGACY_RAMON_ID;
  else if (!proprietario) proprietario = LEGACY_TANIA_ID;
  return {
    ...t,
    proprietario,
    dataEmissao: t.dataEmissao || t.vencimento,
  } as Titulo;
}

// ============================================================
// TITULOS
// ============================================================
export async function getTitulos(): Promise<Titulo[]> {
  const tits = await dbDriver.getTitulos();
  return tits.map(normalizeTitulo);
}

export async function saveTitulos(titulos: Titulo[]): Promise<void> {
  await dbDriver.saveTitulos(titulos);
}

export async function saveTitulo(titulo: Titulo): Promise<void> {
  await dbDriver.saveTitulo(titulo);
}

export async function deleteTitulo(id: string): Promise<void> {
  await dbDriver.deleteTitulo(id);
}

// ============================================================
// CONTAS A PAGAR
// ============================================================
export async function getContasPagar(): Promise<ContaPagar[]> {
  return await dbDriver.getContasPagar();
}

export async function saveContasPagar(contas: ContaPagar[]): Promise<void> {
  await dbDriver.saveContasPagar(contas);
}

export async function saveConta(conta: ContaPagar): Promise<void> {
  await dbDriver.saveConta(conta);
}

export async function deleteConta(id: string): Promise<void> {
  await dbDriver.deleteConta(id);
}

// ============================================================
// CONFIG
// ============================================================
export async function getConfig(): Promise<AppConfig> {
  const raw = await dbDriver.kvGet(CONFIG_KEY);
  if (!raw) {
    configCarregada = true;
    return { ...DEFAULT_CONFIG };
  }
  try {
    let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const merged: AppConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      contasPagar: {
        ...DEFAULT_CONTAS_PAGAR_CONFIG,
        ...(parsed?.contasPagar || {}),
      },
    };
    if (!merged.proprietarios || merged.proprietarios.length === 0) {
      merged.proprietarios = DEFAULT_PROPRIETARIOS;
    }
    if (!merged.clientes) merged.clientes = [];

    // ✅ CORREÇÃO CRÍTICA: Se permissoes estiver vazio ou ausente,
    // usa defaultPermissoes() para não quebrar hasPerm
    if (!merged.permissoes || Object.keys(merged.permissoes).length === 0) {
      merged.permissoes = defaultPermissoes();
    }

    // Recupera usuarios e logs das tabelas dedicadas
    merged.usuarios = await dbDriver.getUsuarios();
    merged.logs = await dbDriver.getLogs();

    configCarregada = true;
    return merged;
  } catch (e) {
    console.error('[storage] erro ao carregar config:', e);
    // ✅ CORREÇÃO CRÍTICA: Em caso de erro, NÃO retorna DEFAULT_CONFIG
    // com usuarios: [] (que apagaria tudo no próximo saveConfig)
    // Lança o erro para que o chamador saiba que algo deu errado
    throw new Error('Falha ao carregar configuração do sistema');
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  // ✅ CORREÇÃO CRÍTICA: Bloqueia gravação se config não foi carregada
  // Isso evita que um getConfig falho + saveConfig apague todos os dados
  if (!configCarregada) {
    console.error('[storage] saveConfig bloqueado: config não foi carregada com sucesso');
    throw new Error('Configuração não carregada - gravação bloqueada para evitar perda de dados');
  }

  // ✅ CORREÇÃO: Só salva usuarios se a lista não estiver vazia
  // (evita apagamento acidental)
  if (config.usuarios && config.usuarios.length > 0) {
    await dbDriver.saveUsuarios(config.usuarios);
  }

  // ✅ CORREÇÃO: Só salva logs se a lista não estiver vazia
  if (config.logs && config.logs.length > 0) {
    await dbDriver.saveLogs(config.logs);
  }

  // O que sobra vai para KV
  const copy = { ...config };
  delete copy.usuarios;
  delete copy.logs;
  await dbDriver.kvSet(CONFIG_KEY, copy);
}

// ============================================================
// UTILITÁRIOS
// ============================================================
export function generateId(): string {
  return crypto.randomUUID();
}

export function getNextNumero(titulos: Titulo[]): number {
  if (titulos.length === 0) return 1;
  return Math.max(...titulos.map((t) => t.numero)) + 1;
}

// ✅ CORREÇÃO: retorna string (não number) para casar com ContaPagar.numero
export function getNextNumeroContaPagar(contas: ContaPagar[]): string {
  if (contas.length === 0) return '1';
  const max = contas.reduce((m, conta) => {
    const n = typeof conta.numero === 'string' ? parseInt(conta.numero, 10) : conta.numero;
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return String(max + 1);
}

const bufferToBase64 = (buf: ArrayBuffer | Uint8Array) => {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...arr));
};

const base64ToBuffer = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export function legacyHashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5 - hash) + char;
    hash |= 0;
  }
  return hash.toString();
}

export async function hashPin(pin: string, providedSalt?: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const salt = providedSalt || crypto.getRandomValues(new Uint8Array(16));
  const data = new Uint8Array(pin.length + salt.length);
  data.set(enc.encode(pin));
  data.set(salt, pin.length);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return `v1:${bufferToBase64(salt)}:${bufferToBase64(hashBuffer)}`;
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // ✅ SEGURANÇA: apenas hashes no formato v1: são aceitos (fallback plain-text removido)
  if (!storedHash.startsWith('v1:')) {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const salt = base64ToBuffer(parts[1]);
  const expectedHash = await hashPin(pin, salt);
  return expectedHash === storedHash;
}

export function findCliente(clientes: Cliente[], id?: string): Cliente | undefined {
  if (!id) return undefined;
  return clientes.find((c) => c.id === id);
}

export async function importBackup(titulos: Titulo[], config: AppConfig): Promise<void> {
  const usuarios = config.usuarios ?? [];
  const logs = config.logs ?? [];
  const configKv = { ...config };
  delete configKv.usuarios;
  delete configKv.logs;
  await dbDriver.importAll(titulos.map(normalizeTitulo), configKv, usuarios, logs);
}

export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  let migrated = false;
  if (localStorage.getItem(LS_MIGRATED_FLAG) !== '1') {
    const titulosRaw = localStorage.getItem(LS_TITULOS_KEY);
    if (titulosRaw) {
      try {
        const arr = JSON.parse(titulosRaw) as any[];
        await saveTitulos(arr.map(normalizeTitulo));
        migrated = true;
      } catch (e) {
        console.warn('Falha ao migrar títulos do localStorage', e);
      }
    }
    const configRaw = localStorage.getItem(LS_CONFIG_KEY);
    if (configRaw) {
      try {
        const c = JSON.parse(configRaw);
        await saveConfig(c);
        migrated = true;
      } catch (e) {
        console.warn('Falha ao migrar config do localStorage', e);
      }
    }
    localStorage.setItem(LS_MIGRATED_FLAG, '1');
  }

  const rawConfig = await dbDriver.kvGet(CONFIG_KEY);
  if (rawConfig) {
    const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    let schemaChanged = false;
    if (parsed.usuarios && Array.isArray(parsed.usuarios) && parsed.usuarios.length > 0) {
      const dbUsuarios = await dbDriver.getUsuarios();
      if (dbUsuarios.length === 0) {
        await dbDriver.saveUsuarios(parsed.usuarios);
        delete parsed.usuarios;
        schemaChanged = true;
      }
    }
    if (parsed.logs && Array.isArray(parsed.logs) && parsed.logs.length > 0) {
      const dbLogs = await dbDriver.getLogs();
      if (dbLogs.length === 0) {
        await dbDriver.saveLogs(parsed.logs);
        delete parsed.logs;
        schemaChanged = true;
      }
    }
    if (schemaChanged) {
      await dbDriver.kvSet(CONFIG_KEY, parsed);
      migrated = true;
    }
  }
  return migrated;
}

// ============================================================
// DUPLICAR DESPESA RECORRENTE
// ============================================================
// ✅ CORREÇÃO CRÍTICA: Usa matemática local (não UTC) para evitar
// bug de fuso horário (ex: '2026-11' virava outubro no Brasil)
export async function duplicarDespesaRecorrente(
  contaId: string,
  novoMes?: string
): Promise<string | null> {
  const contas = await getContasPagar();
  const contaOriginal = contas.find((c) => c.id === contaId);
  if (!contaOriginal) {
    console.warn('Conta não encontrada para duplicação:', contaId);
    return null;
  }

  // ✅ CORREÇÃO: Parse local da data (não UTC)
  const [anoOrig, mesOrig, diaOrig] = contaOriginal.vencimento.split('-').map(Number);
  let ano: number;
  let mes: number;
  let dia: number = diaOrig;

  if (novoMes) {
    const [novoAno, novoMes] = novoMes.split('-').map(Number);
    ano = novoAno;
    mes = novoMes;
  } else {
    ano = anoOrig;
    mes = mesOrig + 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  // ✅ CORREÇÃO: Ajusta dia para o último dia do mês se necessário
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  dia = Math.min(dia, ultimoDiaDoMes);

  const proximoVencimento = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const proximoMes = proximoVencimento.slice(0, 7);
  const novoNumero = getNextNumeroContaPagar(contas);

  // ✅ CORREÇÃO: Limpa campos de pagamento da conta original
  // para não copiar paidAt/paidAmount para a nova conta PENDENTE
  const novaConta: ContaPagar = {
    ...contaOriginal,
    id: generateId(),
    numero: novoNumero as any,
    vencimento: proximoVencimento,
    competencia: proximoMes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'PENDENTE',
    recorrente: true,
    origemRecorrencia: contaOriginal.id,
    // ✅ Limpa campos de pagamento
    dataPagamento: undefined,
    valorPago: undefined,
    paidAt: undefined,
    paidAmount: undefined,
    formaPagamento: undefined,
    formaPagamentoId: undefined,
  };

  await saveConta(novaConta);
  console.log('✅ Despesa duplicada:', novaConta.id, novaConta.vencimento);
  return novaConta.id;
}