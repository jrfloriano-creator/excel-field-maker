// backend/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import {
  connectToWhatsApp,
  getConnectionState,
  disconnectWhatsApp,
  resetSession,
  whatsappEvents,
  isConnected,
} from './whatsapp/client';
import {
  sendTextMessage,
  sendBatchMessages,
  verifyNumber,
  formatPhoneNumber,
} from './whatsapp/message';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_TOKEN = process.env.WHATSAPP_API_TOKEN || crypto.randomBytes(32).toString('hex');
console.log(`🔐 Token da API gerado: ${API_TOKEN.slice(0, 8)}...`);

// ✅ SEGURANÇA: rate limit simples por IP para endpoints que enviam mensagens
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.WHATSAPP_RATE_LIMIT_MAX || '50', 10);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || rec.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX) return false;
  rec.count += 1;
  return true;
}

const allowedOrigins = [
  'tauri://localhost',
  'http://localhost:8080',
  'http://localhost:1420',
  'http://127.0.0.1:8080',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`🚫 CORS bloqueou origem: ${origin}`);
      return callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`🚫 Requisição sem token de ${req.ip} para ${req.path}`);
    return res.status(401).json({ success: false, error: 'Token de autenticação ausente' });
  }
  const token = authHeader.slice(7);
  if (token !== API_TOKEN) {
    console.warn(`🚫 Token inválido de ${req.ip} para ${req.path}`);
    return res.status(403).json({ success: false, error: 'Token inválido' });
  }
  next();
}

app.get('/status', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, ...getConnectionState() });
});

app.get('/qr', authMiddleware, (req: Request, res: Response) => {
  const state = getConnectionState();
  if (state.status === 'qr' && state.qrCode) {
    res.json({ success: true, qrCode: state.qrCode });
  } else {
    res.json({ success: false, message: 'QR Code não disponível' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whatsapp: getConnectionState().status,
    connected: isConnected(),
  });
});

app.post('/connect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentState = getConnectionState();
    if (
      currentState.status === 'connected' ||
      currentState.status === 'connecting' ||
      currentState.status === 'qr'
    ) {
      return res.json({
        success: true,
        message: `Já está ${currentState.status}.`,
      });
    }
    await connectToWhatsApp();
    res.json({ success: true, message: 'Conectando ao WhatsApp...' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    await disconnectWhatsApp();
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ CORREÇÃO CRÍTICA: Rota /reset-session adicionada (resolve o erro de JSON)
app.post('/reset-session', authMiddleware, async (req: Request, res: Response) => {
  try {
    await resetSession();
    res.json({ success: true, message: 'Sessão reiniciada. Leia o novo QR Code.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios' });
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mensagem obrigatória' });
    }
    if (typeof phoneNumber !== 'string' || phoneNumber.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, error: 'Número de telefone inválido' });
    }
    if (!checkRateLimit(req.ip)) {
      return res.status(429).json({ success: false, error: 'Rate limit excedido' });
    }
    const result = await sendTextMessage(phoneNumber, message);
    if (result.success) {
      res.json({ success: true, messageId: result.messageId, message: 'Mensagem enviada com sucesso!' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de mensagens é obrigatória' });
    }
    if (!checkRateLimit(req.ip)) {
      return res.status(429).json({ success: false, error: 'Rate limit excedido' });
    }
    const results = await sendBatchMessages(messages);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    res.json({ success: true, total: results.length, successCount, failCount, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Número é obrigatório' });
    }
    const result = await verifyNumber(phoneNumber);
    res.json({
      success: true,
      phoneNumber,
      exists: result.exists,
      jid: result.jid,
      formattedNumber: formatPhoneNumber(phoneNumber),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/events', authMiddleware, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const state = getConnectionState();
  res.write(`data: ${JSON.stringify({ type: 'status', data: state })}\n\n`);

  const statusListener = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: 'status', data })}\n\n`);
  };
  const qrListener = (qrCode: string) => {
    res.write(`data: ${JSON.stringify({ type: 'qr', data: qrCode })}\n\n`);
  };

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  whatsappEvents.on('status', statusListener);
  whatsappEvents.on('qr', qrListener);
  req.on('close', () => {
    clearInterval(heartbeat);
    whatsappEvents.off('status', statusListener);
    whatsappEvents.off('qr', qrListener);
    res.end();
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Servidor WhatsApp rodando em 127.0.0.1:${PORT} (acesso local apenas)`);
  console.log(`📱 Status inicial: ${getConnectionState().status}`);
  console.log(`🔐 Token: ${API_TOKEN.slice(0, 8)}...`);
  console.log(`\n📋 Endpoints:`);
  console.log(`   [público] GET  /status, /qr, /events, /health`);
  console.log(`   🔒 POST /connect, /disconnect, /reset-session, /send, /send-batch, /verify\n`);
});

process.on('SIGINT', async () => {
  console.log('🔌 Encerrando servidor...');
  await disconnectWhatsApp();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔌 SIGTERM recebido, encerrando servidor...');
  await disconnectWhatsApp();
  process.exit(0);
});

export { API_TOKEN };