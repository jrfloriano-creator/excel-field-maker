import { Cliente } from '@/types/cliente';
import { Titulo } from '@/types/titulo';

export function obterNomeCliente(cliente: Cliente): string {
  if (cliente.apelido && cliente.apelido.trim().length > 0) {
    return cliente.apelido.trim();
  }
  if (cliente.nome) {
    return cliente.nome.split(' ')[0];
  }
  return 'Cliente';
}

interface GerarMensagemParams {
  cliente: Cliente;
  titulos: Titulo[];
  empresa: any;
  incluirPix?: boolean;
  tipo: 'COBRANCA' | 'LEMBRETE' | 'PAGO' | 'PROMISSORIA';
}

export function gerarMensagemWhatsApp(params: GerarMensagemParams): string {
  const { cliente, titulos, empresa, incluirPix, tipo } = params;
  const nomeCliente = obterNomeCliente(cliente);
  
  const modelos = {
    COBRANCA: `
Olá {nome}! 👋

Seus títulos estão pendentes:
{lista_titulos}

📊 Total: {total}

💰 Pague via PIX: {pix}
📞 Dúvidas? Entre em contato.

Atenciosamente,
{empresa}
`,
    LEMBRETE: `
Olá {nome}! ⏰

Lembrete: título {titulo} vence em {dias} dias.
Valor: R$ {valor}

Não esqueça de pagar!

{empresa}
`,
    PAGO: `
Olá {nome}! ✅

Título recebido com sucesso:
{titulo}
Valor: R$ {valor}
Data: {data_pagamento}

Obrigado! 🙏

{empresa}
`,
    PROMISSORIA: `
Olá {nome}! 📄

Promissória gerada:
Nº: {numero}
Valor: R$ {valor}
Vencimento: {data}

{empresa}
`
  };
  
  let mensagem = modelos[tipo];
  mensagem = mensagem.replace(/{nome}/g, nomeCliente);
  
  if (titulos.length > 1) {
    const lista = titulos.map(t => 
      `• #${t.id?.slice(0, 8) || '---'} - R$ ${t.valor.toFixed(2)} (${t.status === 'VENCIDO' ? 'Vencido' : 'Vence em'} ${new Date(t.dataVencimento).toLocaleDateString('pt-BR')})`
    ).join('\n');
    mensagem = mensagem.replace(/{lista_titulos}/g, lista);
  } else if (titulos.length === 1) {
    const t = titulos[0];
    mensagem = mensagem.replace(/{lista_titulos}/g, `• #${t.id?.slice(0, 8) || '---'} - R$ ${t.valor.toFixed(2)}`);
    mensagem = mensagem.replace(/{titulo}/g, `#${t.id?.slice(0, 8) || '---'}`);
    mensagem = mensagem.replace(/{valor}/g, t.valor.toFixed(2));
    const dias = Math.ceil((new Date(t.dataVencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    mensagem = mensagem.replace(/{dias}/g, dias > 0 ? String(dias) : 'vencido');
    mensagem = mensagem.replace(/{data}/g, new Date(t.dataVencimento).toLocaleDateString('pt-BR'));
  }
  
  const total = titulos.reduce((sum, t) => sum + t.valor, 0);
  mensagem = mensagem.replace(/{total}/g, total.toFixed(2));
  
  if (incluirPix && empresa?.pix) {
    mensagem = mensagem.replace(/{pix}/g, empresa.pix);
  } else {
    mensagem = mensagem.replace(/💰 Pague via PIX: {pix}\n/g, '');
  }
  
  mensagem = mensagem.replace(/{empresa}/g, empresa?.nome || 'Controle Financeiro ZOOM');
  mensagem = mensagem.replace(/\n{3,}/g, '\n\n').trim();
  
  return mensagem;
}
