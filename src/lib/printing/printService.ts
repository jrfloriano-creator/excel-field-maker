/**
 * PrintService — serviço singleton de impressão direta.
 *
 * Gera um PDF (via jsPDF) para o documento solicitado e o envia diretamente
 * para a impressora padrão do sistema, usando o plugin `tauri-plugin-printer-v2`.
 * Em ambiente web (sem Tauri), cai em fallback abrindo o PDF em uma nova aba
 * com o diálogo de impressão do navegador.
 */
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { getPrinters, printPdf } from 'tauri-plugin-printer-v2';
import { Cliente, CredorConfig } from '@/types/titulo';
import { formatBRL, valorPorExtenso, dateToLongExtenso } from '@/lib/promissoria';

export type TipoImpressao = 'PROMISSORIA' | 'TITULO' | 'RECIBO';

export interface ImprimirDiretoOptions {
  tipo: TipoImpressao;
  titulo: string;
  /** Nome do devedor/cliente */
  cliente: string;
  cpfCnpj?: string;
  endereco?: string;
  telefone?: string;
  /** Nome/CPF do credor (usado em PROMISSORIA) */
  credor?: CredorConfig;
  valor: number;
  vencimento?: string; // YYYY-MM-DD
  dataEmissao?: string; // YYYY-MM-DD
  observacoes?: string;
  /** Número de cópias a imprimir */
  copias?: number;
}

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
}

