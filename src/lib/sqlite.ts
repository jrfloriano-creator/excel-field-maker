import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

// SQLite local persistido em OPFS (Origin Private File System).
// Fallback automático para localStorage se OPFS não estiver disponível.

const DB_FILENAME = 'financeiro.sqlite';
const LS_BACKUP_KEY = 'financeiro_sqlite_backup';
// WASM via CDN — sql.js precisa do .wasm correspondente à versão do JS
const SQL_WASM_URL = 'https://sql.js.org/dist/sql-wasm.wasm';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let opfsHandle: FileSystemFileHandle | null = null;
let saveTimer: number | null = null;

async function loadFromOPFS(): Promise<Uint8Array | null> {
  try {
    if (!('storage' in navigator) || !navigator.storage.getDirectory) return null;
    const root = await navigator.storage.getDirectory();
    opfsHandle = await root.getFileHandle(DB_FILENAME, { create: true });
    const file = await opfsHandle.getFile();
    if (file.size === 0) return null;
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    opfsHandle = null;
    return null;
  }
}

async function saveToOPFS(data: Uint8Array): Promise<boolean> {
  try {
    if (!opfsHandle) return false;
    // @ts-expect-error createWritable existe nos browsers modernos
    const writable = await opfsHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

function loadFromLocalStorage(): Uint8Array | null {
  const b64 = localStorage.getItem(LS_BACKUP_KEY);
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  } catch {
    return null;
  }
}

function saveToLocalStorage(data: Uint8Array) {
  let bin = '';
  for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
  try {
    localStorage.setItem(LS_BACKUP_KEY, btoa(bin));
  } catch (e) {
    console.warn('localStorage cheio: falha ao salvar backup do SQLite', e);
  }
}

async function persist() {
  if (!db) return;
  const data = db.export();
  const ok = await saveToOPFS(data);
  if (!ok) saveToLocalStorage(data);
}

/** Agendamento debounce para evitar I/O excessivo. */
export function schedulePersist() {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    persist();
  }, 200);
}

function createSchema(database: Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS titulos (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;
  SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });

  // Tenta OPFS primeiro, depois localStorage
  let bytes = await loadFromOPFS();
  if (!bytes) bytes = loadFromLocalStorage();

  db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  createSchema(db);
  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('Banco SQLite não inicializado. Chame initDatabase() primeiro.');
  return db;
}

/** Helpers KV para configuração e dados gerais. */
export function kvGet(key: string): string | null {
  const stmt = getDB().prepare('SELECT value FROM kv WHERE key = ?');
  stmt.bind([key]);
  const has = stmt.step();
  const row = has ? (stmt.getAsObject() as { value: string }) : null;
  stmt.free();
  return row ? row.value : null;
}

export function kvSet(key: string, value: string) {
  getDB().run('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  schedulePersist();
}

/** Persiste imediatamente (útil em export/backup manual). */
export async function flush() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  await persist();
}

/** Exporta o arquivo .sqlite (para backup do usuário). */
export function exportDatabase(): Uint8Array {
  return getDB().export();
}

/** Importa um arquivo .sqlite substituindo o banco atual. */
export async function importDatabase(bytes: Uint8Array) {
  if (!SQL) await initDatabase();
  db?.close();
  db = new SQL!.Database(bytes);
  createSchema(db);
  await flush();
}
