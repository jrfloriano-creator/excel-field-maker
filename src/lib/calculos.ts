import { Titulo, TituloComCalculo, Situacao } from '@/types/titulo';

export function calcularTitulo(titulo: Titulo, taxaMensal: number): TituloComCalculo {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(titulo.vencimento);
  vencimento.setHours(0, 0, 0, 0);

  const diffMs = vencimento.getTime() - hoje.getTime();
  const diasAVencer = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

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
    valorJuros = titulo.valor * (taxaMensal / 30) * diasAtraso;
  }

  const valorCorrigido = titulo.valor + valorJuros;

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
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function getWhatsAppLink(phone: string, cliente: string, valor: number, vencimento: string): string {
  const digits = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Olá ${cliente}, identificamos um título no valor de ${formatCurrency(valor)} com vencimento em ${formatDate(vencimento)}. Entre em contato para regularizar.`
  );
  return `https://wa.me/55${digits}?text=${msg}`;
}
