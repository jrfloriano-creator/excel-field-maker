import { Titulo, AppConfig, Cliente, ProprietarioConfig } from '@/types/titulo';
import { getDB, kvGet, kvSet, schedulePersist } from './sqlite';

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

const DEFAULT_CONFIG: AppConfig = {
  taxa: 0.01,
  pin: null,
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
  credor: { nome: '', cpfCnpj: '' },
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

export function getTitulos(): Titulo[] {
  const stmt = getDB().prepare('SELECT data FROM titulos');
  const out: Titulo[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { data: string };
    try {
      out.push(normalizeTitulo(JSON.parse(row.data)));
    } catch {
      // ignora linhas inválidas
    }
  }
  stmt.free();
  return out;
}

export function saveTitulos(titulos: Titulo[]): void {
  const db = getDB();
  db.exec('BEGIN');
  try {
    db.run('DELETE FROM titulos');
    const ins = db.prepare('INSERT INTO titulos(id, data) VALUES(?, ?)');
    for (const t of titulos) ins.run([t.id, JSON.stringify(t)]);
    ins.free();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  schedulePersist();
}

export function getConfig(): AppConfig {
  const raw = kvGet(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    const merged: AppConfig = { ...DEFAULT_CONFIG, ...parsed };
    if (!merged.proprietarios || merged.proprietarios.length === 0) {
      merged.proprietarios = DEFAULT_PROPRIETARIOS;
    }
    if (!merged.clientes) merged.clientes = [];
    return merged;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  kvSet(CONFIG_KEY, JSON.stringify(config));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getNextNumero(titulos: Titulo[]): number {
  if (titulos.length === 0) return 1;
  return Math.max(...titulos.map(t => t.numero)) + 1;
}

export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString();
}

export function verifyPin(pin: string, storedHash: string): boolean {
  return hashPin(pin) === storedHash;
}

export function findCliente(clientes: Cliente[], id?: string): Cliente | undefined {
  if (!id) return undefined;
  return clientes.find(c => c.id === id);
}

/** Migra dados existentes do localStorage para o SQLite (uma única vez). */
export function migrateFromLocalStorageIfNeeded(): boolean {
  if (localStorage.getItem(LS_MIGRATED_FLAG) === '1') return false;
  let migrated = false;

  const titulosRaw = localStorage.getItem(LS_TITULOS_KEY);
  if (titulosRaw) {
    try {
      const arr = JSON.parse(titulosRaw) as any[];
      saveTitulos(arr.map(normalizeTitulo));
      migrated = true;
    } catch (e) {
      console.warn('Falha ao migrar títulos do localStorage', e);
    }
  }

  const configRaw = localStorage.getItem(LS_CONFIG_KEY);
  if (configRaw) {
    try {
      kvSet(CONFIG_KEY, configRaw);
      migrated = true;
    } catch (e) {
      console.warn('Falha ao migrar config do localStorage', e);
    }
  }

  localStorage.setItem(LS_MIGRATED_FLAG, '1');
  return migrated;
}
