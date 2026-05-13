import { Titulo, AppConfig, Cliente, ProprietarioConfig, Funcionario, ChavePix, TelefoneAlerta } from '@/types/titulo';

/* ============= CSV helpers ============= */

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(headers: string[], rows: any[][]): string {
  const lines = [headers.map(escapeCSV).join(',')];
  for (const row of rows) lines.push(row.map(escapeCSV).join(','));
  return lines.join('\n');
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  // remove BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue; }
    field += c; i++;
  }
  // último campo
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
}

/* ============= EXPORT ============= */

export const TITULOS_HEADERS = [
  'id','numero','tipo','cliente','clienteId','telefone','dataEmissao','vencimento',
  'valor','proprietario','dataPagamento','valorPago','recebidoPor'
];

export function titulosToCSV(titulos: Titulo[]): string {
  const rows = titulos.map(t => [
    t.id, t.numero, t.tipo, t.cliente, t.clienteId || '', t.telefone,
    t.dataEmissao, t.vencimento, t.valor, t.proprietario,
    t.dataPagamento || '', t.valorPago ?? '', t.recebidoPor || '',
  ]);
  return toCSV(TITULOS_HEADERS, rows);
}

export const CLIENTES_HEADERS = [
  'id','nome','telefone','cpfCnpj','cep','logradouro','numero','bairro','cidade','estado'
];
export function clientesToCSV(clientes: Cliente[]): string {
  const rows = clientes.map(c => [
    c.id, c.nome, c.telefone, c.cpfCnpj || '', c.cep, c.logradouro, c.numero, c.bairro, c.cidade, c.estado
  ]);
  return toCSV(CLIENTES_HEADERS, rows);
}

export const PROPRIETARIOS_HEADERS = ['id','nome','cor','corFundo'];
export function proprietariosToCSV(props: ProprietarioConfig[]): string {
  const rows = props.map(p => [p.id, p.nome, p.cor, p.corFundo || '']);
  return toCSV(PROPRIETARIOS_HEADERS, rows);
}

export const FUNCIONARIOS_HEADERS = ['id','nome','pin'];
export function funcionariosToCSV(fs: Funcionario[]): string {
  return toCSV(FUNCIONARIOS_HEADERS, fs.map(f => [f.id, f.nome, f.pin]));
}

export const PIX_HEADERS = ['id','nome','chave'];
export function pixToCSV(p: ChavePix[]): string {
  return toCSV(PIX_HEADERS, p.map(x => [x.id, x.nome, x.chave]));
}

export const CONFIG_GERAL_HEADERS = ['chave','valor'];
export function configGeralToCSV(config: AppConfig): string {
  const rows: any[][] = [
    ['taxa', config.taxa],
    ['darkMode', config.darkMode ? '1' : '0'],
    ['horarioAlerta', config.horarioAlerta],
    ['credor.nome', config.credor?.nome || ''],
    ['credor.cpfCnpj', config.credor?.cpfCnpj || ''],
    ['credor.cidadeEstado', config.credor?.cidadeEstado || ''],
    ['telefonesAlerta', JSON.stringify(config.telefonesAlerta)],
  ];
  return toCSV(CONFIG_GERAL_HEADERS, rows);
}

/* ============= IMPORT ============= */

export function csvToTitulos(text: string): Titulo[] {
  const objs = rowsToObjects(parseCSV(text));
  return objs.map(o => ({
    id: o.id || crypto.randomUUID(),
    numero: parseInt(o.numero) || 0,
    tipo: o.tipo,
    cliente: o.cliente,
    clienteId: o.clienteId || undefined,
    telefone: o.telefone,
    dataEmissao: o.dataEmissao,
    vencimento: o.vencimento,
    valor: parseFloat(o.valor) || 0,
    proprietario: o.proprietario,
    dataPagamento: o.dataPagamento || undefined,
    valorPago: o.valorPago ? parseFloat(o.valorPago) : undefined,
    recebidoPor: o.recebidoPor || undefined,
  }));
}

export function csvToClientes(text: string): Cliente[] {
  const objs = rowsToObjects(parseCSV(text));
  return objs.map(o => ({
    id: o.id || crypto.randomUUID(),
    nome: o.nome,
    telefone: o.telefone,
    cpfCnpj: o.cpfCnpj || undefined,
    cep: o.cep || '',
    logradouro: o.logradouro || '',
    numero: o.numero || '',
    bairro: o.bairro || '',
    cidade: o.cidade || '',
    estado: o.estado || '',
  }));
}

export function csvToProprietarios(text: string): ProprietarioConfig[] {
  const objs = rowsToObjects(parseCSV(text));
  return objs.map(o => ({
    id: o.id || crypto.randomUUID(),
    nome: o.nome,
    cor: o.cor || '#cccccc',
    corFundo: o.corFundo || undefined,
  }));
}

export function csvToFuncionarios(text: string): Funcionario[] {
  const objs = rowsToObjects(parseCSV(text));
  return objs.map(o => ({ id: o.id || crypto.randomUUID(), nome: o.nome, pin: o.pin }));
}

export function csvToPix(text: string): ChavePix[] {
  const objs = rowsToObjects(parseCSV(text));
  return objs.map(o => ({ id: o.id || crypto.randomUUID(), nome: o.nome, chave: o.chave }));
}

export function csvToConfigPatch(text: string): Partial<AppConfig> {
  const objs = rowsToObjects(parseCSV(text));
  const map: Record<string, string> = {};
  objs.forEach(o => { map[o.chave] = o.valor; });
  const patch: Partial<AppConfig> = {};
  if (map['taxa'] !== undefined) patch.taxa = parseFloat(map['taxa']) || 0;
  if (map['darkMode'] !== undefined) patch.darkMode = map['darkMode'] === '1' || map['darkMode'] === 'true';
  if (map['horarioAlerta']) patch.horarioAlerta = map['horarioAlerta'];
  const credor = {
    nome: map['credor.nome'] || '',
    cpfCnpj: map['credor.cpfCnpj'] || '',
    cidadeEstado: map['credor.cidadeEstado'] || '',
  };
  patch.credor = credor;
  if (map['telefonesAlerta']) {
    try { patch.telefonesAlerta = JSON.parse(map['telefonesAlerta']) as TelefoneAlerta[]; } catch { /* ignore */ }
  }
  return patch;
}

/* ============= Download / ZIP-less archive ============= */

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
