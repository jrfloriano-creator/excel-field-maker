import Dexie, { Table } from 'dexie';
import {
  Credor,
  DespesaFixa,
  DespesaLancamento,
  GrupoDespesa,
  TituloConfig,
  TituloPagar,
  TituloPagarStatus,
} from '@/types/contasPagar';

// --- Mutex: serializa TODAS as operações SQLite para evitar "database is locked" ---
let dbQueue: Promise<any> = Promise.resolve();

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const p = dbQueue.then(fn, fn);
  dbQueue = p.catch(() => {});
  return p;
}

// --- Dexie (PWA/Web) Setup ---
class ContasPagarDatabase extends Dexie {
  tituloConfigs!: Table<TituloConfig, string>;
  credores!: Table<Credor, string>;
  gruposDespesa!: Table<GrupoDespesa, string>;
  despesasFixas!: Table<DespesaFixa, string>;
  titulosPagar!: Table<TituloPagar, string>;
  despesaLancamentos!: Table<DespesaLancamento, string>;

  constructor() {
    super('ContasPagarDB');
    this.version(1).stores({
      tituloConfigs: 'id, tipo, ativo',
      credores: 'id, nomeEmpresa',
      gruposDespesa: 'id, nome',
      despesasFixas: 'id, grupoId',
      titulosPagar: 'id, credorId, tipoTituloId, status, dataVencimento',
      despesaLancamentos: 'id, despesaFixaId, [ano+mes]',
    });
  }
}
const dexieDb = new ContasPagarDatabase();

// --- Helper Detecção ---
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// --- Tauri (Desktop) Setup ---
// Reaproveita a mesma conexão sqlite usada pelo restante do app (financeiro.sqlite),
// apenas adicionando novas tabelas para as entidades deste módulo.
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

