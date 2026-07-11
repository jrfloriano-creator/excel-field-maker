import { getSocket, isConnected } from './client';
import { SendMessageResult, BatchMessageResult } from '../types';

const DELAY = parseInt(process.env.DELAY_BETWEEN_MESSAGES || '2000');
const MAX_PER_HOUR = parseInt(process.env.MAX_MESSAGES_PER_HOUR || '50');

export function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  if (!cleaned.includes('@')) {
    cleaned = `${cleaned}@s.whatsapp.net`;
  }
  return cleaned;
}

export async function sendTextMessage(
  phoneNumber: string,
  message: string
): Promise<SendMessageResult> {
  try {
    if (!isConnected()) {
      return { success: false, error: 'WhatsApp não está conectado' };
    }
    const sock = getSocket();
    if (!sock) {
      return { success: false, error: 'Socket não disponível' };
    }
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const result = await sock.sendMessage(formattedNumber, { text: message });
    console.log(`✅ Mensagem enviada para ${phoneNumber}`);
    return { success: true, messageId: result?.key?.id ?? undefined };
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return { success: false, error: error.message || 'Erro ao enviar mensagem' };
  }
}

export async function sendBatchMessages(
  messages: Array<{ phoneNumber: string; message: string }>
): Promise<BatchMessageResult[]> {
  const results: BatchMessageResult[] = [];
  let sent = 0;
  for (const { phoneNumber, message } of messages) {
    if (sent >= MAX_PER_HOUR) {
      results.push({ phoneNumber, success: false, error: 'Limite de mensagens por hora excedido' });
      continue;
    }
    const result = await sendTextMessage(phoneNumber, message);
    results.push({ phoneNumber, success: result.success, error: result.error });
    sent++;
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
  return results;
}

export async function verifyNumber(phoneNumber: string): Promise<{ exists: boolean; jid: string | null }> {
  try {
    const sock = getSocket();
    if (!sock || !isConnected()) {
      return { exists: false, jid: null };
    }
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const result = await sock.onWhatsApp(formattedNumber);
    if (result && result.length > 0 && result[0].exists) {
      return { exists: true, jid: result[0].jid };
    }
    return { exists: false, jid: null };
  } catch (error) {
    console.error('Erro ao verificar número:', error);
    return { exists: false, jid: null };
  }
}

export function renderTemplate(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return result;
}
