// src/lib/backup.ts
import { Titulo, AppConfig, ContaPagar } from '@/types/titulo';
import { getTitulos, getContasPagar, getConfig, saveContasPagar, importBackup } from './storage';
import { isTauri } from './database'; // CORREÇÃO: usa isTauri centralizado

// CORREÇÃO: tenta importar catálogo (credores, tipos, grupos) se disponível
// Esses dados são essenciais para restauração sem credores órfãos
let contasPagarDbDriver: any = null;
async function getCatalogoDb() {
  if (!contasPagarDbDriver) {
    try {
      const mod = await import('./contasPagarDb');
      contasPagarDbDriver = mod.contasPagarDbDriver;
    } catch {
      // módulo não existe ainda; será incluído em fase posterior
      contasPagarDbDriver = null;
    }
  }
  return contasPagarDbDriver;
}

const PASTA_BACKUP_NOME = 'Backup Sistema Zoom';
const LS_BACKUP_PREFIX = 'zoom_backup_arquivo_';
const LS_HISTORICO_KEY = 'zoom_backup_historico';
const MAX_BACKUPS_AUTOMATICOS = 10;
const INTERVALO_BACKUP_MS = 24 * 60 * 60 * 1000; // 24 horas

export type TipoBackup = 'manual' | 'automatico';

export interface BackupInfo {
  nome: string;
  caminho?: string;
  data: string;
  tipo: TipoBackup;
  tamanho?: number;
}

// ============================================================
// CORREÇÃO CRÍTICA: versao 2 inclui catálogo para evitar
// credores órfãos na restauração.
// ============================================================
interface BackupPayload {
  versao: number;
  tipo: TipoBackup;
  exportadoEm: string;
  titulos: Titulo[];
  contasPagar: ContaPagar[];
  config: AppConfig;
  // CORREÇÃO: campos do catálogo (versao 2+)
  credores?: any[];
  tituloConfigs?: any[];
  gruposDespesa?: any[];
  despesasFixas?: any[];
}

// CORREÇÃO: versão atual do formato de backup
const VERSAO_BACKUP = 2;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimestamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function parseNomeBackup(nome: string): { tipo: TipoBackup; data: string } | null {
  const match = nome.match(/^backup_(manual|automatico)_(.+).json$/);
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
  // CORREÇÃO: tratamento de cota do localStorage
  try {
    localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(historico));
  } catch (e) {
    console.warn('[backup] localStorage cheio ao salvar histórico', e);
    // remove entradas antigas e tenta de novo
    const reduzido = historico.slice(-MAX_BACKUPS_AUTOMATICOS);
    try {
      localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(reduzido));
    } catch {
      // ignora
    }
  }
}

/* ============= Pasta de backup (Tauri) ============= */
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
async function coletarDadosBackup(): Promise<BackupPayload> {
  const [titulos, contasPagar, config] = await Promise.all([
    getTitulos(),
    getContasPagar(),
    getConfig(),
  ]);

  const payload: BackupPayload = {
    versao: VERSAO_BACKUP,
    tipo: 'manual',
    exportadoEm: new Date().toISOString(),
    titulos,
    contasPagar,
    config,
  };

  // CORREÇÃO: inclui catálogo no backup (versao 2)
  const catDb = await getCatalogoDb();
  if (catDb) {
    try {
      const [credores, tituloConfigs, gruposDespesa, despesasFixas] = await Promise.all([
        catDb.getCredores?.() ?? Promise.resolve([]),
        catDb.getTituloConfigs?.() ?? Promise.resolve([]),
        catDb.getGruposDespesa?.() ?? Promise.resolve([]),
        catDb.getDespesasFixas?.() ?? Promise.resolve([]),
      ]);
      payload.credores = credores;
      payload.tituloConfigs = tituloConfigs;
      payload.gruposDespesa = gruposDespesa;
      payload.despesasFixas = despesasFixas;
    } catch (e) {
      console.warn('[backup] falha ao coletar catálogo', e);
    }
  }

  return payload;
}

