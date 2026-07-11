import path from 'path';
import { EventEmitter } from 'events';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  ConnectionState as BaileysConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import { ConnectionState } from '../types';

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'auth_info');
const BROWSER_NAME = 'Controle Financeiro ZOOM';

const logger = pino({ level: 'silent' });

export const whatsappEvents = new EventEmitter();

let sock: WASocket | undefined;

let connectionState: ConnectionState = {
  status: 'disconnected',
};

function updateState(partial: Partial<ConnectionState>) {
  connectionState = { ...connectionState, ...partial };
  whatsappEvents.emit('state', connectionState);
}

export function getConnectionState(): ConnectionState {
  return connectionState;
}

export function getSocket(): WASocket | undefined {
  return sock;
}

export function isConnected(): boolean {
  return connectionState.status === 'connected' && !!sock;
}

export async function connectToWhatsApp(): Promise<void> {
  if (connectionState.status === 'connecting' || connectionState.status === 'connected') {
    return;
  }

  updateState({ status: 'connecting', qrCode: undefined, lastError: undefined });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    logger,
    browser: [BROWSER_NAME, 'Chrome', '1.0.0'],
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: Partial<BaileysConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcodeTerminal.generate(qr, { small: true });
      updateState({ status: 'qr', qrCode: qr });
    }

    if (connection === 'open') {
      const phoneNumber = sock?.user?.id?.split(':')[0];
      updateState({
        status: 'connected',
        qrCode: undefined,
        phoneNumber,
        connectedAt: new Date().toISOString(),
        lastError: undefined,
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      updateState({
        status: 'disconnected',
        qrCode: undefined,
        lastError: lastDisconnect?.error?.message,
      });

      if (!loggedOut) {
        setTimeout(() => {
          connectToWhatsApp().catch((err) => {
            updateState({ status: 'disconnected', lastError: err?.message });
          });
        }, 2000);
      } else {
        sock = undefined;
      }
    }
  });
}

export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // ignore logout errors, socket may already be closed
    }
    sock = undefined;
  }
  updateState({ status: 'disconnected', qrCode: undefined, phoneNumber: undefined });
}
