import { ContaPagar } from '@/types/titulo';

// =========== WHATSAPP ===========
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (!numeroLimpo) return '';
  const mensagemCodificada = encodeURIComponent(mensagem);
  return `https://wa.me/${numeroLimpo}?text=${mensagemCodificada}`;
}

export function criarMensagemConta(conta: ContaPagar): string {
  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor);
  const vencimento = conta.vencimento.split('-').reverse().join('/');
  
  return `Olá! Tudo bem? 📋

Segue aviso de conta a pagar:

📝 ${conta.descricao}
👤 Favorecido: ${conta.favorecido || '—'}
💰 Valor: ${valor}
📅 Vencimento: ${vencimento}
${conta.tipoTitulo ? `📄 Tipo: ${conta.tipoTitulo}` : ''}

Atenciosamente,
Sistema Zoom Financeiro`;
}

export function abrirWhatsAppConta(conta: ContaPagar, telefone: string) {
  const mensagem = criarMensagemConta(conta);
  const link = gerarLinkWhatsApp(telefone, mensagem);
  if (link) window.open(link, '_blank');
}

// =========== E-MAIL ===========
export function gerarLinkEmail(destinatario: string, assunto: string, corpo: string): string {
  return `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function abrirEmailConta(conta: ContaPagar, email: string) {
  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor);
  const vencimento = conta.vencimento.split('-').reverse().join('/');
  const assunto = `Conta a Pagar — ${conta.descricao} — Venc: ${vencimento}`;
  const corpo = criarMensagemConta(conta);
  window.open(gerarLinkEmail(email, assunto, corpo), '_blank');
}