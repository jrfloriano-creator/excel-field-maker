import { AppConfig, LogEntry, LogTipo, NivelUsuario, Permissao, Usuario, ALL_PERMISSOES } from '@/types/titulo';
import { hashPin, generateId } from './storage';

const SESSION_KEY = 'app_session_user_v2';
let sessionKey: CryptoKey | null = null;

async function getCryptoKey() {
  if (sessionKey) return sessionKey;
  const enc = new TextEncoder();
  const rawKey = enc.encode("ZoomFinanceiro_SecretKey_123!");
  sessionKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return sessionKey;
}

const bufferToBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuffer = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export async function verifySessionIntegrity(payload: string, signatureB64: string): Promise<boolean> {
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const signature = base64ToBuffer(signatureB64);
    return await crypto.subtle.verify("HMAC", key, signature, enc.encode(payload));
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
    const { payload, signature } = JSON.parse(raw);
    const isValid = await verifySessionIntegrity(payload, signature);
    if (!isValid) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return JSON.parse(payload);
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
  const payload = JSON.stringify(u);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const signature = bufferToBase64(signatureBuffer);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ payload, signature }));
}

export async function ensureMasterUser(usuarios: Usuario[] | undefined): Promise<Usuario[]> {
  const list = usuarios ? [...usuarios] : [];
  if (!list.some(u => u.master)) {
    const pinHash = await hashPin('1111');
    list.unshift({
      id: generateId(),
      nome: 'MASTER',
      pin: pinHash,
      nivel: 'MASTER',
      master: true,
    });
  }
  return list;
}

export function defaultPermissoes() {
  return {
    USUARIO: [
      'titulo.editar.recebimento',
      'caderno.criar',
      'relatorios.emitir',
    ] as Permissao[],
    GERENCIAL: [
      ...ALL_PERMISSOES.filter(p => !p.startsWith('config.')),
      'config.pix','config.formasPagamento','config.maquininhas','config.telefonesAlerta',
      'config.emailCobranca','config.emailEnviar','config.darkMode','config.avatar',
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

export function appendLog(
  config: AppConfig,
  onUpdate: (patch: Partial<AppConfig>) => void,
  user: SessionUser | null,
  tipo: LogTipo,
  descricao: string,
  metadata?: Record<string, any>,
) {
  const entry: LogEntry = {
    id: generateId(),
    data: new Date().toISOString(),
    usuario: user?.nome || 'desconhecido',
    tipo,
    descricao,
    metadata,
  };
  const logs = [...(config.logs || []), entry].slice(-5000);
  onUpdate({ logs });
}
