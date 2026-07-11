import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import pino from 'pino';

export const whatsappEvents = new EventEmitter();

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  qrCode?: string;
  error?: string;
}

let connectionState: ConnectionState = { status: 'disconnected' };
let socket: WASocket | null = null;
let wasConnected = false;

export async function connectToWhatsApp(): Promise<WASocket> {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      process.env.WHATSAPP_SESSION_DIR || './auth_info'
    );
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      auth: state,
      version,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      browser: ['Controle Financeiro ZOOM', 'Chrome', '120.0.0.0'],
      logger: pino({ level: 'silent' })
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'connecting') {
        connectionState = { status: 'connecting' };
        whatsappEvents.emit('status', connectionState);
        console.log('🔄 Conectando ao WhatsApp...');
      }

      if (qr) {
        connectionState = { status: 'qr', qrCode: qr };
        whatsappEvents.emit('status', connectionState);
        whatsappEvents.emit('qr', qr);
        console.log('📱 QR Code gerado!');
      }

      if (connection === 'open') {
        wasConnected = true;
        connectionState = { status: 'connected' };
        whatsappEvents.emit('status', connectionState);
        console.log('✅ Conectado ao WhatsApp com sucesso!');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = wasConnected && !loggedOut;

        if (shouldReconnect && process.env.AUTO_RECONNECT !== 'false') {
          connectionState = { status: 'connecting' };
          whatsappEvents.emit('status', connectionState);
          console.log('🔄 Reconectando em 5 segundos...');
          setTimeout(() => connectToWhatsApp(), 5000);
        } else {
          if (!wasConnected) {
            console.log('⏸️ Nenhuma sessão válida foi estabelecida. Aguardando nova chamada a /connect.');
          } else {
            console.log('❌ Desconectado permanentemente');
          }
          wasConnected = false;
          connectionState = { status: 'disconnected', error: loggedOut ? 'Sessão encerrada' : 'Desconectado' };
          whatsappEvents.emit('status', connectionState);
        }
      }
    });

    return socket;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    connectionState = { status: 'disconnected', error: String(error) };
    whatsappEvents.emit('status', connectionState);
    throw error;
  }
}

export function getSocket(): WASocket | null {
  return socket;
}

export function getConnectionState(): ConnectionState {
  return connectionState;
}

export async function disconnectWhatsApp() {
  if (socket) {
    await socket.ws?.close();
    socket = null;
    wasConnected = false;
    connectionState = { status: 'disconnected' };
    whatsappEvents.emit('status', connectionState);
    console.log('🔌 Desconectado do WhatsApp');
  }
}

export function isConnected(): boolean {
  return connectionState.status === 'connected' && socket !== null;
}
