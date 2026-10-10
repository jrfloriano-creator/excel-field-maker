import { ContaPagar } from '@/types/titulo';

// =========== EXCEL (CSV compatível com Excel) ===========
export function exportarParaExcel(contas: ContaPagar[], nomeArquivo = 'contas-a-pagar') {
  const cabecalhos = ['Nº', 'Descrição', 'Favorecido', 'Valor', 'Vencimento', 'Status', 'Tipo', 'Competência'];
  
  const linhas = contas.map(c => [
    c.numero,
    `"${(c.descricao || '').replace(/"/g, '""')}"`,
    `"${(c.favorecido || '').replace(/"/g, '""')}"`,
    c.valor.toFixed(2).replace('.', ','),
    c.vencimento.split('-').reverse().join('/'),
    c.status,
    c.tipoTitulo || c.categoria || '',
    c.competencia || '',
  ]);

  const csv = [cabecalhos.join(';'), ...linhas.map(l => l.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =========== PDF — Aciona impressão do navegador ===========
export function exportarParaPDF() {
  window.print();
}