// src/lib/comunicacao.ts
import { ContaPagar, Cliente } from '@/types/titulo';

// ✅ CORREÇÃO: Normalizador robusto para garantir que o número sempre tenha o 55
export function normalizarTelefoneWhatsapp(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  
  // Remove o 55 se já estiver no início (evita 5555...)
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  
  // Remove 0 inicial (código de operadora antigo)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // Se tiver 10 ou 11 dígitos (DDD + Número), adiciona o 55 do Brasil
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  
  // Se já estiver correto (12 ou 13 dígitos), mantém
  if (digits.length === 12 || digits.length === 13) {
    return digits;
  }
  
  // Fallback
  return `55${digits}`;
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numeroCorrigido = normalizarTelefoneWhatsapp(telefone);
  if (!numeroCorrigido || numeroCorrigido.length < 12) return '';
  
  const mensagemCodificada = encodeURIComponent(mensagem);
  return `https://wa.me/${numeroCorrigido}?text=${mensagemCodificada}`;
}

export function criarMensagemAniversario(cliente: Cliente, mensagemBase: string): string {
  const nome = cliente.apelido || cliente.nome.split(' ')[0];
  return mensagemBase
    .replace(/\{nome\}/g, cliente.nome)
    .replace(/\{apelido\}/g, nome);
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

export function gerarLinkEmail(destinatario: string, assunto: string, corpo: string): string {
  return `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}