/**
 * message.ts — Geração de mensagens de WhatsApp do Controle Financeiro ZOOM.
 *
 * Centraliza a lógica de nome do cliente (apelido > primeiro nome > 'Cliente')
 * e os templates de mensagem por tipo (COBRANCA, LEMBRETE, PAGO, PROMISSORIA).
 */
import { Cliente } from '@/types/titulo';
import { formatCurrency, formatDate } from '@/lib/calculos';

/**
 * Retorna o nome a ser usado nas mensagens de WhatsApp:
 * 1. cliente.apelido, se existir e não for vazio
 * 2. primeiro nome de cliente.nome
 * 3. 'Cliente' como fallback
 */
export function obterNomeCliente(cliente?: Partial<Cliente> | null): string {
  if (!cliente) return 'Cliente';
  if (cliente.apelido && cliente.apelido.trim()) {
    return cliente.apelido.trim();
  }
  if (cliente.nome && cliente.nome.trim()) {
    return cliente.nome.trim().split(/\s+/)[0];
  }
  return 'Cliente';
}

/** Reexporta formatDate de calculos.ts com o nome usado nesta pasta. */
export function formatarData(dateStr: string): string {
  return formatDate(dateStr);
}

/** Calcula quantos dias faltam (positivo) ou já passaram (negativo) até a data informada (YYYY-MM-DD). */
export function calcularDiasRestantes(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const alvo = new Date(year, (month || 1) - 1, day || 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffMs = alvo.getTime() - hoje.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type TipoMensagemWhatsApp = 'COBRANCA' | 'LEMBRETE' | 'PAGO' | 'PROMISSORIA';

export interface TituloResumoMensagem {
  tipo: string;
  numero: number | string;
  vencimento: string;
  valor: number;
  pago?: boolean;
}

export interface GerarMensagemWhatsAppParams {
  tipo: TipoMensagemWhatsApp;
  cliente?: Partial<Cliente> | null;
  /** Lista de títulos incluídos na mensagem (cobrança, lembrete, promissória). */
  listaTitulos?: TituloResumoMensagem[];
  /** Total a cobrar/lembrar. Se omitido, é calculado a partir de listaTitulos. */
  total?: number;
  /** Nome da empresa exibido no cabeçalho da mensagem. */
  empresa?: string;
  /** Chave PIX opcional para incluir no final da mensagem. */
  pix?: { nome: string; chave: string };
  /** Campos usados no tipo PAGO. */
  dataPagamento?: string;
  formaPagamento?: string;
  valorPago?: number;
  recebidoPor?: string;
  creditoGerado?: number;
}

function formatarListaTitulos(lista: TituloResumoMensagem[]): string {
  return lista
    .map((t, i) => {
      const status = t.pago ? ' | ✅ PAGO' : '';
      return `${i + 1}. ${t.tipo} Nº ${t.numero} | Venc.: ${formatarData(t.vencimento)} | ${formatCurrency(t.valor)}${status}`;
    })
    .join('\n');
}

function calcularTotal(params: GerarMensagemWhatsAppParams): number {
  if (typeof params.total === 'number') return params.total;
  return (params.listaTitulos || []).reduce((soma, t) => soma + t.valor, 0);
}

function montarPixMsg(pix?: { nome: string; chave: string }): string {
  if (!pix) return '';
  return `\n\nChave PIX para pagamento:\n${pix.nome}: ${pix.chave}`;
}

/**
 * Gera o texto da mensagem de WhatsApp para os tipos suportados.
 * Usa o placeholder {nome} internamente, sempre substituído pelo apelido
 * (ou fallback) do cliente via obterNomeCliente().
 */
export function gerarMensagemWhatsApp(params: GerarMensagemWhatsAppParams): string {
  const nome = obterNomeCliente(params.cliente);
  const empresaHeader = params.empresa ? `*${params.empresa}*\n\n` : '';
  const listaTitulos = params.listaTitulos || [];
  const listaFormatada = listaTitulos.length ? formatarListaTitulos(listaTitulos) : '';
  const total = calcularTotal(params);
  const pixMsg = montarPixMsg(params.pix);

  let template = '';

  switch (params.tipo) {
    case 'COBRANCA': {
      template = listaTitulos.length > 1
        ? `{empresaHeader}Olá {nome}, identificamos os seguintes títulos em aberto:\n\n{listaFormatada}\n\n*Total: {total}*\n\nEntre em contato para regularizar.{pixMsg}`
        : `{empresaHeader}Olá {nome}, identificamos um título no valor de {total}${listaTitulos[0] ? ` com vencimento em ${formatarData(listaTitulos[0].vencimento)}` : ''}. Entre em contato para regularizar.{pixMsg}`;
      break;
    }
    case 'LEMBRETE': {
      const dias = listaTitulos[0] ? calcularDiasRestantes(listaTitulos[0].vencimento) : undefined;
      const quandoMsg = dias !== undefined
        ? (dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `vence em ${dias} dia(s)`)
        : 'está próximo do vencimento';
      template = listaTitulos.length > 1
        ? `{empresaHeader}⚠️ *Lembrete de Vencimento*\n\nOlá {nome}, você possui os seguintes títulos:\n\n{listaFormatada}\n\n*Total: {total}*{pixMsg}`
        : `{empresaHeader}⚠️ *Lembrete de Vencimento*\n\nOlá {nome}, seu título no valor de {total} ${quandoMsg}.{pixMsg}`;
      break;
    }
    case 'PAGO': {
      const creditoMsg = (params.creditoGerado && params.creditoGerado > 0)
        ? `\n\nObs. O valor pago a mais de ${formatCurrency(params.creditoGerado)} será abatido no valor do próximo mês.`
        : '';
      const tituloRef = listaTitulos[0]?.tipo || '';
      template = `{empresaHeader}Olá {nome}, recebemos seu pagamento${params.formaPagamento ? ` em ${params.formaPagamento}` : ''} no valor de ${formatCurrency(params.valorPago ?? total)}${tituloRef ? `, referente a/ao ${tituloRef}` : ''}${params.recebidoPor ? `, recebido por ${params.recebidoPor}` : ''}.${creditoMsg}\n\nAgradecemos a preferência!`;
      break;
    }
    case 'PROMISSORIA': {
      template = `{empresaHeader}Olá {nome}, segue a relação de suas notas promissórias:\n\n{listaFormatada}\n\n*Total: {total}*{pixMsg}`;
      break;
    }
    default:
      template = `{empresaHeader}Olá {nome}.`;
  }

  return template
    .replace(/\{empresaHeader\}/g, empresaHeader)
    .replace(/\{listaFormatada\}/g, listaFormatada)
    .replace(/\{total\}/g, formatCurrency(total))
    .replace(/\{pixMsg\}/g, pixMsg)
    .replace(/\{nome\}/g, nome);
}
