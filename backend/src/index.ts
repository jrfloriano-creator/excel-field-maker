import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  connectToWhatsApp,
  disconnectWhatsApp,
  getConnectionState,
  isConnected,
  whatsappEvents,
} from './whatsapp/client';
import {
  sendTextMessage,
  sendBatchMessages,
  verifyNumber,
} from './whatsapp/message';
import { ApiResponse, BatchMessageItem } from './types';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();

app.use(cors());
app.use(express.json());

function ok<T>(res: Response, data?: T) {
  const body: ApiResponse<T> = { success: true, data };
  res.json(body);
}

function fail(res: Response, error: string, statusCode = 400) {
  const body: ApiResponse = { success: false, error };
  res.status(statusCode).json(body);
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/status', (_req: Request, res: Response) => {
  ok(res, getConnectionState());
});

app.get('/qr', (_req: Request, res: Response) => {
  const state = getConnectionState();
  if (state.status === 'qr' && state.qrCode) {
    ok(res, { qrCode: state.qrCode });
  } else {
    fail(res, 'QR code nao disponivel no momento', 404);
  }
});

app.post('/connect', async (_req: Request, res: Response) => {
  try {
    await connectToWhatsApp();
    ok(res, getConnectionState());
  } catch (error) {
    fail(res, error instanceof Error ? error.message : 'Erro ao conectar', 500);
  }
});

app.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    await disconnectWhatsApp();
    ok(res, getConnectionState());
  } catch (error) {
    fail(res, error instanceof Error ? error.message : 'Erro ao desconectar', 500);
  }
});

app.post('/send', async (req: Request, res: Response) => {
  const { phone, message } = req.body ?? {};

  if (!phone || !message) {
    fail(res, 'Campos "phone" e "message" sao obrigatorios');
    return;
  }

  if (!isConnected()) {
    fail(res, 'WhatsApp nao esta conectado', 409);
    return;
  }

  const result = await sendTextMessage(phone, message);
  if (result.success) {
    ok(res, result);
  } else {
    fail(res, result.error ?? 'Erro ao enviar mensagem', 500);
  }
});

app.post('/send-batch', async (req: Request, res: Response) => {
  const { items, template } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    fail(res, 'Campo "items" deve ser um array nao vazio');
    return;
  }

  if (!isConnected()) {
    fail(res, 'WhatsApp nao esta conectado', 409);
    return;
  }

  const results = await sendBatchMessages(items as BatchMessageItem[], template);
  ok(res, results);
});

app.post('/verify', async (req: Request, res: Response) => {
  const { phone } = req.body ?? {};

  if (!phone) {
    fail(res, 'Campo "phone" e obrigatorio');
    return;
  }

  if (!isConnected()) {
    fail(res, 'WhatsApp nao esta conectado', 409);
    return;
  }

  try {
    const result = await verifyNumber(phone);
    ok(res, result);
  } catch (error) {
    fail(res, error instanceof Error ? error.message : 'Erro ao verificar numero', 500);
  }
});

app.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent(getConnectionState());

  const listener = (state: unknown) => sendEvent(state);
  whatsappEvents.on('state', listener);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    whatsappEvents.off('state', listener);
    res.end();
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`WhatsApp backend rodando na porta ${PORT}`);
  connectToWhatsApp().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Falha ao conectar automaticamente ao WhatsApp:', error);
  });
});

function gracefulShutdown() {
  // eslint-disable-next-line no-console
  console.log('\nEncerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
