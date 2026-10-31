// src/lib/database.ts
import { AppConfig, ContaPagar, LogEntry, Titulo, Usuario } from '@/types/titulo';
import Dexie, { Table } from 'dexie';

// ============================================================
// isTauri exportado como função única (evita duplicação)
// ============================================================
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// ============================================================
// Mutex global e conexão Tauri em cache
// ============================================================
let dbQueue: Promise<any> = Promise.resolve();

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const p = dbQueue.then(fn, fn);
  dbQueue = p.catch(() => {});
  return p;
}

// ✅ CORREÇÃO: Exporta serialized para uso em contasPagarDb.ts
export { serialized };

let tauriDbPromise: Promise<any> | null = null;

export async function getTauriDb() {
  if (!tauriDbPromise) {
    tauriDbPromise = (async () => {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      return Database.load('sqlite:financeiro.sqlite');
    })();
  }
  return tauriDbPromise;
}

// ============================================================
// CORREÇÃO CRÍTICA: initPromise agora limpa falhas para permitir retry
// ============================================================
let initPromise: Promise<void> | null = null;

// --- Dexie (PWA/Web) Setup ---
class FinanceiroDatabase extends Dexie {
  titulos!: Table<Titulo, string>;
  usuarios!: Table<Usuario, string>;
  logs!: Table<LogEntry, string>;
  kv!: Table<{ key: string; value: any }, string>;
  contasPagar!: Table<ContaPagar, string>;

  constructor() {
    super('FinanceiroDB');
    this.version(1).stores({
      titulos: 'id',
      usuarios: 'id',
      logs: 'id, data', // ✅ CORREÇÃO: índice em data para ordenação correta
      contasPagar: 'id, status, vencimento, categoria',
      kv: 'key',
    });
  }
}

const dexieDb = new FinanceiroDatabase();

async function tauriTransaction<T>(fn: (db: any) => Promise<T>): Promise<T> {
  const db = await getTauriDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    const result = await fn(db);
    await db.execute('COMMIT');
    return result;
  } catch (e) {
    await db.execute('ROLLBACK');
    throw e;
  }
}

