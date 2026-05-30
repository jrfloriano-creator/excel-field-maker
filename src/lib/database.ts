import { AppConfig, LogEntry, Titulo, Usuario } from '@/types/titulo';
import Dexie, { Table } from 'dexie';

// --- Dexie (PWA/Web) Setup ---
class FinanceiroDatabase extends Dexie {
  titulos!: Table<Titulo, string>;
  usuarios!: Table<Usuario, string>;
  logs!: Table<LogEntry, string>;

  constructor() {
    super('FinanceiroDB');
    this.version(1).stores({
      titulos: 'id',
      usuarios: 'id',
      logs: 'id',
      kv: 'key'
    });
  }
}
const dexieDb = new FinanceiroDatabase();

// --- Helper Detecção ---
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// --- Tauri (Desktop) Setup ---
// Use Promise as cache to avoid race condition where getTauriDb() is called
// multiple times before the first await resolves (would create multiple connections)
let tauriDbPromise: Promise<any> | null = null;

async function getTauriDb() {
  if (!tauriDbPromise) {
    tauriDbPromise = (async () => {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      return Database.load('sqlite:financeiro.sqlite');
    })();
  }
  return tauriDbPromise;
}

// Helper: retry a DB operation up to maxRetries times on SQLITE_BUSY (code 5)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const code = err?.code ?? err?.cause?.code ?? (typeof err?.message === 'string' && err.message.includes('5') ? 5 : -1);
      const msg = typeof err?.message === 'string' ? err.message : '';
      const isBusy = code === 5 || msg.includes('SQLITE_BUSY') || msg.includes('database is locked');
      if (isBusy && i < maxRetries - 1) {
        console.warn(`[DB] SQLITE_BUSY on attempt ${i + 1}, retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        lastErr = err;
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

export const dbDriver = {
  async init() {
    if (isTauri()) {
      const db = await getTauriDb();
      await db.execute(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS titulos (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
      await db.execute(`CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
      // WAL mode allows concurrent reads; busy_timeout prevents SQLITE_BUSY errors
      await db.execute('PRAGMA journal_mode=WAL');
      await db.execute('PRAGMA busy_timeout=5000');
    } else {
      await dexieDb.open();
    }
  },

  async getTitulos(): Promise<Titulo[]> {
    if (isTauri()) {
      const db = await getTauriDb();
      const rows: any[] = await db.select('SELECT data FROM titulos');
      return rows.map(r => JSON.parse(r.data));
    } else {
      return await dexieDb.titulos.toArray();
    }
  },

  async saveTitulos(titulos: Titulo[]): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      try {
        const existing: any[] = await db.select('SELECT id FROM titulos');
        const existingIds = new Set(existing.map(r => r.id));
        const currentIds = new Set(titulos.map(t => t.id));

        for (const t of titulos) {
          await db.execute('INSERT INTO titulos(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data', [t.id, JSON.stringify(t)]);
        }

        for (const id of existingIds) {
          if (!currentIds.has(id)) {
            await db.execute('DELETE FROM titulos WHERE id = $1', [id]);
          }
        }
      } catch (e) {
        throw e;
      }
    } else {
      await dexieDb.transaction('rw', dexieDb.titulos, async () => {
        const currentIds = titulos.map(t => t.id);
        const existing = await dexieDb.titulos.keys();
        const toDelete = existing.filter(id => !currentIds.includes(id as string));
        await dexieDb.titulos.bulkDelete(toDelete as string[]);
        await dexieDb.titulos.bulkPut(titulos);
      });
    }
  },

  async getUsuarios(): Promise<Usuario[]> {
    if (isTauri()) {
      const db = await getTauriDb();
      const rows: any[] = await db.select('SELECT data FROM usuarios');
      return rows.map(r => JSON.parse(r.data));
    } else {
      return await dexieDb.usuarios.toArray();
    }
  },

  async saveUsuarios(usuarios: Usuario[]): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      try {
        const existing: any[] = await db.select('SELECT id FROM usuarios');
        const existingIds = new Set(existing.map(r => r.id));
        const currentIds = new Set(usuarios.map(u => u.id));

        for (const u of usuarios) {
          await db.execute('INSERT INTO usuarios(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data', [u.id, JSON.stringify(u)]);
        }

        for (const id of existingIds) {
          if (!currentIds.has(id)) {
            await db.execute('DELETE FROM usuarios WHERE id = $1', [id]);
          }
        }
      } catch (e) {
        throw e;
      }
    } else {
      await dexieDb.transaction('rw', dexieDb.usuarios, async () => {
        const currentIds = usuarios.map(u => u.id);
        const existing = await dexieDb.usuarios.keys();
        const toDelete = existing.filter(id => !currentIds.includes(id as string));
        await dexieDb.usuarios.bulkDelete(toDelete as string[]);
        await dexieDb.usuarios.bulkPut(usuarios);
      });
    }
  },

  async getLogs(): Promise<LogEntry[]> {
    if (isTauri()) {
      const db = await getTauriDb();
      const rows: any[] = await db.select('SELECT data FROM logs ORDER BY id ASC');
      return rows.map(r => JSON.parse(r.data));
    } else {
      return await dexieDb.logs.orderBy('id').toArray();
    }
  },

  async addLog(log: LogEntry): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      await db.execute('INSERT INTO logs(id, data) VALUES($1, $2)', [log.id, JSON.stringify(log)]);
    } else {
      await dexieDb.logs.add(log);
    }
  },

  async saveLogs(logs: LogEntry[]): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      try {
        const existing: any[] = await db.select('SELECT id FROM logs');
        const existingIds = new Set(existing.map(r => r.id));
        const currentIds = new Set(logs.map(l => l.id));

        for (const l of logs) {
          await db.execute('INSERT INTO logs(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data', [l.id, JSON.stringify(l)]);
        }

        for (const id of existingIds) {
          if (!currentIds.has(id)) {
            await db.execute('DELETE FROM logs WHERE id = $1', [id]);
          }
        }
      } catch (e) {
        throw e;
      }
    } else {
      await dexieDb.transaction('rw', dexieDb.logs, async () => {
        const currentIds = logs.map(l => l.id);
        const existing = await dexieDb.logs.keys();
        const toDelete = existing.filter(id => !currentIds.includes(id as string));
        await dexieDb.logs.bulkDelete(toDelete as string[]);
        await dexieDb.logs.bulkPut(logs);
      });
    }
  },

  async kvGet(key: string): Promise<any | null> {
    if (isTauri()) {
      const db = await getTauriDb();
      const rows: any[] = await db.select('SELECT value FROM kv WHERE key = $1', [key]);
      return rows.length > 0 ? JSON.parse(rows[0].value) : null;
    } else {
      const res = await dexieDb.kv.get(key);
      return res ? res.value : null;
    }
  },

  async kvSet(key: string, value: any): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      const rows: any[] = await db.select('SELECT key FROM kv WHERE key = $1', [key]);
      if (rows.length > 0) {
        await db.execute('UPDATE kv SET value = $1 WHERE key = $2', [JSON.stringify(value), key]);
      } else {
        await db.execute('INSERT INTO kv(key, value) VALUES($1, $2)', [key, JSON.stringify(value)]);
      }
    } else {
      await dexieDb.kv.put({ key, value });
    }
  },

  async importAll(titulos: any[], configKv: any, usuarios: any[], logs: any[]): Promise<void> {
    if (isTauri()) {
      const db = await getTauriDb();
      await withRetry(async () => {
        console.log('[importAll] Iniciando importação:', { titulos: titulos.length, usuarios: usuarios.length, logs: logs.length });
        // Limpa e reimporta titulos
        await db.execute('DELETE FROM titulos');
        console.log('[importAll] Titulos deletados');
        for (const t of titulos) {
          await db.execute('INSERT INTO titulos(id, data) VALUES($1, $2)', [t.id, JSON.stringify(t)]);
        }
        console.log('[importAll] Titulos inseridos:', titulos.length);
        // Limpa e reimporta usuarios
        await db.execute('DELETE FROM usuarios');
        console.log('[importAll] Usuarios deletados');
        for (const u of usuarios) {
          await db.execute('INSERT INTO usuarios(id, data) VALUES($1, $2)', [u.id, JSON.stringify(u)]);
        }
        console.log('[importAll] Usuarios inseridos:', usuarios.length);
        // Limpa e reimporta logs
        await db.execute('DELETE FROM logs');
        console.log('[importAll] Logs deletados');
        for (const l of logs) {
          await db.execute('INSERT INTO logs(id, data) VALUES($1, $2)', [l.id, JSON.stringify(l)]);
        }
        console.log('[importAll] Logs inseridos:', logs.length);
        // Atualiza config kv
        const rows: any[] = await db.select('SELECT key FROM kv WHERE key = $1', ['config']);
        if (rows.length > 0) {
          await db.execute('UPDATE kv SET value = $1 WHERE key = $2', [JSON.stringify(configKv), 'config']);
        } else {
          await db.execute('INSERT INTO kv(key, value) VALUES($1, $2)', ['config', JSON.stringify(configKv)]);
        }
        console.log('[importAll] Config salva');
      });
    } else {
      // Dexie: usa transação multi-tabela
      await dexieDb.transaction('rw', dexieDb.titulos, dexieDb.usuarios, dexieDb.logs, dexieDb.kv, async () => {
        await dexieDb.titulos.clear();
        await dexieDb.titulos.bulkPut(titulos);
        await dexieDb.usuarios.clear();
        await dexieDb.usuarios.bulkPut(usuarios);
        await dexieDb.logs.clear();
        await dexieDb.logs.bulkPut(logs);
        await dexieDb.kv.put({ key: 'config', value: configKv });
      });
    }
  }
};
