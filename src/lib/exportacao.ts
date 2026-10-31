// src/lib/exportacao.ts
import { ContaPagar } from '@/types/titulo';
import { hojeLocal, formatarData } from './calculos';
import { isTauri } from './database';

// ============================================================
// CORREÇÃO CRÍTICA: Proteção contra injeção de fórmula no CSV.
// Valores começando com = + - @ ou \t \r podem ser interpretados
// como fórmula no Excel. Prefixamos com apóstrofo.
// ============================================================
function protegerCelulaCSV(valor: string | number | undefined): string {
  if (valor === undefined || valor === null) return '';
  const str = String(valor);
  // CORREÇÃO: se começar com caractere perigoso, prefixa com apóstrofo
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function escaparCSV(valor: string | number | undefined): string {
  const str = protegerCelulaCSV(valor);
  return `"${str.replace(/"/g, '""')}"`;
}

// ============================================================
// CORREÇÃO CRÍTICA: Download seguro (Tauri vs Web).
// No Tauri, usa o plugin de diálogo + fs para salvar o arquivo
// com o caminho escolhido pelo usuário. No Web, usa <a> com
// revokeObjectURL atrasado (evita falha em downloads lentos).
// ============================================================
async function baixarArquivo(conteudo: string, nomeArquivo: string, mime: string): Promise<void> {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const caminho = await save({
        defaultPath: nomeArquivo,
        filters: [{ name: 'Arquivo', extensions: [nomeArquivo.split('.').pop() || 'csv'] }],
      });
      if (caminho) {
        await writeTextFile(caminho, conteudo);
      }
      return;
    } catch (e) {
      console.warn('[exportacao] falha no download Tauri, caindo para fallback web', e);
    }
  }

  // Fallback Web
  const blob = new Blob(['\uFEFF' + conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // CORREÇÃO: adia revokeObjectURL para evitar falha em downloads lentos
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// =========== EXCEL (CSV compatível com Excel) ===========
export async function exportarParaExcel(
  contas: ContaPagar[],
  nomeArquivo = 'contas-a-pagar'
): Promise<void> {
  const cabecalhos = ['Nº', 'Descrição', 'Favorecido', 'Valor', 'Vencimento', 'Status', 'Tipo', 'Competência'];
  const linhas = contas.map((c) => [
    escaparCSV(c.numero),
    escaparCSV(c.descricao || ''),
    escaparCSV(c.favorecido || ''),
    c.valor.toFixed(2).replace('.', ','),
    formatarData(c.vencimento),
    escaparCSV(c.status),
    escaparCSV(c.tipoTitulo || c.categoria || ''),
    escaparCSV(c.competencia || ''),
  ]);
  const csv = [cabecalhos.join(';'), ...linhas.map((l) => l.join(';'))].join('\n');

  // CORREÇÃO: usa data local (não UTC) no nome do arquivo
  const nomeArquivoFinal = `${nomeArquivo}-${hojeLocal()}.csv`;
  await baixarArquivo(csv, nomeArquivoFinal, 'text/csv;charset=utf-8');
}

// =========== PDF — Aciona impressão do navegador ===========
export function exportarParaPDF(): void {
  window.print();
}