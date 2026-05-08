import { AppConfig, LogEntry, LogTipo, NivelUsuario, Permissao, Usuario, ALL_PERMISSOES } from '@/types/titulo';
import { hashPin, generateId } from './storage';

const SESSION_KEY = 'app_session_user_v1';

export interface SessionUser {
  id: string;
  nome: string;
  nivel: NivelUsuario;
}

export function getSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(u: SessionUser | null) {
  if (!u) sessionStorage.removeItem(SESSION_KEY);
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
}

export function ensureMasterUser(usuarios: Usuario[] | undefined): Usuario[] {
  const list = usuarios ? [...usuarios] : [];
  if (!list.some(u => u.master)) {
    list.unshift({
      id: generateId(),
      nome: 'MASTER',
      pin: hashPin('1111'),
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