export const contasPagarDbDriver = {
  async init() {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(`CREATE TABLE IF NOT EXISTS titulo_configs (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS cp_credores (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS cp_grupos_despesa (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS cp_despesas_fixas (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS titulos_pagar (id TEXT PRIMARY KEY, data TEXT NOT NULL, credor_id TEXT, tipo_titulo_id TEXT, status TEXT NOT NULL, data_vencimento TEXT NOT NULL)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS cp_despesa_lancamentos (id TEXT PRIMARY KEY, data TEXT NOT NULL, despesa_fixa_id TEXT, ano INTEGER, mes INTEGER)`);
        await db.execute('PRAGMA journal_mode=WAL');
        await db.execute('PRAGMA busy_timeout=5000');
      });
    } else {
      await dexieDb.open();
    }
  },

  // ===== TituloConfig =====
  async getTituloConfigs(): Promise<TituloConfig[]> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM titulo_configs');
        return rows.map(r => JSON.parse(r.data));
      });
    }
    return await dexieDb.tituloConfigs.toArray();
  },

  async saveTituloConfig(item: TituloConfig): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO titulo_configs(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [item.id, JSON.stringify(item)]
        );
      });
    }
    await dexieDb.tituloConfigs.put(item);
  },

  async deleteTituloConfig(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM titulo_configs WHERE id = $1', [id]);
      });
    }
    await dexieDb.tituloConfigs.delete(id);
  },

  // ===== Credor =====
  async getCredores(): Promise<Credor[]> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM cp_credores');
        return rows.map(r => JSON.parse(r.data));
      });
    }
    return await dexieDb.credores.toArray();
  },

  async saveCredor(item: Credor): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO cp_credores(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [item.id, JSON.stringify(item)]
        );
      });
    }
    await dexieDb.credores.put(item);
  },

  async deleteCredor(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM cp_credores WHERE id = $1', [id]);
      });
    }
    await dexieDb.credores.delete(id);
  },

  // ===== GrupoDespesa =====
  async getGruposDespesa(): Promise<GrupoDespesa[]> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM cp_grupos_despesa');
        return rows.map(r => JSON.parse(r.data));
      });
    }
    return await dexieDb.gruposDespesa.toArray();
  },

  async saveGrupoDespesa(item: GrupoDespesa): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO cp_grupos_despesa(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [item.id, JSON.stringify(item)]
        );
      });
    }
    await dexieDb.gruposDespesa.put(item);
  },

  async deleteGrupoDespesa(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM cp_grupos_despesa WHERE id = $1', [id]);
      });
    }
    await dexieDb.gruposDespesa.delete(id);
  },

  // ===== DespesaFixa =====
  async getDespesasFixas(): Promise<DespesaFixa[]> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM cp_despesas_fixas');
        return rows.map(r => JSON.parse(r.data));
      });
    }
    return await dexieDb.despesasFixas.toArray();
  },

  async saveDespesaFixa(item: DespesaFixa): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO cp_despesas_fixas(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          [item.id, JSON.stringify(item)]
        );
      });
    }
    await dexieDb.despesasFixas.put(item);
  },

  async deleteDespesaFixa(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM cp_despesas_fixas WHERE id = $1', [id]);
      });
    }
    await dexieDb.despesasFixas.delete(id);
  },

  // ===== TituloPagar =====
  async getTitulosPagar(filters?: {
    credorId?: string;
    tipoTituloId?: string;
    status?: TituloPagarStatus;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<TituloPagar[]> {
    let items: TituloPagar[];
    if (isTauri()) {
      items = await serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM titulos_pagar ORDER BY data_vencimento ASC');
        return rows.map(r => JSON.parse(r.data));
      });
    } else {
      items = await dexieDb.titulosPagar.orderBy('dataVencimento').toArray();
    }

    if (!filters) return items;

    return items.filter(item => {
      if (filters.credorId && item.credorId !== filters.credorId) return false;
      if (filters.tipoTituloId && item.tipoTituloId !== filters.tipoTituloId) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.dataInicio && item.dataVencimento < filters.dataInicio) return false;
      if (filters.dataFim && item.dataVencimento > filters.dataFim) return false;
      return true;
    });
  },

  async getTituloPagarById(id: string): Promise<TituloPagar | undefined> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM titulos_pagar WHERE id = $1', [id]);
        return rows.length > 0 ? JSON.parse(rows[0].data) : undefined;
      });
    }
    return await dexieDb.titulosPagar.get(id);
  },

  async saveTituloPagar(item: TituloPagar): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO titulos_pagar(id, data, credor_id, tipo_titulo_id, status, data_vencimento) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT(id) DO UPDATE SET data = excluded.data, credor_id = excluded.credor_id, tipo_titulo_id = excluded.tipo_titulo_id, status = excluded.status, data_vencimento = excluded.data_vencimento',
          [item.id, JSON.stringify(item), item.credorId, item.tipoTituloId, item.status, item.dataVencimento]
        );
      });
    }
    await dexieDb.titulosPagar.put(item);
  },

  async deleteTituloPagar(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM titulos_pagar WHERE id = $1', [id]);
      });
    }
    await dexieDb.titulosPagar.delete(id);
  },

  /** Marca um título como pago, preenchendo dataPagamento e pagoPor. */
  async baixarTituloPagar(id: string, dataPagamento: string, pagoPor?: string): Promise<TituloPagar | undefined> {
    const atual = await this.getTituloPagarById(id);
    if (!atual) return undefined;

    const atualizado: TituloPagar = {
      ...atual,
      status: 'PAGO',
      dataPagamento,
      pagoPor,
      updatedAt: new Date().toISOString(),
    };
    await this.saveTituloPagar(atualizado);
    return atualizado;
  },

  /** Reverte a baixa de um título, voltando ao status PENDENTE/VENCIDO conforme a data de vencimento. */
  async reverterBaixaTitulo(id: string): Promise<TituloPagar | undefined> {
    const atual = await this.getTituloPagarById(id);
    if (!atual) return undefined;

    const hoje = new Date().toISOString().slice(0, 10);
    const novoStatus: TituloPagarStatus = atual.dataVencimento < hoje ? 'VENCIDO' : 'PENDENTE';

    const atualizado: TituloPagar = {
      ...atual,
      status: novoStatus,
      dataPagamento: undefined,
      pagoPor: undefined,
      updatedAt: new Date().toISOString(),
    };
    await this.saveTituloPagar(atualizado);
    return atualizado;
  },

  // ===== DespesaLancamento =====
  async getDespesaLancamentos(filters?: { despesaFixaId?: string; mes?: number; ano?: number }): Promise<DespesaLancamento[]> {
    let items: DespesaLancamento[];
    if (isTauri()) {
      items = await serialized(async () => {
        const db = await getTauriDb();
        const rows: any[] = await db.select('SELECT data FROM cp_despesa_lancamentos');
        return rows.map(r => JSON.parse(r.data));
      });
    } else {
      items = await dexieDb.despesaLancamentos.toArray();
    }

    if (!filters) return items;

    return items.filter(item => {
      if (filters.despesaFixaId && item.despesaFixaId !== filters.despesaFixaId) return false;
      if (filters.mes !== undefined && item.mes !== filters.mes) return false;
      if (filters.ano !== undefined && item.ano !== filters.ano) return false;
      return true;
    });
  },

  async saveDespesaLancamento(item: DespesaLancamento): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute(
          'INSERT INTO cp_despesa_lancamentos(id, data, despesa_fixa_id, ano, mes) VALUES($1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET data = excluded.data, despesa_fixa_id = excluded.despesa_fixa_id, ano = excluded.ano, mes = excluded.mes',
          [item.id, JSON.stringify(item), item.despesaFixaId, item.ano, item.mes]
        );
      });
    }
    await dexieDb.despesaLancamentos.put(item);
  },

  async deleteDespesaLancamento(id: string): Promise<void> {
    if (isTauri()) {
      return serialized(async () => {
        const db = await getTauriDb();
        await db.execute('DELETE FROM cp_despesa_lancamentos WHERE id = $1', [id]);
      });
    }
    await dexieDb.despesaLancamentos.delete(id);
  },
};
