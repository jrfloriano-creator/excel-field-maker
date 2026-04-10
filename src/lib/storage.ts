import { Titulo } from '@/types/titulo';

const TITULOS_KEY = 'financeiro_titulos';
const TAXA_KEY = 'financeiro_taxa';

export function getTitulos(): Titulo[] {
  const data = localStorage.getItem(TITULOS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTitulos(titulos: Titulo[]): void {
  localStorage.setItem(TITULOS_KEY, JSON.stringify(titulos));
}

export function getTaxa(): number {
  const data = localStorage.getItem(TAXA_KEY);
  return data ? parseFloat(data) : 0.01;
}

export function saveTaxa(taxa: number): void {
  localStorage.setItem(TAXA_KEY, taxa.toString());
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getNextNumero(titulos: Titulo[]): number {
  if (titulos.length === 0) return 1;
  return Math.max(...titulos.map(t => t.numero)) + 1;
}
