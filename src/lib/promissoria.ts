import jsPDF from 'jspdf';
import { Cliente, CredorConfig } from '@/types/titulo';

export interface PromissoriaData {
  quantidade: number;
  cidadeEstado: string;
  primeiroVencimento: string; // YYYY-MM-DD
  valorTotal: number;
  credor: CredorConfig;
  devedor: Cliente;
}

const meses = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro'
];

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function dateToLong(d: Date): string {
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function tresDigitos(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(centenas[c]);
  if (r > 0) {
    if (r < 10) partes.push(unidades[r]);
    else if (r < 20) partes.push(especiais[r - 10]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`);
    }
  }
  return partes.join(' e ');
}

export function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function inteiroExtenso(n: number): string {
    if (n === 0) return 'zero';
    const milhoes = Math.floor(n / 1000000);
    const milhares = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;
    const partes: string[] = [];
    if (milhoes > 0) partes.push(milhoes === 1 ? 'um milhão' : `${tresDigitos(milhoes)} milhões`);
    if (milhares > 0) partes.push(milhares === 1 ? 'mil' : `${tresDigitos(milhares)} mil`);
    if (resto > 0) partes.push(tresDigitos(resto));
    return partes.join(' e ');
  }

  let texto = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`;
  if (centavos > 0) {
    texto += ` e ${inteiroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }
  return texto;
}

export interface NotaCalculada {
  numero: string; // ex "1/5"
  vencimento: Date;
  valor: number;
  vencimentoLongo: string;
  valorExtenso: string;
}

export function calcularNotas(data: PromissoriaData): NotaCalculada[] {
  const { quantidade, valorTotal, primeiroVencimento } = data;
  const valorParcela = Math.round((valorTotal / quantidade) * 100) / 100;
  // ajusta a última parcela para fechar o total
  const baseSomada = valorParcela * (quantidade - 1);
  const ultima = Math.round((valorTotal - baseSomada) * 100) / 100;

  const primeiroDate = parseLocalDate(primeiroVencimento);
  const notas: NotaCalculada[] = [];
  for (let i = 0; i < quantidade; i++) {
    const venc = addMonths(primeiroDate, i);
    const valor = i === quantidade - 1 ? ultima : valorParcela;
    notas.push({
      numero: `${i + 1}/${quantidade}`,
      vencimento: venc,
      valor,
      vencimentoLongo: dateToLong(venc),
      valorExtenso: valorPorExtenso(valor),
    });
  }
  return notas;
}

/**
 * Gera PDF A4 com 2 promissórias por página (modelo clássico).
 */
export function gerarPromissoriaPDF(data: PromissoriaData, notas: NotaCalculada[]): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const notaH = (pageH - margin * 3) / 2; // 2 por página

  notas.forEach((nota, idx) => {
    const posIdx = idx % 2;
    if (idx > 0 && posIdx === 0) pdf.addPage();
    const y = margin + posIdx * (notaH + margin);
    desenharNota(pdf, data, nota, margin, y, pageW - margin * 2, notaH);
  });

  return pdf;
}

function desenharNota(
  pdf: jsPDF,
  data: PromissoriaData,
  nota: NotaCalculada,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Borda
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, w, h);

  // Cabeçalho
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('NOTA PROMISSÓRIA', x + w / 2, y + 8, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nº ${nota.numero}`, x + 4, y + 8);
  pdf.text(`Valor: ${formatBRL(nota.valor)}`, x + w - 4, y + 8, { align: 'right' });

  // Linha
  pdf.line(x, y + 11, x + w, y + 11);

  // Corpo
  const bodyY = y + 17;
  pdf.setFontSize(10);

  const venc = nota.vencimento;
  const vencFmt = `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}/${venc.getFullYear()}`;

  const linha1 = `Aos ${nota.vencimentoLongo}, pagarei por esta única via de NOTA PROMISSÓRIA a`;
  const linha2 = `${data.credor.nome || '_______________________'}, CPF/CNPJ ${data.credor.cpfCnpj || '_______________'}, ou à sua ordem,`;
  const linha3 = `a quantia de ${formatBRL(nota.valor)} (${nota.valorExtenso}), em moeda corrente`;
  const linha4 = `deste país, no vencimento ${vencFmt}.`;

  const texto = `${linha1} ${linha2} ${linha3} ${linha4}`;
  const linhasQuebradas = pdf.splitTextToSize(texto, w - 8);
  pdf.text(linhasQuebradas, x + 4, bodyY);

  // Devedor
  const devY = bodyY + linhasQuebradas.length * 5 + 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Emitente (Devedor):', x + 4, devY);
  pdf.setFont('helvetica', 'normal');
  const endereco = [
    data.devedor.logradouro,
    data.devedor.numero,
    data.devedor.bairro,
    data.devedor.cidade && data.devedor.estado ? `${data.devedor.cidade}/${data.devedor.estado}` : '',
    data.devedor.cep ? `CEP ${data.devedor.cep}` : '',
  ].filter(Boolean).join(', ');

  pdf.text(`Nome: ${data.devedor.nome}`, x + 4, devY + 5);
  pdf.text(`CPF/CNPJ: ${data.devedor.cpfCnpj || '_______________'}`, x + 4, devY + 10);
  if (endereco) {
    const linhasEnd = pdf.splitTextToSize(`Endereço: ${endereco}`, w - 8);
    pdf.text(linhasEnd, x + 4, devY + 15);
  }

  // Local e data + assinatura
  const sigY = y + h - 18;
  pdf.text(`${data.cidadeEstado}, ${dateToLong(new Date())}`, x + 4, sigY);
  pdf.line(x + w - 80, sigY + 8, x + w - 4, sigY + 8);
  pdf.text('Assinatura do Emitente', x + w - 42, sigY + 12, { align: 'center' });
}