/* ============= Realizar backup ============= */
export async function realizarBackup(tipo: TipoBackup = 'manual'): Promise<BackupInfo> {
  const dados = await coletarDadosBackup();
  dados.tipo = tipo;
  dados.exportadoEm = new Date().toISOString();

  const agora = new Date();
  const nomeArquivo = `backup_${tipo}_${formatTimestamp(agora)}.json`;

  // CORREÇÃO: JSON compacto para web (evita estourar localStorage)
  const conteudo = isTauri() ? JSON.stringify(dados, null, 2) : JSON.stringify(dados);

  let caminho: string | undefined;
  if (isTauri()) {
    const pastaPath = await criarPastaBackup();
    if (pastaPath) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      caminho = await join(pastaPath, nomeArquivo);
      await writeTextFile(caminho, conteudo);
    } else {
      try {
        localStorage.setItem(`${LS_BACKUP_PREFIX}${nomeArquivo}`, conteudo);
      } catch (e) {
        console.error('[backup] falha ao salvar no localStorage', e);
        throw new Error('Falha ao salvar backup: armazenamento cheio');
      }
    }
  } else {
    try {
      localStorage.setItem(`${LS_BACKUP_PREFIX}${nomeArquivo}`, conteudo);
    } catch (e) {
      console.error('[backup] falha ao salvar no localStorage', e);
      throw new Error('Falha ao salvar backup: armazenamento cheio');
    }
  }

  const info: BackupInfo = {
    nome: nomeArquivo,
    caminho,
    data: agora.toISOString(),
    tipo,
    tamanho: conteudo.length,
  };

  await salvarHistoricoBackup(info);

  // CORREÇÃO: atualiza config com data do último automático
  if (tipo === 'automatico') {
    try {
      const config = await getConfig();
      config.backup = config.backup || {};
      config.backup.ultimoAutomatico = agora.toISOString();
      const { saveConfig } = await import('./storage');
      await saveConfig(config);
    } catch (e) {
      console.warn('[backup] falha ao atualizar último automático na config', e);
    }
    await limparBackupsAntigos();
  }

  return info;
}

/* ============= Limpeza de backups antigos ============= */
export async function limparBackupsAntigos(manterUltimos: number = MAX_BACKUPS_AUTOMATICOS): Promise<void> {
  const historico = getHistoricoBackups();
  const automaticos = historico
    .filter((b) => b.tipo === 'automatico')
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

  const nomesRemovidos = new Set(paraRemover.map((b) => b.nome));
  const restantes = historico.filter((b) => !nomesRemovidos.has(b.nome));
  localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(restantes));
}

/* ============= CORREÇÃO CRÍTICA: Validação de backup ============= */
function validarPayload(dados: any): { valido: boolean; erro?: string } {
  if (!dados || typeof dados !== 'object') {
    return { valido: false, erro: 'Backup inválido: não é um objeto' };
  }
  if (typeof dados.versao !== 'number') {
    return { valido: false, erro: 'Backup inválido: campo "versao" ausente' };
  }
  if (!Array.isArray(dados.titulos)) {
    return { valido: false, erro: 'Backup inválido: "titulos" não é um array' };
  }
  if (!Array.isArray(dados.contasPagar)) {
    return { valido: false, erro: 'Backup inválido: "contasPagar" não é um array' };
  }
  if (!dados.config || typeof dados.config !== 'object') {
    return { valido: false, erro: 'Backup inválido: "config" ausente ou inválido' };
  }
  return { valido: true };
}

