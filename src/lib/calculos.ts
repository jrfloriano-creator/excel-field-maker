import { Titulo, TituloComCalculo, Situacao } from '@/types/titulo';

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calcularTitulo(titulo: Titulo, taxaMensal: number): TituloComCalculo {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = parseLocalDate(titulo.vencimento);

  const diffMs = vencimento.getTime() - hoje.getTime();
  const diasAVencer = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let situacao: Situacao;
  if (titulo.dataPagamento && titulo.valorPago) {
    situacao = 'PAGO';
  } else if (diasAVencer < 0) {
    situacao = 'VENCIDO';
  } else {
    situacao = 'NO PRAZO';
  }

  let valorJuros = 0;
  if (situacao === 'VENCIDO') {
    const diasAtraso = Math.abs(diasAVencer);
    const taxaDiaria = taxaMensal / 30;
    valorJuros = titulo.valor * taxaDiaria * diasAtraso;
    valorJuros = Math.round(valorJuros * 100) / 100;
  }

  const valorCorrigido = Math.round((titulo.valor + valorJuros) * 100) / 100;

  return {
    ...titulo,
    diasAVencer,
    situacao,
    valorJuros,
    valorCorrigido,
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('pt-BR');
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function getWhatsAppLink(phone: string, cliente: string, valor: number, vencimento: string, chavePix?: { nome: string; chave: string }): string {
  const digits = phone.replace(/\D/g, '');
  let msg = `Olá ${cliente}, identificamos um título no valor de ${formatCurrency(valor)} com vencimento em ${formatDate(vencimento)}. Entre em contato para regularizar.`;
  if (chavePix) {
    msg += `\n\nou utilize a Chave PIX a seguir para o pagamento:\n${chavePix.nome}: ${chavePix.chave}`;
  }
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
}

export function buildPagamentoWhatsMsg(opts: {
  apelido: string;
  formaPagamento: string;
  valorPago: number;
  tipoTitulo: string;
  recebidoPor: string;
  creditoGerado?: number;
}): string {
  const { apelido, formaPagamento, valorPago, tipoTitulo, recebidoPor, creditoGerado } = opts;
  let msg = `Olá ${apelido}, recebemos seu pagamento em ${formaPagamento} no valor de ${formatCurrency(valorPago)}, referente ${tipoTitulo}, recebido por ${recebidoPor}`;
  if (creditoGerado && creditoGerado > 0) {
    msg += `\n\nObs. O valor pago a ${formatCurrency(creditoGerado)} mais será abatido no valor do próximo mês.`;
  }
  msg += `\n\nAgradecemos a preferência!`;
  return msg;
}

export function whatsLink(phone: string, msg: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
}

export function getMonthKey(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(month) - 1]}/${year}`;
}
