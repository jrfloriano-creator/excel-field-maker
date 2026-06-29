import { Titulo, AppConfig, Cliente, ProprietarioConfig, Usuario, LogEntry, ContasPagarConfig, ContaPagar } from '@/types/titulo';
import { dbDriver } from './database';

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
  ativo: false,
  centrosCusto: [],
  formasPagamento: [],
  categoriasFavoritas: ['FORNECEDOR', 'SERVICO', 'UTILIDADE'],
  gruposDespesa: [
    'REMUNERAÇÕES',
    'ENCARGOS SOCIAIS',
    'BENEFÍCIOS',
    'OCUPAÇÃO',
    'TARIFAS PÚBLICAS',
    'PRESTADORES SERVIÇOS',
    'SEGUROS',
    'MANUTENÇÃO',
    'MARKETING',
    'VIAGENS',
    'GERAIS',
    'FINANCEIROS',
  ],
  tiposTitulo: ['Boletos', 'Cheques', 'Cartões', 'Outros'],
  credores: [],
  despesasFixas: [],
  gruposDetalhados: [
    { id: 'grupo-remuneracoes', nome: 'REMUNERAÇÕES', itens: ['Salário', 'Comissões', 'Outras remunerações'], createdAt: '', updatedAt: '' },
    { id: 'grupo-encargos', nome: 'ENCARGOS SOCIAIS', itens: ['13º Salário', 'INSS'], createdAt: '', updatedAt: '' },
    { id: 'grupo-beneficios', nome: 'BENEFÍCIOS', itens: ['Plano saúde', 'Vale refeição', 'Treinamento', 'Seguro vida', 'Outros'], createdAt: '', updatedAt: '' },
    { id: 'grupo-ocupacao', nome: 'OCUPAÇÃO', itens: ['Aluguel', 'Condomínio', 'IPTU', 'Outras'], createdAt: '', updatedAt: '' },
    { id: 'grupo-tarifas', nome: 'TARIFAS PÚBLICAS', itens: ['Luz', 'Telefone', 'Água', 'Internet', 'Outras'], createdAt: '', updatedAt: '' },
    { id: 'grupo-prestadores', nome: 'PRESTADORES SERVIÇOS', itens: ['Contabilidade', 'Advogado', 'Consultoria', 'Segurança', 'Limpeza', 'Outros'], createdAt: '', updatedAt: '' },
    { id: 'grupo-seguros', nome: 'SEGUROS', itens: ['Veículos', 'Outras'], createdAt: '', updatedAt: '' },
    { id: 'grupo-manutencao', nome: 'MANUTENÇÃO', itens: ['Veículos', 'Imóveis', 'Equipamentos'], createdAt: '', updatedAt: '' },
    { id: 'grupo-marketing', nome: 'MARKETING', itens: ['Propaganda e Promoção'], createdAt: '', updatedAt: '' },
    { id: 'grupo-viagens', nome: 'VIAGENS', itens: ['Passagens', 'Estadias'], createdAt: '', updatedAt: '' },
    { id: 'grupo-gerais', nome: 'GERAIS', itens: ['Materiais Consumo', 'Fretes Entregas', 'Combustíveis Locomoção', 'Correios', 'Cópias'], createdAt: '', updatedAt: '' },
    { id: 'grupo-financeiros', nome: 'FINANCEIROS', itens: ['Juros Bancários', 'Juros Diversos', 'Tarifas Bancárias'], createdAt: '', updatedAt: '' },
  ],
};

export const DEFAULT_CONFIG: AppConfig = {
  taxa: 0.01,
  pin: null,
  metaSemanal: 5000,
  darkMode: false,
  chavesPix: [],
  telefonesAlerta: [
    { numero: '', ativo: false },
    { numero: '', ativo: false },
  ],
  horarioAlerta: '08:00',
  funcionarios: [],
  proprietarios: DEFAULT_PROPRIETARIOS,
  clientes: [],
  credor: { nome: '', cpfCnpj: '', cidadeEstado: '' },
  usuarios: [],
  logs: [],
  descontos: [],
  mensagemAniversario: 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!',
  contasPagar: DEFAULT_CONTAS_PAGAR_CONFIG,
};

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

export async function getTitulos(): Promise<Titulo[]> {
  const tits = await dbDriver.getTitulos();
  return tits.map(normalizeTitulo);
}

export async function saveTitulos(titulos: Titulo[]): Promise<void> {
  await dbDriver.saveTitulos(titulos);
}

export async function getContasPagar(): Promise<ContaPagar[]> {
  return await dbDriver.getContasPagar();
}

export async function saveContasPagar(contas: ContaPagar[]): Promise<void> {
  await dbDriver.saveContasPagar(contas);
}

export async function getConfig(): Promise<AppConfig> {
  const raw = await dbDriver.kvGet(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
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
    
    // Recupera usuarios e logs das tabelas dedicadas
    merged.usuarios = await dbDriver.getUsuarios();
    merged.logs = await dbDriver.getLogs();
    
    return merged;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  // Salva usuarios e logs em tabelas separadas (como diz o plano)
  if (config.usuarios) {
    await dbDriver.saveUsuarios(config.usuarios);
  }
  if (config.logs) {
    await dbDriver.saveLogs(config.logs);
  }
  
  // O que sobra vai para KV
  const copy = { ...config };
  delete copy.usuarios;
  delete copy.logs;
  await dbDriver.kvSet(CONFIG_KEY, copy);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getNextNumero(titulos: Titulo[]): number {
  if (titulos.length === 0) return 1;
  return Math.max(...titulos.map(t => t.numero)) + 1;
}

export function getNextNumeroContaPagar(contas: ContaPagar[]): number {
  if (contas.length === 0) return 1;
  return Math.max(...contas.map(conta => conta.numero || 0)) + 1;
}

const bufferToBase64 = (buf: ArrayBuffer | Uint8Array) => {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...arr));
};
const base64ToBuffer = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export function legacyHashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
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
  if (!storedHash.startsWith('v1:')) {
    // Legacy plain-text or legacy hash fallback
    if (storedHash === pin) return true; // plain-text legacy
    return legacyHashPin(pin) === storedHash;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const salt = base64ToBuffer(parts[1]);
  const expectedHash = await hashPin(pin, salt);
  return expectedHash === storedHash;
}

export function findCliente(clientes: Cliente[], id?: string): Cliente | undefined {
  if (!id) return undefined;
  return clientes.find(c => c.id === id);
}

/**
 * Importa um backup completo em uma única transação atômica.
 * Evita "database is locked" ao garantir que titulos + config são escritos
 * numa mesma conexão sem transações concorrentes.
 */
export async function importBackup(titulos: Titulo[], config: AppConfig): Promise<void> {
  const usuarios = config.usuarios ?? [];
  const logs = config.logs ?? [];
  const configKv = { ...config };
  delete configKv.usuarios;
  delete configKv.logs;
  await dbDriver.importAll(titulos.map(normalizeTitulo), configKv, usuarios, logs);
}

/** Migra dados existentes do localStorage para a nova arquitetura (uma única vez). */
export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  // 1. Migração de localStorage (legado muito antigo)
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

  // 2. Migração de schema SQLite/Dexie (usuarios e logs no config -> tabelas próprias)
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