/* ============= Restaurar backup ============= */
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

  let dados: any;
  try {
    dados = JSON.parse(conteudo);
  } catch (e) {
    throw new Error('Backup corrompido: JSON inválido');
  }

  // CORREÇÃO CRÍTICA: valida antes de restaurar
  const validacao = validarPayload(dados);
  if (!validacao.valido) {
    throw new Error(validacao.erro || 'Backup inválido');
  }

  // CORREÇÃO CRÍTICA: gera backup de segurança ANTES de restaurar
  try {
    console.log('[backup] gerando backup pré-restauração...');
    await realizarBackup('manual');
  } catch (e) {
    console.warn('[backup] falha ao gerar backup pré-restauração', e);
    // não bloqueia a restauração, mas avisa
  }

  const titulos: Titulo[] = Array.isArray(dados.titulos) ? dados.titulos : [];
  const contasPagar: ContaPagar[] = Array.isArray(dados.contasPagar) ? dados.contasPagar : [];
  const config = dados.config as AppConfig;

  // CORREÇÃO: importBackup agora é atômico (dentro de transação)
  await importBackup(titulos, config);
  await saveContasPagar(contasPagar);

  // CORREÇÃO: restaura catálogo se disponível (versao 2+)
  if (dados.versao >= 2) {
    const catDb = await getCatalogoDb();
    if (catDb) {
      try {
        if (Array.isArray(dados.credores) && catDb.importCredores) {
          await catDb.importCredores(dados.credores);
        }
        if (Array.isArray(dados.tituloConfigs) && catDb.importTituloConfigs) {
          await catDb.importTituloConfigs(dados.tituloConfigs);
        }
        if (Array.isArray(dados.gruposDespesa) && catDb.importGruposDespesa) {
          await catDb.importGruposDespesa(dados.gruposDespesa);
        }
        if (Array.isArray(dados.despesasFixas) && catDb.importDespesasFixas) {
          await catDb.importDespesasFixas(dados.despesasFixas);
        }
      } catch (e) {
        console.warn('[backup] falha ao restaurar catálogo', e);
      }
    }
  }
}

/* ============= Listagem de backups ============= */
export async function getListaBackups(): Promise<BackupInfo[]> {
  if (isTauri()) {
    try {
      const pastaPath = await criarPastaBackup();
      if (!pastaPath) return getHistoricoBackups();
      const { readDir, stat } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      const entries = await readDir(pastaPath);
      const arquivos = entries.filter((e) => e.isFile && e.name?.endsWith('.json'));
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
          // ignora
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

/* ============= CORREÇÃO CRÍTICA: Agendamento inteligente ============= */
let intervaloBackupAutomatico: ReturnType<typeof setInterval> | null = null;
let agendamentoIniciado = false;

/**
 * CORREÇÃO CRÍTICA: Agora verifica no início se já passou de 24h
 * desde o último backup automático. Se sim, executa imediatamente.
 * Depois agenda os próximos a cada 24h.
 */
export async function agendarBackupAutomatico(): Promise<void> {
  if (agendamentoIniciado) return;
  agendamentoIniciado = true;

  // Verifica se precisa executar agora
  try {
    const config = await getConfig();
    const ultimo = config?.backup?.ultimoAutomatico;
    if (ultimo) {
      const diff = Date.now() - new Date(ultimo).getTime();
      if (diff >= INTERVALO_BACKUP_MS) {
        console.log('[backup] último automático foi há mais de 24h, executando agora...');
        try {
          await realizarBackup('automatico');
        } catch (e) {
          console.error('[backup] falha no backup automático inicial', e);
        }
      }
    } else {
      // nunca fez automático; executa agora
      console.log('[backup] nenhum backup automático encontrado, executando agora...');
      try {
        await realizarBackup('automatico');
      } catch (e) {
        console.error('[backup] falha no backup automático inicial', e);
      }
    }
  } catch (e) {
    console.warn('[backup] falha ao verificar último automático', e);
  }

  // Agenda os próximos
  if (intervaloBackupAutomatico) return;
  intervaloBackupAutomatico = setInterval(() => {
    realizarBackup('automatico').catch((e) => {
      console.error('[backup] falha ao executar backup automático agendado', e);
    });
  }, INTERVALO_BACKUP_MS);
}