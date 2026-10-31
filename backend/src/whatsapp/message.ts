// backend/src/whatsapp/message.ts
import { getSocket, isConnected } from './client';

// ✅ CORREÇÃO CRÍTICA: Fila com janela real de 1 hora
let messagesSentThisHour = 0;
let hourWindowStart = Date.now();
const MAX_PER_HOUR = parseInt(process.env.MAX_MESSAGES_PER_HOUR || '50');
const HOUR_WINDOW_MS = 60 * 60 * 1000;

function checkHourWindow(): void {
  const now = Date.now();
  if (now - hourWindowStart >= HOUR_WINDOW_MS) {
    messagesSentThisHour = 0;
    hourWindowStart = now;
    console.log('🔄 Janela de 1h resetada.');
  }
}

// ✅ CORREÇÃO CRÍTICA: Delay aleatório (3-8s)
function getRandomDelay(): number {
  return Math.floor(Math.random() * 5000) + 3000;
}

let jobCounter = 0;
function generateJobId(): string {
  jobCounter++;
  return `job_${Date.now()}_${jobCounter}`;
}

// ✅ CORREÇÃO CRÍTICA: NÃO adiciona @s.whatsapp.net manualmente
// O Baileys faz isso automaticamente
export function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    // mantém
  } else if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

export async function sendTextMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const jobId = generateJobId();

  try {
    checkHourWindow();

    if (messagesSentThisHour >= MAX_PER_HOUR) {
      console.warn(`🚫 [${jobId}] Limite de ${MAX_PER_HOUR} mensagens/hora atingido`);
      return { success: false, error: `Limite de ${MAX_PER_HOUR} mensagens por hora atingido` };
    }

    if (!isConnected()) {
      return { success: false, error: 'WhatsApp não está conectado' };
    }

    const sock = getSocket();
    if (!sock) {
      return { success: false, error: 'Socket não disponível' };
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);

    // ✅ CORREÇÃO CRÍTICA: Valida com onWhatsApp antes de enviar
    console.log(`🔍 [${jobId}] Verificando número ${formattedNumber}...`);
    const onWhatsAppResult = await sock.onWhatsApp(formattedNumber);

    if (!onWhatsAppResult || onWhatsAppResult.length === 0 || !onWhatsAppResult[0].exists) {
      console.warn(`❌ [${jobId}] Número ${phoneNumber} não existe no WhatsApp`);
      return { success: false, error: `O número ${phoneNumber} não está registrado no WhatsApp` };
    }

    // ✅ CORREÇÃO: Usa o JID retornado pelo onWhatsApp
    const jid = onWhatsAppResult[0].jid;
    console.log(`📤 [${jobId}] Enviando mensagem para ${jid}...`);
    const result = await sock.sendMessage(jid, { text: message });

    messagesSentThisHour++;
    console.log(`✅ [${jobId}] Mensagem enviada (${messagesSentThisHour}/${MAX_PER_HOUR})`);

    return { success: true, messageId: result?.key?.id ?? undefined };
  } catch (error: any) {
    console.error(`❌ [${jobId}] Erro ao enviar:`, error);
    return { success: false, error: error.message || 'Erro ao enviar mensagem' };
  }
}

export async function sendBatchMessages(
  messages: Array<{ phoneNumber: string; message: string }>
): Promise<Array<{ phoneNumber: string; success: boolean; error?: string }>> {
  const jobId = generateJobId();
  const results: Array<{ phoneNumber: string; success: boolean; error?: string }> = [];

  console.log(`📦 [${jobId}] Iniciando envio em lote de ${messages.length} mensagens...`);

  for (let i = 0; i < messages.length; i++) {
    const { phoneNumber, message } = messages[i];

    checkHourWindow();

    if (messagesSentThisHour >= MAX_PER_HOUR) {
      results.push({ phoneNumber, success: false, error: `Limite de ${MAX_PER_HOUR} mensagens/hora atingido` });
      continue;
    }

    const result = await sendTextMessage(phoneNumber, message);
    results.push({ phoneNumber, success: result.success, error: result.error });

    // ✅ CORREÇÃO CRÍTICA: Delay aleatório entre mensagens
    if (i < messages.length - 1) {
      const delay = getRandomDelay();
      console.log(`⏳ [${jobId}] Aguardando ${(delay / 1000).toFixed(1)}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`📊 [${jobId}] Lote concluído: ${successCount}/${messages.length} enviadas`);

  return results;
}

export async function verifyNumber(
  phoneNumber: string
): Promise<{ exists: boolean; jid: string | null }> {
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