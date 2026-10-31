// backend/src/whatsapp/client.ts
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
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

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let isConnecting = false;

function getReconnectDelay(attempt: number): number {
  const baseDelay = 2000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 32000);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

function limparPastaDeSessao(sessionDir: string): void {
  try {
    if (fs.existsSync(sessionDir)) {
      console.log(`🧹 Limpando pasta de sessão: ${sessionDir}`);
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        const filePath = path.join(sessionDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn(`⚠️ Não foi possível deletar ${filePath}:`, e);
        }
      }
      console.log('✅ Pasta de sessão limpa com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar pasta de sessão:', error);
  }
}

async function encerrarSocketAnterior(): Promise<void> {
  if (socket) {
    console.log('🔌 Encerrando socket anterior...');
    try {
      socket.end(undefined);
    } catch (e) {
      console.warn('⚠️ Erro ao encerrar socket anterior:', e);
    }
    socket = null;
  }
}

export async function connectToWhatsApp(): Promise<WASocket | null> {
  if (isConnecting) {
    console.log('⏸️ Já existe uma conexão em andamento.');
    return socket;
  }
  isConnecting = true;

  try {
    await encerrarSocketAnterior();

    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './auth_info';

    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      if (files.length < 3) {
        console.log(`⚠️ Pasta de sessão corrompida (${files.length} arquivos). Limpando...`);
        limparPastaDeSessao(sessionDir);
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      auth: state,
      version,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      // ✅ CORREÇÃO CRÍTICA: Fingerprint realista para evitar bloqueio do WhatsApp
      browser: ['Windows', 'Chrome', '120.0.6099.109'],
      logger: pino({ level: 'warn' }),
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
        console.log('📱 QR Code gerado! Escaneie nos próximos 60 segundos.');
        reconnectAttempts = 0;
      }

      if (connection === 'open') {
        wasConnected = true;
        reconnectAttempts = 0;
        connectionState = { status: 'connected' };
        whatsappEvents.emit('status', connectionState);
        console.log('✅ Conectado ao WhatsApp com sucesso!');
        isConnecting = false;
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const restartRequired = statusCode === DisconnectReason.restartRequired;

        console.log(`⏸️ Conexão fechada. Código: ${statusCode}`);
        console.log(`⏸️ Motivo:`, lastDisconnect?.error?.message || 'Desconhecido');

        if (loggedOut) {
          console.log('⚠️ Sessão encerrada pelo WhatsApp (401). Limpando pasta...');
          limparPastaDeSessao(sessionDir);
          wasConnected = false;
          isConnecting = false;
          connectionState = { status: 'disconnected', error: 'Sessão encerrada pelo WhatsApp' };
          whatsappEvents.emit('status', connectionState);
          return;
        }

        if (restartRequired) {
          console.log('🔄 WhatsApp pediu restart (515). Reconectando...');
          reconnectAttempts = 0;
          setTimeout(() => {
            connectToWhatsApp().catch(console.error);
          }, 1000);
          return;
        }

        if (statusCode === 440) {
          console.log('⚠️ Conexão substituída (440).');
          wasConnected = false;
          isConnecting = false;
          connectionState = { status: 'disconnected', error: 'Conexão substituída' };
          whatsappEvents.emit('status', connectionState);
          return;
        }

        const shouldReconnect = wasConnected && process.env.AUTO_RECONNECT !== 'false';

        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay(reconnectAttempts);
          reconnectAttempts++;
          connectionState = { status: 'connecting' };
          whatsappEvents.emit('status', connectionState);
          console.log(`🔄 Reconectando em ${(delay / 1000).toFixed(1)}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(() => {
            connectToWhatsApp().catch(console.error);
          }, delay);
        } else {
          if (!wasConnected) {
            console.log('⏸️ Nenhuma sessão válida foi estabelecida.');
          } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(`❌ Máximo de tentativas atingido.`);
          } else {
            console.log('❌ Desconectado permanentemente');
          }
          wasConnected = false;
          isConnecting = false;
          connectionState = { status: 'disconnected', error: 'Desconectado' };
          whatsappEvents.emit('status', connectionState);
        }
      }
    });

    return socket;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    isConnecting = false;
    connectionState = { status: 'disconnected', error: String(error) };
    whatsappEvents.emit('status', connectionState);
    throw error;
  }
}

// ✅ CORREÇÃO CRÍTICA: Função resetSession adicionada
export async function resetSession(): Promise<void> {
  console.log('🔄 Reiniciando sessão do WhatsApp...');
  if (socket) {
    try {
      socket.end(undefined);
    } catch (e) {
      console.warn('⚠️ Erro ao encerrar socket durante reset:', e);
    }
    socket = null;
  }
  wasConnected = false;
  isConnecting = false;
  reconnectAttempts = 0;
  connectionState = { status: 'disconnected' };
  whatsappEvents.emit('status', connectionState);

  const sessionDir = process.env.WHATSAPP_SESSION_DIR || './auth_info';
  limparPastaDeSessao(sessionDir);
  console.log('✅ Sessão reiniciada. Aguardando /connect para novo QR Code.');
}

export function getSocket(): WASocket | null {
  return socket;
}

export function getConnectionState(): ConnectionState {
  return connectionState;
}

export async function disconnectWhatsApp() {
  isConnecting = false;
  reconnectAttempts = 0;
  if (socket) {
    try {
      socket.end(undefined);
    } catch (e) {
      console.warn('⚠️ Erro ao encerrar socket:', e);
    }
    socket = null;
    wasConnected = false;
    connectionState = { status: 'disconnected' };
    whatsappEvents.emit('status', connectionState);
    console.log('🔌 Desconectado do WhatsApp');
  }
  
  const sessionDir = process.env.WHATSAPP_SESSION_DIR || './auth_info';
  limparPastaDeSessao(sessionDir);
}

export function isConnected(): boolean {
  return connectionState.status === 'connected' && socket !== null;
}