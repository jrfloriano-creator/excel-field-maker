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

const numerosExtenso = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez',
  'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove','vinte',
  'vinte e um','vinte e dois','vinte e três','vinte e quatro','vinte e cinco','vinte e seis',
  'vinte e sete','vinte e oito','vinte e nove','trinta','trinta e um'];

function anoExtenso(ano: number): string {
  // Ex: 2025 -> "dois mil e vinte e cinco"
  const milhar = Math.floor(ano / 1000);
  const resto = ano % 1000;
  const milhares = milhar === 1 ? 'mil' : `${tresDigitos(milhar)} mil`;
  if (resto === 0) return milhares;
  return `${milhares} e ${tresDigitos(resto)}`;
}

export function dateToLongExtenso(d: Date): string {
  const dia = numerosExtenso[d.getDate()] || String(d.getDate());
  return `${dia} de ${meses[d.getMonth()]} de ${anoExtenso(d.getFullYear())}`;
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
      vencimentoLongo: dateToLongExtenso(venc),
      valorExtenso: valorPorExtenso(valor),
    });
  }
  return notas;
}

/**
 * Gera PDF A4 com 3 promissórias por página seguindo o modelo clássico
 * (fundo amarelo, lateral de avalistas, linhas pontilhadas).
 */
export function gerarPromissoriaPDF(data: PromissoriaData, notas: NotaCalculada[]): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const perPage = 3;
  const gap = 4;
  const notaH = (pageH - margin * 2 - gap * (perPage - 1)) / perPage;
  const notaW = pageW - margin * 2;

  notas.forEach((nota, idx) => {
    const posIdx = idx % perPage;
    if (idx > 0 && posIdx === 0) pdf.addPage();
    const y = margin + posIdx * (notaH + gap);
    desenharNota(pdf, data, nota, margin, y, notaW, notaH);
  });

  return pdf;
}

