import { Titulo, AppConfig, Cliente, ProprietarioConfig } from '@/types/titulo';

const TITULOS_KEY = 'financeiro_titulos';
const CONFIG_KEY = 'financeiro_config';

// IDs padrão para proprietários legacy
const LEGACY_TANIA_ID = 'legacy-tania';
const LEGACY_RAMON_ID = 'legacy-ramon';

const DEFAULT_PROPRIETARIOS: ProprietarioConfig[] = [
  { id: LEGACY_TANIA_ID, nome: 'Tania', cor: '#FFD9B3' },
  { id: LEGACY_RAMON_ID, nome: 'Ramon', cor: '#BFE0FA' },
];

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
  funcionarios: [],
  proprietarios: DEFAULT_PROPRIETARIOS,
  clientes: [],
};

export function getTitulos(): Titulo[] {
  const data = localStorage.getItem(TITULOS_KEY);
  if (!data) return [];
  const parsed: any[] = JSON.parse(data);
  return parsed.map(t => {
    // Migração: TANIA/RAMON -> ids legacy
    let proprietario = t.proprietario;
    if (proprietario === 'TANIA') proprietario = LEGACY_TANIA_ID;
    else if (proprietario === 'RAMON') proprietario = LEGACY_RAMON_ID;
    else if (!proprietario) proprietario = LEGACY_TANIA_ID;
    return {
      ...t,
      proprietario,
      dataEmissao: t.dataEmissao || t.vencimento,
    } as Titulo;
  });
}

export function saveTitulos(titulos: Titulo[]): void {
  localStorage.setItem(TITULOS_KEY, JSON.stringify(titulos));
}

export function getConfig(): AppConfig {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) return { ...DEFAULT_CONFIG };
  const parsed = JSON.parse(data);
  const merged: AppConfig = { ...DEFAULT_CONFIG, ...parsed };
  // Garante proprietários default se ausentes
  if (!merged.proprietarios || merged.proprietarios.length === 0) {
    merged.proprietarios = DEFAULT_PROPRIETARIOS;
  }
  if (!merged.clientes) merged.clientes = [];
  return merged;
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

// Helpers de cliente
export function findCliente(clientes: Cliente[], id?: string): Cliente | undefined {
  if (!id) return undefined;
  return clientes.find(c => c.id === id);
}
