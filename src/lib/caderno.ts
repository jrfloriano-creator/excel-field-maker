import jsPDF from 'jspdf';
import { formatBRL } from '@/lib/promissoria';

export interface CadernoInstallment {
  numeroParcela: number; // 1-based
  dataVencimento: string; // YYYY-MM-DD
  valorParcela: number;
}

export interface CadernoDesconto {
  apelido: string;
  valorOriginal: number;
}

export interface CadernoData {
  clienteNome: string;
  dataEmissao: string; // YYYY-MM-DD
  parcelas: CadernoInstallment[];
  valorTotal: number;
  desconto?: CadernoDesconto;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function nowStr(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Generates a Caderno PDF in A4 format.
 * EVERYTHING fits on ONE page — no page breaks.
 *
 * Layout spec:
 *  1. Client full name (bold, uppercase) + emission date/time on the right
 *  2. 3 blank lines
 *  3. Table header (bold): No. | Data Vcto. | Valor Parcela | Valor Pago | Saldo | Data Pagamento | Recebido por
 *  4. Table rows (one per parcela): blanks for Valor Pago, Saldo, Data Pagamento, Recebido por
 *  5. Separator line (full width)
 *  6. 1 blank line
 *  7. 'Valor Total: R$ X,XX' (bold)
 *  8. 2 blank lines
 *  9. 'OBS.:' label
 * 10. 7 OBS lines (full-width underscores), each with 1 blank line between them
 * 11. 2 blank lines
 * 12. Centered short separator line (~60mm)
 * 13. 'Assinatura do Cliente' centered below
 *
 * Font 7pt for table rows ensures up to 12 parcelas fit on a single A4 page.
 */
export function gerarCadernoPDF(data: CadernoData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 12;
  const total = data.parcelas.length;

  // Spacing constants — tuned for single-page fit with up to 12 parcelas
  const lineH = 4.5;      // mm per table row (7pt rows)
  const blankH = 4.0;     // mm per blank line
  const obsLineH = 4.5;   // mm for an OBS underscore line
  const obsGapH = 3.5;    // mm blank gap between OBS lines

  let y = margin;

  // ---- 1. Line 1: client name (bold, uppercase) + emission date/time ----
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(data.clienteNome.toUpperCase(), margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Emissão: ${nowStr()}`, pageW - margin, y, { align: 'right' });

  // ---- 2. 3 blank lines ----
  y += blankH * 3;

  // ---- 3. Table column positions (7 cols, printable width ~186mm) ----
  // No.(10) | DataVcto(25) | ValorParcela(28) | ValorPago(30) | Saldo(25) | DataPagamento(35) | RecebidoPor(rest)
  const cols = {
    num:       margin,
    dataVcto:  margin + 10,
    valor:     margin + 35,
    valorPago: margin + 63,
    saldo:     margin + 93,
    dataPag:   margin + 118,
    recebedor: margin + 153,
  };

  // Table header (bold, 8pt)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('No.',              cols.num,       y);
  pdf.text('Data Vcto.',       cols.dataVcto,  y);
  pdf.text('Valor Parcela',    cols.valor,     y);
  pdf.text('Valor Pago',       cols.valorPago, y);
  pdf.text('Saldo',            cols.saldo,     y);
  pdf.text('Data Pagamento',   cols.dataPag,   y);
  pdf.text('Recebido por',     cols.recebedor, y);

  // Header underline
  y += lineH * 0.5;
  pdf.setDrawColor(100);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += lineH * 0.7;

  // ---- 4. Table rows (7pt font, tight spacing) ----
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  for (const p of data.parcelas) {
    pdf.text(`${p.numeroParcela}/${total}`,       cols.num,       y);
    pdf.text(formatDateBR(p.dataVencimento),       cols.dataVcto,  y);
    pdf.text(formatBRL(p.valorParcela),            cols.valor,     y);
    pdf.text('_________________',                  cols.valorPago, y);
    pdf.text('__________________',                 cols.saldo,     y);
    pdf.text('(_____)/(_____)/(______)',            cols.dataPag,   y);
    pdf.text('_________________',                  cols.recebedor, y);
    y += lineH;
  }

  // ---- 5. Separator line (full width) ----
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);

  // ---- 6. 1 blank line ----
  y += blankH;

  // Discount info (if applicable)
  if (data.desconto) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Desconto: ${data.desconto.apelido}`, margin, y);
    y += blankH;
    pdf.text(`Valor Original: ${formatBRL(data.desconto.valorOriginal)}`, margin, y);
    y += blankH;
  }

  // ---- 7. 'Valor Total: R$ X,XX' (bold) ----
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`Valor Total: ${formatBRL(data.valorTotal)}`, margin, y);

  // ---- 8. 2 blank lines ----
  y += blankH * 2 + 2; // extra 2mm for visual breathing room

  // ---- 9. 'OBS.:' label ----
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('OBS.:', margin, y);
  y += obsLineH;

  // ---- 10. 7 OBS lines (full-width underscores), 1 blank line between each ----
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const obsLineWidth = pageW - margin * 2;
  const underscoreCount = Math.floor(obsLineWidth / 1.8);
  const obsLine = '_'.repeat(underscoreCount);

  for (let i = 0; i < 7; i++) {
    pdf.text(obsLine, margin, y);
    y += obsLineH;
    if (i < 6) {
      // 1 blank line between lines (not after the last one)
      y += obsGapH;
    }
  }

  // ---- 11. 2 blank lines ----
  y += blankH * 2;

  // ---- 12. Centered short separator line (~60mm) ----
  const sigLineStart = pageW / 2 - 30;
  const sigLineEnd   = pageW / 2 + 30;
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.4);
  pdf.line(sigLineStart, y, sigLineEnd, y);
  y += blankH;

  // ---- 13. 'Assinatura do Cliente' centered ----
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Assinatura do Cliente', pageW / 2, y, { align: 'center' });

  return pdf;
}