export const dbDriver = {
  async init(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        if (isTauri()) {
          return serialized(async () => {
            const db = await getTauriDb();
            await db.execute(
              `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
            );
            await db.execute(
              `CREATE TABLE IF NOT EXISTS titulos (id TEXT PRIMARY KEY, data TEXT NOT NULL)`
            );
            await db.execute(
              `CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, data TEXT NOT NULL)`
            );
            await db.execute(
              `CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, data TEXT NOT NULL)`
            );
            await db.execute(
              `CREATE TABLE IF NOT EXISTS contas_pagar (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL, vencimento TEXT NOT NULL, categoria TEXT NOT NULL)`
            );
            await db.execute('PRAGMA journal_mode=WAL');
            await db.execute('PRAGMA busy_timeout=5000');
          });
        } else {
          await dexieDb.open();
        }
      } catch (e) {
        // ✅ CORREÇÃO CRÍTICA: Limpa initPromise em caso de falha
        // para permitir nova tentativa na próxima chamada
        console.error('[database] falha no init:', e);
        initPromise = null;
        throw e;
      }
    })();

    return initPromise;
  },

  // ============================================================
  // TITULOS
  // ============================================================
  async getTitulos(): Promise<Titulo[]> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM titulos');
        return rows.map((r) => JSON.parse(r.data));
      });
    } else {
      return await dexieDb.titulos.toArray();
    }
  },

  async saveTitulo(titulo: Titulo): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO titulos(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [titulo.id, JSON.stringify(titulo)]
        );
      });
    } else {
      await dexieDb.titulos.put(titulo);
    }
  },

  async deleteTitulo(id: string): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM titulos WHERE id = $1', [id]);
      });
    } else {
      await dexieDb.titulos.delete(id);
    }
  },

  // ✅ CORREÇÃO: saveTitulos com diff (deleta registros que saíram da lista)
  async saveTitulos(titulos: Titulo[]): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        await tauriTransaction(async (db) => {
          const existing: any[] = await db.select('SELECT id FROM titulos');
          const existingIds = new Set(existing.map((r) => r.id));
          const currentIds = new Set(titulos.map((t) => t.id));

          for (const t of titulos) {
            await db.execute(
              'INSERT INTO titulos(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
              [t.id, JSON.stringify(t)]
            );
          }
          for (const id of existingIds) {
            if (!currentIds.has(id)) {
              await db.execute('DELETE FROM titulos WHERE id = $1', [id]);
            }
          }
        });
      });
    } else {
      await dexieDb.transaction('rw', dexieDb.titulos, async () => {
        const currentIds = titulos.map((t) => t.id);
        const existing = await dexieDb.titulos.toCollection().primaryKeys();
        const toDelete = existing.filter((id) => !currentIds.includes(id as string));
        await dexieDb.titulos.bulkDelete(toDelete as string[]);
        await dexieDb.titulos.bulkPut(titulos);
      });
    }
  },

  // ============================================================
  // USUARIOS
  // ============================================================
  async getUsuarios(): Promise<Usuario[]> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM usuarios');
        return rows.map((r) => JSON.parse(r.data));
      });
    } else {
      return await dexieDb.usuarios.toArray();
    }
  },

  async saveUsuario(usuario: Usuario): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO usuarios(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [usuario.id, JSON.stringify(usuario)]
        );
      });
    } else {
      await dexieDb.usuarios.put(usuario);
    }
  },

  async deleteUsuario(id: string): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM usuarios WHERE id = $1', [id]);
      });
    } else {
      await dexieDb.usuarios.delete(id);
    }
  },

  // ✅ CORREÇÃO: saveUsuarios com diff (deleta registros que saíram da lista)
  async saveUsuarios(usuarios: Usuario[]): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        await tauriTransaction(async (db) => {
          const existing: any[] = await db.select('SELECT id FROM usuarios');
          const existingIds = new Set(existing.map((r) => r.id));
          const currentIds = new Set(usuarios.map((u) => u.id));

          for (const u of usuarios) {
            await db.execute(
              'INSERT INTO usuarios(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
              [u.id, JSON.stringify(u)]
            );
          }
          for (const id of existingIds) {
            if (!currentIds.has(id)) {
              await db.execute('DELETE FROM usuarios WHERE id = $1', [id]);
            }
          }
        });
      });
    } else {
      await dexieDb.transaction('rw', dexieDb.usuarios, async () => {
        const currentIds = usuarios.map((u) => u.id);
        const existing = await dexieDb.usuarios.toCollection().primaryKeys();
        const toDelete = existing.filter((id) => !currentIds.includes(id as string));
        await dexieDb.usuarios.bulkDelete(toDelete as string[]);
        await dexieDb.usuarios.bulkPut(usuarios);
      });
    }
  },

  // ============================================================
  // LOGS
  // ============================================================
  // ✅ CORREÇÃO CRÍTICA: Ordena por data (não por id, que é randomUUID)
  async getLogs(): Promise<LogEntry[]> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        // ✅ CORREÇÃO: Ordena pelo campo 'data' dentro do JSON
        const rows: any[] = await db.select('SELECT data FROM logs');
        const logs = rows.map((r) => JSON.parse(r.data));
        return logs.sort((a: LogEntry, b: LogEntry) =>
          new Date(b.data).getTime() - new Date(a.data).getTime()
        );
      });
    } else {
      // ✅ CORREÇÃO: Dexie ordena por data (não por id)
      return await dexieDb.logs.orderBy('data').reverse().toArray();
    }
  },

  async addLog(log: LogEntry): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('INSERT INTO logs(id, data) VALUES($1, $2)', [
          log.id,
          JSON.stringify(log),
        ]);
      });
    } else {
      await dexieDb.logs.add(log);
    }
  },

  // ✅ CORREÇÃO CRÍTICA: saveLogs com transação e proteção
  async saveLogs(logs: LogEntry[]): Promise<void> {
    await dbDriver.init();

    // ✅ CORREÇÃO: Proteção contra apagamento acidental
    // Se a lista estiver vazia, NÃO apaga os logs existentes
    if (logs.length === 0) {
      console.warn('[database] saveLogs chamado com lista vazia - ignorando para evitar perda de dados');
      return;
    }

    if (isTauri()) {
      return serialized(async () => {
        await tauriTransaction(async (db) => {
          await db.execute('DELETE FROM logs');
          for (const l of logs) {
            await db.execute('INSERT INTO logs(id, data) VALUES($1, $2)', [
              l.id,
              JSON.stringify(l),
            ]);
          }
        });
      });
    } else {
      await dexieDb.transaction('rw', dexieDb.logs, async () => {
        await dexieDb.logs.clear();
        await dexieDb.logs.bulkPut(logs);
      });
    }
  },

  // ============================================================
  // CONTAS A PAGAR
  // ============================================================
  async getContasPagar(): Promise<ContaPagar[]> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select(
          'SELECT data FROM contas_pagar ORDER BY vencimento ASC, id ASC'
        );
        return rows.map((r) => JSON.parse(r.data));
      });
    } else {
      return await dexieDb.contasPagar.orderBy('vencimento').toArray();
    }
  },

  async saveConta(conta: ContaPagar): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO contas_pagar(id, data, status, vencimento, categoria) VALUES($1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET data = excluded.data, status = excluded.status, vencimento = excluded.vencimento, categoria = excluded.categoria',
          [conta.id, JSON.stringify(conta), conta.status, conta.vencimento, conta.categoria]
        );
      });
    } else {
      await dexieDb.contasPagar.put(conta);
    }
  },

  async deleteConta(id: string): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM contas_pagar WHERE id = $1', [id]);
      });
    } else {
      await dexieDb.contasPagar.delete(id);
    }
  },

  async saveContasPagar(contas: ContaPagar[]): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        await tauriTransaction(async (db) => {
          await db.execute('DELETE FROM contas_pagar');
          for (const conta of contas) {
            await db.execute(
              'INSERT INTO contas_pagar(id, data, status, vencimento, categoria) VALUES($1, $2, $3, $4, $5)',
              [conta.id, JSON.stringify(conta), conta.status, conta.vencimento, conta.categoria]
            );
          }
        });
      });
    } else {
      await dexieDb.transaction('rw', dexieDb.contasPagar, async () => {
        await dexieDb.contasPagar.clear();
        await dexieDb.contasPagar.bulkPut(contas);
      });
    }
  },

  // ============================================================
  // KV (Config)
  // ============================================================
  async kvGet(key: string): Promise<any | null> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT value FROM kv WHERE key = $1', [key]);
        return rows.length > 0 ? JSON.parse(rows[0].value) : null;
      });
    } else {
      const res = await dexieDb.kv.get(key);
      return res ? res.value : null;
    }
  },

  async kvSet(key: string, value: any): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT key FROM kv WHERE key = $1', [key]);
        if (rows.length > 0) {
          await db.execute('UPDATE kv SET value = $1 WHERE key = $2', [
            JSON.stringify(value),
            key,
          ]);
        } else {
          await db.execute('INSERT INTO kv(key, value) VALUES($1, $2)', [
            key,
            JSON.stringify(value),
          ]);
        }
      });
    } else {
      await dexieDb.kv.put({ key, value });
    }
  },

  // ============================================================
  // IMPORT ALL (Backup/Restore) - em transação atômica
  // ============================================================
  async importAll(
    titulos: any[],
    configKv: any,
    usuarios: any[],
    logs: any[]
  ): Promise<void> {
    await dbDriver.init();
    if (isTauri()) {
      return serialized(async () => {
        await tauriTransaction(async (db) => {
          await db.execute('DELETE FROM titulos');
          for (const t of titulos) {
            await db.execute('INSERT INTO titulos(id, data) VALUES($1, $2)', [
              t.id,
              JSON.stringify(t),
            ]);
          }
          await db.execute('DELETE FROM usuarios');
          for (const u of usuarios) {
            await db.execute('INSERT INTO usuarios(id, data) VALUES($1, $2)', [
              u.id,
              JSON.stringify(u),
            ]);
          }
          await db.execute('DELETE FROM logs');
          for (const l of logs) {
            await db.execute('INSERT INTO logs(id, data) VALUES($1, $2)', [
              l.id,
              JSON.stringify(l),
            ]);
          }
          const rows: any[] = await db.select('SELECT key FROM kv WHERE key = $1', ['config']);
          if (rows.length > 0) {
            await db.execute('UPDATE kv SET value = $1 WHERE key = $2', [
              JSON.stringify(configKv),
              'config',
            ]);
          } else {
            await db.execute('INSERT INTO kv(key, value) VALUES($1, $2)', [
              'config',
              JSON.stringify(configKv),
            ]);
          }
        });
      });
    } else {
      await dexieDb.transaction(
        'rw',
        dexieDb.titulos,
        dexieDb.usuarios,
        dexieDb.logs,
        dexieDb.kv,
        async () => {
          await dexieDb.titulos.clear();
          await dexieDb.titulos.bulkPut(titulos);
          await dexieDb.usuarios.clear();
          await dexieDb.usuarios.bulkPut(usuarios);
          await dexieDb.logs.clear();
          await dexieDb.logs.bulkPut(logs);
          await dexieDb.kv.put({ key: 'config', value: configKv });
        }
      );
    }
  },
};