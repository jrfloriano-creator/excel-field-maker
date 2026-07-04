import { Titulo, AppConfig, ContaPagar } from '@/types/titulo';
import { getTitulos, getContasPagar, getConfig, saveContasPagar, importBackup } from './storage';

/**
 * Sistema de backup automático/manual do Controle Financeiro ZOOM.
 *
 * - Desktop (Tauri): grava arquivos JSON reais na pasta
 *   "Documentos/Backup Sistema Zoom" usando @tauri-apps/plugin-fs.
 * - Web/PWA: usa localStorage como fallback (não há acesso a pastas do SO).
 */

const PASTA_BACKUP_NOME = 'Backup Sistema Zoom';
const LS_BACKUP_PREFIX = 'zoom_backup_arquivo_';
const LS_HISTORICO_KEY = 'zoom_backup_historico';
const MAX_BACKUPS_AUTOMATICOS = 10;
const INTERVALO_BACKUP_MS = 24 * 60 * 60 * 1000; // 24 horas

export type TipoBackup = 'manual' | 'automatico';

export interface BackupInfo {
  nome: string;
  caminho?: string; // caminho completo no disco (apenas Tauri)
  data: string; // ISO timestamp de criação
  tipo: TipoBackup;
  tamanho?: number; // bytes
}

interface BackupPayload {
  versao: number;
  tipo: TipoBackup;
  exportadoEm: string;
  titulos: Titulo[];
  contasPagar: ContaPagar[];
  config: AppConfig;
}

const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimestamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function parseNomeBackup(nome: string): { tipo: TipoBackup; data: string } | null {
  const match = nome.match(/^backup_(manual|automatico)_(.+)\.json$/);
  if (!match) return null;
  const tipo = match[1] as TipoBackup;
  const isoLike = match[2].replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
  const dateObj = new Date(isoLike);
  return { tipo, data: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString() };
}

/* ============= Histórico (metadados) ============= */

function getHistoricoBackups(): BackupInfo[] {
  try {
    const raw = localStorage.getItem(LS_HISTORICO_KEY);
    return raw ? (JSON.parse(raw) as BackupInfo[]) : [];
  } catch {
    return [];
  }
}

export async function salvarHistoricoBackup(info: BackupInfo): Promise<void> {
  const historico = getHistoricoBackups();
  historico.push(info);
  localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(historico));
}

/* ============= Pasta de backup (Tauri) ============= */

/** Cria (se necessário) a pasta "Backup Sistema Zoom" em Documentos e retorna o caminho. */
export async function criarPastaBackup(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { mkdir, exists } = await import('@tauri-apps/plugin-fs');
    const { documentDir, join } = await import('@tauri-apps/api/path');
    const docDir = await documentDir();
    const pastaPath = await join(docDir, PASTA_BACKUP_NOME);
    const jaExiste = await exists(pastaPath);
    if (!jaExiste) {
      await mkdir(pastaPath, { recursive: true });
    }
    return pastaPath;
  } catch (e) {
    console.error('[backup] falha ao criar pasta de backup', e);
    return null;
  }
}

/* ============= Coleta de dados ============= */

async function coletarDadosBackup(): Promise<{ titulos: Titulo[]; contasPagar: ContaPagar[]; config: AppConfig }> {
  const [titulos, contasPagar, config] = await Promise.all([
    getTitulos(),
    getContasPagar(),
    getConfig(),
  ]);
  return { titulos, contasPagar, config };
}

/* ============= Realizar backup ============= */

/** Coleta todos os dados (títulos, vendas/config, clientes, contas a pagar) e salva um arquivo JSON. */
export async function realizarBackup(tipo: TipoBackup = 'manual'): Promise<BackupInfo> {
  const dados = await coletarDadosBackup();
  const agora = new Date();
  const nomeArquivo = `backup_${tipo}_${formatTimestamp(agora)}.json`;

  const payload: BackupPayload = {
    versao: 1,
    tipo,
    exportadoEm: agora.toISOString(),
    titulos: dados.titulos,
    contasPagar: dados.contasPagar,
    config: dados.config,
  };
  const conteudo = JSON.stringify(payload, null, 2);

  let caminho: string | undefined;
  if (isTauri()) {
    const pastaPath = await criarPastaBackup();
    if (pastaPath) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      caminho = await join(pastaPath, nomeArquivo);
      await writeTextFile(caminho, conteudo);
    } else {
      // Falha ao criar/acessar pasta: cai para fallback local
      localStorage.setItem(`${LS_BACKUP_PREFIX}${nomeArquivo}`, conteudo);
    }
  } else {
    localStorage.setItem(`${LS_BACKUP_PREFIX}${nomeArquivo}`, conteudo);
  }

  const info: BackupInfo = {
    nome: nomeArquivo,
    caminho,
    data: agora.toISOString(),
    tipo,
    tamanho: conteudo.length,
  };

  await salvarHistoricoBackup(info);

  if (tipo === 'automatico') {
    await limparBackupsAntigos();
  }

  return info;
}