function dotted(pdf: jsPDF, x1: number, y: number, x2: number) {
  pdf.setLineDashPattern([0.4, 0.6], 0);
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.2);
  pdf.line(x1, y, x2, y);
  pdf.setLineDashPattern([], 0);
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
  // Fundo amarelo claro
  pdf.setFillColor(255, 247, 200);
  pdf.rect(x, y, w, h, 'F');

  // Borda externa
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, w, h);

  // ---- Coluna lateral esquerda: AVALISTAS (2 sub-colunas) ----
  const avalW = 22; // largura total da lateral
  const subW = avalW / 2;
  pdf.setDrawColor(150);
  pdf.line(x + avalW, y, x + avalW, y + h); // separador vertical com o corpo
  pdf.line(x + subW, y, x + subW, y + h); // separador entre as 2 sub-colunas

  // Texto vertical "AVALISTAS"
  pdf.setTextColor(180, 140, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('AVALISTAS', x + 4, y + h / 2 + 12, { angle: 90 });

  // Rótulos verticais nas 2 sub-colunas (CPF/CNPJ e ENDEREÇO)
  pdf.setFontSize(7);
  pdf.setTextColor(80);
  pdf.text('CPF/CNPJ', x + subW - 2, y + h - 4, { angle: 90 });
  pdf.text('ENDEREÇO', x + subW + subW - 2, y + h - 4, { angle: 90 });

  // ---- Corpo principal ----
  const bx = x + avalW + 3; // x do corpo
  const bw = w - avalW - 6; // largura útil
  pdf.setTextColor(0);

  // Linha 1: Nº [   ]   Vencimento DD de MMMM de AAAA   R$ [ valor ]
  let cy = y + 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Nº', bx, cy);
  // caixinha do número
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(bx + 6, cy - 4, 18, 5.5, 1, 1);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.text(nota.numero, bx + 15, cy, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Vencimento', bx + 27, cy);
  const venc = nota.vencimento;
  const dia = String(venc.getDate()).padStart(2, '0');
  const mesNome = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][venc.getMonth()];
  const ano = String(venc.getFullYear());
  pdf.setFont('helvetica', 'italic');
  pdf.text(dia, bx + 47, cy);
  pdf.setFont('helvetica', 'normal'); pdf.text('de', bx + 54, cy);
  pdf.setFont('helvetica', 'italic'); pdf.text(mesNome, bx + 62, cy);
  pdf.setFont('helvetica', 'normal'); pdf.text('de', bx + 84, cy);
  pdf.setFont('helvetica', 'italic'); pdf.text(ano, bx + 91, cy);

  pdf.setFont('helvetica', 'bold');
  pdf.text('R$', bx + bw - 38, cy);
  pdf.roundedRect(bx + bw - 32, cy - 4, 32, 5.5, 1, 1);
  pdf.setFont('helvetica', 'italic');
  pdf.text(formatBRL(nota.valor).replace('R$', '').trim(), bx + bw - 16, cy, { align: 'center' });

  // Linha 2: Ao(s) {data por extenso}
  cy += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Ao(s)', bx, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(nota.vencimentoLongo, bx + 12, cy);
  dotted(pdf, bx + 12, cy + 0.8, bx + bw);

  // Linha 3: ............ pagarei  por esta única via de   NOTA PROMISSÓRIA
  cy += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const tituloW = pdf.getTextWidth('NOTA PROMISSÓRIA');
  pdf.text('NOTA PROMISSÓRIA', bx + bw, cy, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const txtFinal = 'pagarei por esta única via de';
  const txtFinalW = pdf.getTextWidth(txtFinal);
  const finalX = bx + bw - tituloW - 2 - txtFinalW;
  pdf.text(txtFinal, finalX, cy);
  // pontilhado à esquerda até onde começa "pagarei"
  dotted(pdf, bx, cy + 0.8, finalX - 1);

  // Linha 4: a {credor} ............... CPF/CNPJ {cpf}
  cy += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('a', bx, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.credor.nome || '', bx + 4, cy);
  pdf.setFont('helvetica', 'normal');
  // pontilhado entre credor e CPF
  const credorEndX = bx + 4 + pdf.getTextWidth(data.credor.nome || '');
  dotted(pdf, credorEndX + 1, cy + 0.8, bx + bw - 50);
  pdf.text('CPF/CNPJ', bx + bw - 48, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.credor.cpfCnpj || '', bx + bw - 32, cy);

  // Linha 5: Ou à sua ordem, a quantia de [valor extenso]
  cy += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Ou à sua ordem, a quantia de', bx, cy);
  const labelW = pdf.getTextWidth('Ou à sua ordem, a quantia de') + 2;
  pdf.roundedRect(bx + labelW, cy - 4, bw - labelW, 5.5, 1, 1);
  pdf.setFont('helvetica', 'italic');
  const extenso = nota.valorExtenso;
  const linhasExt = pdf.splitTextToSize(extenso, bw - labelW - 4);
  pdf.text(linhasExt[0] || '', bx + labelW + 2, cy);

  // segunda linha (continuação) sobre pontilhado
  cy += 6;
  if (linhasExt[1]) {
    pdf.text(linhasExt.slice(1).join(' '), bx + 2, cy);
  }
  dotted(pdf, bx, cy + 0.8, bx + bw);

  // Linha 6: em moeda corrente deste país, pagável em {cidade/estado}
  cy += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('em moeda corrente deste país, pagável em', bx, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.cidadeEstado || '', bx + 70, cy);
  dotted(pdf, bx + 70, cy + 0.8, bx + bw);

  // Linha 7: EMITENTE {nome devedor}            DATA DA EMISSÃO dd/mm/aaaa
  cy += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMITENTE', bx, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.devedor.nome || '', bx + 18, cy);
  pdf.setFont('helvetica', 'bold');
  const hoje = new Date();
  const hojeStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
  pdf.text('DATA DA EMISSÃO', bx + bw - 50, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(hojeStr, bx + bw - 18, cy);

  // Linha 8: CPF/CNPJ {cpf devedor}
  cy += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('CPF/CNPJ', bx, cy);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.devedor.cpfCnpj || '', bx + 18, cy);
  dotted(pdf, bx + 18, cy + 0.8, bx + bw);

  // Linha 9: ENDEREÇO  {endereço completo + CEP}
  cy += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('ENDEREÇO', bx, cy);
  pdf.setFont('helvetica', 'italic');
  const enderecoPartes = [
    data.devedor.logradouro,
    data.devedor.numero,
    data.devedor.bairro,
    data.devedor.cidade && data.devedor.estado ? `${data.devedor.cidade}/${data.devedor.estado}` : '',
    data.devedor.cep ? `CEP ${data.devedor.cep}` : '',
  ].filter(Boolean);
  const enderecoCompleto = enderecoPartes.join(', ');
  // espaço entre o rótulo e o conteúdo (rótulo ~22mm, valor começa em +26)
  const endX = bx + 26;
  pdf.text(enderecoCompleto, endX, cy);
  dotted(pdf, endX, cy + 0.8, bx + bw);

  // Pula 3 linhas e coloca a assinatura na última linha, alinhada à esquerda
  cy += 6 * 3;
  // garante que ficamos dentro da nota
  if (cy > y + h - 4) cy = y + h - 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('ASS. DO EMITENTE', bx, cy);
  dotted(pdf, bx + 32, cy + 0.8, bx + 110);
}

