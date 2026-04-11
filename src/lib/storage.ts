import { Titulo, AppConfig, ChavePix, TelefoneAlerta } from '@/types/titulo';

const TITULOS_KEY = 'financeiro_titulos';
const CONFIG_KEY = 'financeiro_config';

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
};

export function getTitulos(): Titulo[] {
  const data = localStorage.getItem(TITULOS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTitulos(titulos: Titulo[]): void {
  localStorage.setItem(TITULOS_KEY, JSON.stringify(titulos));
}

export function getConfig(): AppConfig {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) return { ...DEFAULT_CONFIG };
  const parsed = JSON.parse(data);
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getNextNumero(titulos: Titulo[]): number {
  if (titulos.length === 0) return 1;
  return Math.max(...titulos.map(t => t.numero)) + 1;
}

// Simple PIN hash (not cryptographic, just obfuscation for localStorage)
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
