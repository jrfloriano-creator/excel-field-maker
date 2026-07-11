import { getSocket, isConnected } from './client';
import {
  BatchMessageItem,
  BatchMessageResult,
  SendResult,
  VerifyNumberResult,
} from '../types';

const MAX_MESSAGES_PER_HOUR = 50;
const BATCH_DELAY_MS = 2000;

let hourWindowStart = Date.now();
let messagesSentInWindow = 0;

function checkRateLimit(): void {
  const now = Date.now();
  if (now - hourWindowStart >= 60 * 60 * 1000) {
    hourWindowStart = now;
    messagesSentInWindow = 0;
  }
}

function registerSentMessage(): void {
  checkRateLimit();
  messagesSentInWindow += 1;
}

function isRateLimited(): boolean {
  checkRateLimit();
  return messagesSentInWindow >= MAX_MESSAGES_PER_HOUR;
}

/**
 * Formata um numero de telefone brasileiro para o formato JID do WhatsApp.
 * Aceita numeros com ou sem DDI, com ou sem caracteres nao numericos.
 */
export function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  if (!digits) {
    throw new Error('Numero de telefone invalido');
  }

  // Remove zeros a esquerda (comuns em discagem local)
  digits = digits.replace(/^0+/, '');

  // Se ja possui o codigo do pais (55) com tamanho compativel, mantem.
  // Numeros BR: DDD (2) + numero (8 ou 9) => 10 ou 11 digitos sem DDI.
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  } else if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) {
      digits = `55${digits}`;
    }
  } else if (!digits.startsWith('55')) {
    digits = `55${digits}`;
  }

  return `${digits}@s.whatsapp.net`;
}

export async function sendTextMessage(phone: string, message: string): Promise<SendResult> {
  if (!isConnected()) {
    return { success: false, error: 'WhatsApp nao esta conectado' };
  }

  if (isRateLimited()) {
    return { success: false, error: 'Limite de mensagens por hora atingido (50/h)' };
  }

  const sock = getSocket();
  if (!sock) {
    return { success: false, error: 'Socket do WhatsApp indisponivel' };
  }

  try {
    const jid = formatPhoneNumber(phone);
    const result = await sock.sendMessage(jid, { text: message });
    registerSentMessage();
    return { success: true, messageId: result?.key?.id ?? undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export function renderTemplate(template: string, variables: Record<string, string> = {}): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : '';
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendBatchMessages(
  items: BatchMessageItem[],
  template?: string,
): Promise<BatchMessageResult[]> {
  const results: BatchMessageResult[] = [];

  for (const item of items) {
    if (isRateLimited()) {
      results.push({
        phone: item.phone,
        success: false,
        error: 'Limite de mensagens por hora atingido (50/h)',
      });
      continue;
    }

    const message = template
      ? renderTemplate(template, item.variables ?? {})
      : item.message;

    const result = await sendTextMessage(item.phone, message);

    results.push({
      phone: item.phone,
      success: result.success,
      error: result.error,
      messageId: result.messageId,
    });

    if (items.indexOf(item) < items.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}

export async function verifyNumber(phone: string): Promise<VerifyNumberResult> {
  if (!isConnected()) {
    throw new Error('WhatsApp nao esta conectado');
  }

  const sock = getSocket();
  if (!sock) {
    throw new Error('Socket do WhatsApp indisponivel');
  }

  const jid = formatPhoneNumber(phone);
  const results = await sock.onWhatsApp(jid);
  const result = results?.[0];

  return {
    phone,
    exists: !!result?.exists,
    jid: result?.jid,
  };
}
