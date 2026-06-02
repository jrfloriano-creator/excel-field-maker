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
 * Layout (v2.1.1 spec):
 *  - Client full name (bold, uppercase) — emission date + time  (line 1)
 *  - 3 blank lines
 *  - Table with 7 columns (8pt font):
 *    No. | Data Vcto. | Valor Parcela | Valor Pago | Saldo | Data Pagamento | Recebido por
 *  - Separator line
 *  - 1 blank line
 *  - If discount: 'Desconto: {apelido}' and 'Valor Original: R$ X,XX'
 *  - 'Valor Total: R$ X,XX' (bold)
 *  - 5 blank lines
 *  - 'OBS.:' label
 *  - 10 observation lines (full-width underscores) with 2 blank lines between each
 *  - 5 blank lines
 *  - Separator line centered
 *  - 'Assinatura do Cliente' centered
 * Handles page breaks.
 */
export function gerarCadernoPDF(data: CadernoData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const lineH = 6; // mm per line (tighter for 7 columns)
  const total = data.parcelas.length;
  let y = margin;

  // ---- Line 1: client name (bold, uppercase) — date+time ----
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(data.clienteNome.toUpperCase(), margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Emissão: ${nowStr()}`, pageW - margin, y, { align: 'right' });

  // 3 blank lines
  y += lineH * 3;

  // ---- Table column positions (7 cols, A4 printable width ~186mm with margin=12) ----
  // No.(10) | DataVcto(25) | ValorParcela(28) | ValorPago(30) | Saldo(25) | DataPagamento(35) | RecebidoPor(rest)
  const cols = {
    num: margin,           // ~10mm wide
    dataVcto: margin + 10, // 25mm
    valor: margin + 35,    // 28mm
    valorPago: margin + 63,// 30mm
    saldo: margin + 93,    // 25mm
    dataPag: margin + 118, // 35mm
    recebedor: margin + 153,// to end
  };

  const drawTableHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('No.', cols.num, y);
    pdf.text('Data Vcto.', cols.dataVcto, y);
    pdf.text('Valor Parcela', cols.valor, y);
    pdf.text('Valor Pago', cols.valorPago, y);
    pdf.text('Saldo', cols.saldo, y);
    pdf.text('Data Pagamento', cols.dataPag, y);
    pdf.text('Recebido por', cols.recebedor, y);

    y += lineH * 0.5;
    // Header underline
    pdf.setDrawColor(100);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageW - margin, y);
    y += lineH * 0.7;
  };

  drawTableHeader();

  // Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  for (const p of data.parcelas) {
    // Check if we need a new page (leave room for footer)
    if (y > pageH - 60) {
      pdf.addPage();
      y = margin;
      drawTableHeader();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
    }
    // No. as 'X/N'
    pdf.text(`${p.numeroParcela}/${total}`, cols.num, y);
    // Data Vcto
    pdf.text(formatDateBR(p.dataVencimento), cols.dataVcto, y);
    // Valor Parcela
    pdf.text(formatBRL(p.valorParcela), cols.valor, y);
    // Valor Pago: blank
    pdf.text('_________________', cols.valorPago, y);
    // Saldo: blank
    pdf.text('__________________', cols.saldo, y);
    // Data Pagamento: blank with format hint
    pdf.text('(_____)/(_____)/(_____)  ', cols.dataPag, y);
    // Recebido por: blank line drawn
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.2);
    pdf.line(cols.recebedor, y + 1, pageW - margin, y + 1);
    y += lineH;
  }

  // ---- After table ----
  // Separator line
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);

  // 1 blank line
  y += lineH;

  // Discount info (if applicable)
  if (data.desconto) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Desconto: ${data.desconto.apelido}`, margin, y);
    y += lineH;
    pdf.text(`Valor Original: ${formatBRL(data.desconto.valorOriginal)}`, margin, y);
    y += lineH;
  }

  // Total value (bold)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`Valor Total: ${formatBRL(data.valorTotal)}`, margin, y);

  // 5 blank lines
  y += lineH * 5;

  // Check if there's enough space for OBS section (~10 obs lines * 3*lineH + margins + signature)
  // Each obs line takes ~3*lineH = 18mm; 10 obs = 180mm + header + signature ~30mm
  // If not enough room, add a new page
  const obsNeeded = lineH + 10 * (lineH * 3) + lineH * 5 + lineH * 3;
  if (y + obsNeeded > pageH - margin) {
    pdf.addPage();
    y = margin;
  }

  // OBS.: label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('OBS.:', margin, y);
  y += lineH;

  // 10 observation lines: full-width underscores with 2 blank lines between each
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const obsLineWidth = pageW - margin * 2;
  const underscoreCount = Math.floor(obsLineWidth / 1.8); // approx chars that fill the width
  const obsLine = '_'.repeat(underscoreCount);

  for (let i = 0; i < 10; i++) {
    // Check page break for obs lines too
    if (y > pageH - 30) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(obsLine, margin, y);
    // 2 blank lines after each obs line
    y += lineH * 3;
  }

  // 5 blank lines
  y += lineH * 5;

  // Check page for signature
  if (y + lineH * 3 > pageH - margin) {
    pdf.addPage();
    y = margin + lineH * 3;
  }

  // Separator line centered (full width)
  const sigLineStart = pageW / 2 - 40;
  const sigLineEnd = pageW / 2 + 40;
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.4);
  pdf.line(sigLineStart, y, sigLineEnd, y);
  y += lineH;

  // 'Assinatura do Cliente' centered
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Assinatura do Cliente', pageW / 2, y, { align: 'center' });

  return pdf;
}