function parseLocalDate(s?: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateBR(s?: string): string {
  if (!s) return '';
  const d = parseLocalDate(s);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

class PrintService {
  private static instance: PrintService;

  static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  /**
   * Gera o PDF do documento (layout conforme `tipo`) e envia para a
   * impressora padrão. Retorna `true` se enviado com sucesso.
   */
  async imprimirDireto(options: ImprimirDiretoOptions): Promise<boolean> {
    const pdf = this.gerarDocumentoPDF(options);

    if (!isTauriEnv()) {
      this.fallbackImpressao(pdf);
      return true;
    }

    try {
      const arrayBuffer = pdf.output('arraybuffer');
      const data = Array.from(new Uint8Array(arrayBuffer));

      const { tempDir, join } = await import('@tauri-apps/api/path');
      const { invoke } = await import('@tauri-apps/api/core');

      const nomeArquivo = `impressao-${options.tipo.toLowerCase()}-${Date.now()}.pdf`;
      const dir = await tempDir();
      const fullPath = await join(dir, nomeArquivo);

      await invoke('write_bytes_to_file', { path: fullPath, data });

      const printerName = await this.obterImpressoraPadrao();
      if (!printerName) {
        toast.warning('Nenhuma impressora encontrada. Abrindo PDF para impressão manual.');
        this.fallbackImpressao(pdf);
        return false;
      }

      const copias = Math.max(1, options.copias || 1);
      for (let i = 0; i < copias; i++) {
        await printPdf({
          id: `print-${Date.now()}-${i}`,
          path: fullPath,
          printer: printerName,
          print_settings: '',
          remove_after_print: false,
        });
      }

      return true;
    } catch (err) {
      console.warn('[PrintService] falha ao imprimir via plugin, tentando fallback', err);
      // Fallback secundário: comando Rust de impressão direta (Start-Process -Verb Print)
      try {
        const arrayBuffer = pdf.output('arraybuffer');
        const data = Array.from(new Uint8Array(arrayBuffer));
        const { tempDir, join } = await import('@tauri-apps/api/path');
        const { invoke } = await import('@tauri-apps/api/core');
        const nomeArquivo = `impressao-${options.tipo.toLowerCase()}-${Date.now()}.pdf`;
        const dir = await tempDir();
        const fullPath = await join(dir, nomeArquivo);
        await invoke('write_bytes_to_file', { path: fullPath, data });
        await invoke('print_pdf_file', { path: fullPath });
        return true;
      } catch (err2) {
        console.error('[PrintService] fallback também falhou', err2);
        this.fallbackImpressao(pdf);
        return false;
      }
    }
  }

  /** Retorna o nome da impressora padrão (ou a primeira disponível). */
  private async obterImpressoraPadrao(): Promise<string | null> {
    try {
      const printersJson = await getPrinters();
      const printersList: Array<{ name: string; is_default?: boolean }> = JSON.parse(printersJson);
      if (!printersList || printersList.length === 0) return null;
      return printersList.find(p => p.is_default)?.name || printersList[0]?.name || null;
    } catch (err) {
      console.warn('[PrintService] erro ao obter impressoras', err);
      return null;
    }
  }

  /** Fallback web: abre o PDF em nova janela/embed com o diálogo de impressão. */
  fallbackImpressao(pdf: jsPDF): void {
    const blobUrl = pdf.output('bloburl') as unknown as string;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head><title>Impressão</title></head>
          <body style="margin:0">
            <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" style="position:fixed;top:0;left:0;border:none;" />
          </body>
        </html>
      `);
      win.document.close();
      setTimeout(() => {
        try { win.print(); } catch { /* usuário imprime manualmente pelo embed */ }
      }, 500);
    } else {
      toast.error('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /** Roteia para o gerador de layout correto conforme o tipo de documento. */
  private gerarDocumentoPDF(options: ImprimirDiretoOptions): jsPDF {
    switch (options.tipo) {
      case 'PROMISSORIA':
        return this.gerarPromissoriaSimples(options);
      case 'TITULO':
      case 'RECIBO':
      default:
        return this.gerarReciboGenerico(options);
    }
  }

  /**
   * Layout PROMISSORIA: cabeçalho, dados, texto de declaração,
   * assinaturas e rodapé.
   */
  private gerarPromissoriaSimples(options: ImprimirDiretoOptions): jsPDF {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 20;
    let y = margin;

    // ---- Cabeçalho ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('NOTA PROMISSÓRIA', pageW / 2, y, { align: 'center' });
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(options.titulo, pageW / 2, y, { align: 'center' });
    y += 10;
    pdf.setDrawColor(120);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    // ---- Dados ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Nº', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Vencimento:', margin + 50, y);
    pdf.setFont('helvetica', 'italic');
    pdf.text(formatDateBR(options.vencimento), margin + 80, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Valor:', pageW - margin - 50, y);
    pdf.setFont('helvetica', 'italic');
    pdf.text(formatBRL(options.valor), pageW - margin - 25, y);
    y += 10;

    // ---- Texto de declaração ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const dataEmissaoLonga = dateToLongExtenso(parseLocalDate(options.dataEmissao));
    const vencimentoLongo = dateToLongExtenso(parseLocalDate(options.vencimento));
    const valorExtenso = valorPorExtenso(options.valor);
    const credorNome = options.credor?.nome || '';
    const credorCpf = options.credor?.cpfCnpj || '';

    const textoDeclaracao =
      `Ao(s) ${vencimentoLongo}, pagarei por esta única via de NOTA PROMISSÓRIA a ` +
      `${credorNome}${credorCpf ? ` (CPF/CNPJ ${credorCpf})` : ''}, ou à sua ordem, a quantia de ` +
      `${valorExtenso}, em moeda corrente deste país.`;
    const linhas = pdf.splitTextToSize(textoDeclaracao, pageW - margin * 2);
    pdf.text(linhas, margin, y);
    y += linhas.length * 5.5 + 8;

    // ---- Dados do emitente/devedor ----
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMITENTE:', margin, y);
    pdf.setFont('helvetica', 'italic');
    pdf.text(options.cliente || '', margin + 25, y);
    y += 6;
    if (options.cpfCnpj) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('CPF/CNPJ:', margin, y);
      pdf.setFont('helvetica', 'italic');
      pdf.text(options.cpfCnpj, margin + 25, y);
      y += 6;
    }
    if (options.endereco) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('ENDEREÇO:', margin, y);
      pdf.setFont('helvetica', 'italic');
      const enderecoLinhas = pdf.splitTextToSize(options.endereco, pageW - margin * 2 - 25);
      pdf.text(enderecoLinhas, margin + 25, y);
      y += enderecoLinhas.length * 5.5;
    }
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Data de emissão: ${formatDateBR(options.dataEmissao) || dataEmissaoLonga}`, margin, y);
    y += 10;

    if (options.observacoes) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const obsLinhas = pdf.splitTextToSize(`Obs.: ${options.observacoes}`, pageW - margin * 2);
      pdf.text(obsLinhas, margin, y);
      y += obsLinhas.length * 5 + 6;
    }

    // ---- Assinaturas ----
    y = Math.max(y, 220);
    pdf.setDrawColor(80);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + 70, y);
    pdf.line(pageW - margin - 70, y, pageW - margin, y);
    y += 5;
    pdf.setFontSize(9);
    pdf.text('Assinatura do Emitente', margin + 35, y, { align: 'center' });
    pdf.text('Assinatura do Credor', pageW - margin - 35, y, { align: 'center' });

    // ---- Rodapé ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(130);
    pdf.text('Documento gerado eletronicamente.', pageW / 2, 285, { align: 'center' });

    return pdf;
  }

  /** Layout genérico para TITULO/RECIBO. */
  private gerarReciboGenerico(options: ImprimirDiretoOptions): jsPDF {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 20;
    let y = margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(options.tipo === 'RECIBO' ? 'RECIBO' : 'TÍTULO', pageW / 2, y, { align: 'center' });
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(options.titulo, pageW / 2, y, { align: 'center' });
    y += 10;
    pdf.setDrawColor(120);
    pdf.line(margin, y, pageW - margin, y);
    y += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cliente:', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(options.cliente || '', margin + 30, y);
    y += 8;

    if (options.cpfCnpj) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('CPF/CNPJ:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(options.cpfCnpj, margin + 30, y);
      y += 8;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text('Valor:', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatBRL(options.valor), margin + 30, y);
    y += 8;

    if (options.vencimento) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vencimento:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDateBR(options.vencimento), margin + 30, y);
      y += 8;
    }

    if (options.observacoes) {
      y += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const obsLinhas = pdf.splitTextToSize(`Obs.: ${options.observacoes}`, pageW - margin * 2);
      pdf.text(obsLinhas, margin, y);
      y += obsLinhas.length * 5;
    }

    y = Math.max(y + 20, 220);
    pdf.setDrawColor(80);
    pdf.line(margin + 35, y, margin + 115, y);
    y += 5;
    pdf.setFontSize(9);
    pdf.text('Assinatura', margin + 75, y, { align: 'center' });

    pdf.setFontSize(7);
    pdf.setTextColor(130);
    pdf.text('Documento gerado eletronicamente.', pageW / 2, 285, { align: 'center' });

    return pdf;
  }
}

export const printService = PrintService.getInstance();
export { PrintService };

/** Helper para montar options a partir de um Cliente + CredorConfig comuns no app. */
export function montarOpcoesImpressao(params: {
  tipo: TipoImpressao;
  titulo: string;
  devedor: Cliente;
  credor?: CredorConfig;
  valor: number;
  vencimento?: string;
  dataEmissao?: string;
  observacoes?: string;
  copias?: number;
}): ImprimirDiretoOptions {
  const { devedor } = params;
  const enderecoPartes = [
    devedor.logradouro,
    devedor.numero,
    devedor.bairro,
    devedor.cidade && devedor.estado ? `${devedor.cidade}/${devedor.estado}` : '',
    devedor.cep ? `CEP ${devedor.cep}` : '',
  ].filter(Boolean);

  return {
    tipo: params.tipo,
    titulo: params.titulo,
    cliente: devedor.nome,
    cpfCnpj: devedor.cpfCnpj,
    endereco: enderecoPartes.join(', '),
    telefone: devedor.telefone,
    credor: params.credor,
    valor: params.valor,
    vencimento: params.vencimento,
    dataEmissao: params.dataEmissao,
    observacoes: params.observacoes,
    copias: params.copias,
  };
}