/* ============= Limpeza de backups antigos ============= */

/** Mantém apenas os últimos N backups automáticos, removendo os mais antigos (arquivo + histórico). */
export async function limparBackupsAntigos(manterUltimos: number = MAX_BACKUPS_AUTOMATICOS): Promise<void> {
  const historico = getHistoricoBackups();
  const automaticos = historico
    .filter(b => b.tipo === 'automatico')
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const paraRemover = automaticos.slice(manterUltimos);
  if (paraRemover.length === 0) return;

  for (const backup of paraRemover) {
    try {
      if (isTauri() && backup.caminho) {
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(backup.caminho);
      } else {
        localStorage.removeItem(`${LS_BACKUP_PREFIX}${backup.nome}`);
      }
    } catch (e) {
      console.warn('[backup] falha ao remover backup antigo:', backup.nome, e);
    }
  }

  const nomesRemovidos = new Set(paraRemover.map(b => b.nome));
  const restantes = historico.filter(b => !nomesRemovidos.has(b.nome));
  localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(restantes));
}

/* ============= Restaurar backup ============= */

/** Lê o arquivo de backup (disco ou localStorage) e restaura títulos, config e contas a pagar. */
export async function restaurarBackup(backupInfo: BackupInfo): Promise<void> {
  let conteudo: string;

  if (isTauri() && backupInfo.caminho) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    conteudo = await readTextFile(backupInfo.caminho);
  } else {
    const raw = localStorage.getItem(`${LS_BACKUP_PREFIX}${backupInfo.nome}`);
    if (!raw) throw new Error(`Backup "${backupInfo.nome}" não encontrado`);
    conteudo = raw;
  }

  const dados = JSON.parse(conteudo) as Partial<BackupPayload>;
  const titulos: Titulo[] = Array.isArray(dados.titulos) ? dados.titulos : [];
  const contasPagar: ContaPagar[] = Array.isArray(dados.contasPagar) ? dados.contasPagar : [];
  const config = (dados.config && typeof dados.config === 'object') ? dados.config as AppConfig : await getConfig();

  // Restaura títulos + config (usuarios/logs) em transação atômica
  await importBackup(titulos, config);
  // Restaura contas a pagar separadamente
  await saveContasPagar(contasPagar);
}

/* ============= Listagem de backups ============= */

/** Lista os backups disponíveis (pasta real no Tauri, ou histórico local no fallback web). */
export async function getListaBackups(): Promise<BackupInfo[]> {
  if (isTauri()) {
    try {
      const pastaPath = await criarPastaBackup();
      if (!pastaPath) return getHistoricoBackups();

      const { readDir, stat } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      const entries = await readDir(pastaPath);
      const arquivos = entries.filter(e => e.isFile && e.name?.endsWith('.json'));

      const lista: BackupInfo[] = [];
      for (const entry of arquivos) {
        const nome = entry.name as string;
        const caminho = await join(pastaPath, nome);
        const parsed = parseNomeBackup(nome);
        let tamanho: number | undefined;
        try {
          const info = await stat(caminho);
          tamanho = info.size;
        } catch {
          // ignora falha ao obter tamanho
        }
        lista.push({
          nome,
          caminho,
          data: parsed?.data ?? new Date().toISOString(),
          tipo: parsed?.tipo ?? 'manual',
          tamanho,
        });
      }
      return lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    } catch (e) {
      console.warn('[backup] falha ao listar backups via Tauri, usando histórico local', e);
      return getHistoricoBackups().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }
  }

  return getHistoricoBackups().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/* ============= Agendamento automático ============= */

let intervaloBackupAutomatico: ReturnType<typeof setInterval> | null = null;

/** Agenda a execução de um backup automático a cada 24h. Idempotente (não duplica o agendamento). */
export function agendarBackupAutomatico(): void {
  if (intervaloBackupAutomatico) return;

  intervaloBackupAutomatico = setInterval(() => {
    realizarBackup('automatico').catch(e => {
      console.error('[backup] falha ao executar backup automático agendado', e);
    });
  }, INTERVALO_BACKUP_MS);
}
