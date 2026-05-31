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
 * Layout (per spec):
 *  - Client full name (bold, uppercase) — emission date + time  (line 1)
 *  - 3 blank lines
 *  - Table header (bold): Nº | Data vcto | Valor parcela | Data Pgto. | Recebido por
 *  - One row per installment (Nº as 'X/N', Data Pgto as '___/___/___', Recebido por as blank line)
 *  - Separator line
 *  - 1 blank line
 *  - If discount: 'Desconto: {apelido}' and 'Valor Original: R$ X,XX'
 *  - 'Valor Total: R$ X,XX' (bold)
 *  - 5 blank lines
 * Handles page breaks for 12+ installments.
 */
export function gerarCadernoPDF(data: CadernoData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const lineH = 7; // mm per line
  const total = data.parcelas.length;
  let y = margin;

  // ---- Line 1: client name (bold, uppercase) — date+time ----
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(data.clienteNome.toUpperCase(), margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Emissão: ${nowStr()}`, pageW - margin, y, { align: 'right' });

  // 3 blank lines
  y += lineH * 3;

  // ---- Table ----
  const cols = {
    num: margin,
    dataVcto: margin + 22,
    valor: margin + 55,
    dataPag: margin + 90,
    recebedor: margin + 125,
  };

  const drawTableHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Nº', cols.num, y);
    pdf.text('Data vcto', cols.dataVcto, y);
    pdf.text('Valor parcela', cols.valor, y);
    pdf.text('Data Pgto.', cols.dataPag, y);
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
  pdf.setFontSize(9);
  for (const p of data.parcelas) {
    // Check if we need a new page (leave room for footer: separator + total + 5 blank = ~50mm)
    if (y > pageH - 55) {
      pdf.addPage();
      y = margin;
      drawTableHeader();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
    }
    // Nº as 'X/N'
    pdf.text(`${p.numeroParcela}/${total}`, cols.num, y);
    pdf.text(formatDateBR(p.dataVencimento), cols.dataVcto, y);
    pdf.text(formatBRL(p.valorParcela), cols.valor, y);
    // Data Pgto: '___/___/___' text
    pdf.text('___/___/___', cols.dataPag, y);
    // Recebido por: blank signature line
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.2);
    pdf.line(cols.recebedor, y + 1, pageW - margin, y + 1);
    y += lineH;
  }

  // Separator line
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);

  // 1 blank line
  y += lineH;

  // Discount info above total (if applicable)
  if (data.desconto) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Desconto: ${data.desconto.apelido}`, margin, y);
    y += lineH;
    pdf.text(`Valor Original: ${formatBRL(data.desconto.valorOriginal)}`, margin, y);
    y += lineH;
  }

  // Total value (bold)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Valor Total: ${formatBRL(data.valorTotal)}`, margin, y);

  // 5 blank lines at end (space for notes)
  y += lineH * 5;

  return pdf;
}
