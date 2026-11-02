// src/lib/auth.ts
import {
  AppConfig,
  LogEntry,
  LogTipo,
  NivelUsuario,
  Permissao,
  Usuario,
  ALL_PERMISSOES,
} from '@/types/titulo';
import { hashPin, generateId } from './storage';
import { dbDriver } from './database';

const SESSION_KEY = 'app_session_user_v2';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // ✅ SEGURANÇA: sessão expira após 8h
let sessionKey: CryptoKey | null = null;

async function getCryptoKey() {
  if (sessionKey) return sessionKey;
  const enc = new TextEncoder();
  const rawKeyStr =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SESSION_SECRET) ||
    'ZoomFinanceiro_SecretKey_123!';
  const rawKey = enc.encode(rawKeyStr);
  sessionKey = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
  return sessionKey;
}

const bufferToBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuffer = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function verifySessionIntegrity(payload: string, signatureB64: string): Promise<boolean> {
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const signature = base64ToBuffer(signatureB64);
    return await crypto.subtle.verify('HMAC', key, signature, enc.encode(payload));
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: string;
  nome: string;
  nivel: NivelUsuario;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = parsed?.payload;
    const signature = parsed?.signature;
    if (!payload || !signature) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      // ✅ SEGURANÇA: sessão expirada → invalida
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const user = JSON.parse(payload);
    if (user?.exp && user.exp < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const isValid = await verifySessionIntegrity(JSON.stringify(user), signature);
    if (!isValid) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function setSession(u: SessionUser | null): Promise<void> {
  if (!u) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  const key = await getCryptoKey();
  const enc = new TextEncoder();
  const payload = JSON.stringify({ ...u, exp: Date.now() + SESSION_TTL_MS });
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const signature = bufferToBase64(signatureBuffer);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ payload, signature }));
}

export async function ensureMasterUser(usuarios: Usuario[] | undefined): Promise<Usuario[]> {
  const list = usuarios ? [...usuarios] : [];
  const masterIdx = list.findIndex((u) => u.nivel === 'MASTER' || (u as any).master);
  if (masterIdx === -1) {
    const pinHash = await hashPin('1111');
    list.unshift({
      id: generateId(),
      nome: 'MASTER',
      pin: pinHash,
      nivel: 'MASTER',
      permissoes: [...ALL_PERMISSOES],
      ativo: true,
      dataCriacao: new Date().toISOString(),
      pinExpirado: true,
      tentativasFalhas: 0,
    } as Usuario);
  } else {
    const master = list[masterIdx];
    if (master.pinExpirado === undefined && !master.ultimoAcesso) {
      master.pinExpirado = true;
    }
  }
  return list;
}

export function defaultPermissoes() {
  return {
    USUARIO: [
      'titulo.editar.recebimento',
      'titulo.receber',
      'caderno.criar',
      'relatorios.emitir',
    ] as Permissao[],
    GERENCIAL: [
      ...ALL_PERMISSOES.filter((p) => !p.startsWith('config.')),
      'config.pix',
      'config.formasPagamento',
      'config.maquininhas',
      'config.telefonesAlerta',
      'config.emailCobranca',
      'config.emailEnviar',
      'config.darkMode',
      'config.avatar',
    ] as Permissao[],
    MASTER: [...ALL_PERMISSOES] as Permissao[],
  };
}

export function hasPerm(config: AppConfig, user: SessionUser | null, perm: Permissao): boolean {
  if (!user) return false;
  if (user.nivel === 'MASTER') return true;
  const matrix = config.permissoes || defaultPermissoes();
  return matrix[user.nivel]?.includes(perm) || false;
}

// ============================================================
// CORREÇÃO CRÍTICA: appendLog com detecção robusta de assinatura.
// Evita que objetos inteiros (como {id, nome, nivel}) sejam salvos
// nos campos 'tipo' ou 'descricao', o que quebrava o React.
// ============================================================
export async function appendLog(...args: any[]): Promise<void> {
  let tipo: LogTipo = 'info';
  let usuarioNome: string = 'desconhecido';
  let descricao: string = '';
  let meta: Record<string, any> | undefined;

  // Formato antigo: appendLog(config, onUpdate, user, tipo, descricao, metadata)
  if (args.length >= 4 && typeof args[1] === 'function') {
    const userObj = args[2];
    tipo = (args[3] as LogTipo) || 'info';
    descricao = String(args[4] || '');
    meta = args[5];
    usuarioNome = userObj?.nome || 'desconhecido';
  } 
  // Formato novo: appendLog(tipo, user, descricao, metadata)
  else if (args.length >= 2 && typeof args[0] === 'string') {
    tipo = (args[0] as LogTipo) || 'info';
    const userObj = args[1];
    descricao = String(args[2] || '');
    meta = args[3];
    usuarioNome = userObj?.nome || 'desconhecido';
  } 
  // Fallback
  else {
    descricao = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  }

  const entry: LogEntry = {
    id: generateId(),
    data: new Date().toISOString(),
    usuario: usuarioNome, // Salva APENAS a string do nome
    acao: tipo,
    detalhes: descricao,
    tipo,
  };

  try {
    await dbDriver.addLog(entry);
  } catch (e) {
    console.error('[auth] falha ao gravar log', e);
  }
}

export async function getLogsOrdenados(): Promise<LogEntry[]> {
  const logs = await dbDriver.getLogs();
  return logs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

export function isUsuarioBloqueado(usuario: Usuario): boolean {
  if (!usuario.bloqueadoAte) return false;
  return new Date(usuario.bloqueadoAte).getTime() > Date.now();
}

export function registrarTentativaFalha(usuario: Usuario): Usuario {
  const tentativas = (usuario.tentativasFalhas || 0) + 1;
  const atualizado: Usuario = { ...usuario, tentativasFalhas: tentativas };
  if (tentativas >= 5) {
    const bloqueio = new Date(Date.now() + 15 * 60 * 1000);
    atualizado.bloqueadoAte = bloqueio.toISOString();
  }
  return atualizado;
}

export function resetarTentativas(usuario: Usuario): Usuario {
  return {
    ...usuario,
    tentativasFalhas: 0,
    bloqueadoAte: undefined,
    ultimoAcesso: new Date().toISOString(),
  };
}