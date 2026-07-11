import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { 
  connectToWhatsApp, 
  getConnectionState, 
  disconnectWhatsApp, 
  whatsappEvents,
  isConnected
} from './whatsapp/client';
import { 
  sendTextMessage, 
  sendBatchMessages, 
  verifyNumber,
  formatPhoneNumber
} from './whatsapp/message';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/status', (req: Request, res: Response) => {
  const state = getConnectionState();
  res.json({ success: true, ...state });
});

app.get('/qr', (req: Request, res: Response) => {
  const state = getConnectionState();
  if (state.status === 'qr' && state.qrCode) {
    res.json({ success: true, qrCode: state.qrCode });
  } else {
    res.json({ success: false, message: 'QR Code não disponível' });
  }
});

app.post('/connect', async (req: Request, res: Response) => {
  try {
    await connectToWhatsApp();
    res.json({ success: true, message: 'Conectando ao WhatsApp...' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/disconnect', async (req: Request, res: Response) => {
  try {
    await disconnectWhatsApp();
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios' });
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

app.post('/send-batch', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de mensagens é obrigatória' });
    }
    const results = await sendBatchMessages(messages);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    res.json({ success: true, total: results.length, successCount, failCount, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/verify', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Número é obrigatório' });
    }
    const result = await verifyNumber(phoneNumber);
    res.json({ success: true, phoneNumber, exists: result.exists, jid: result.jid, formattedNumber: formatPhoneNumber(phoneNumber) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/events', (req: Request, res: Response) => {
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
  whatsappEvents.on('status', statusListener);
  whatsappEvents.on('qr', qrListener);
  req.on('close', () => {
    whatsappEvents.off('status', statusListener);
    whatsappEvents.off('qr', qrListener);
    res.end();
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whatsapp: getConnectionState().status,
    connected: isConnected()
  });
});

connectToWhatsApp().catch(console.error);

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 Status: ${getConnectionState().status}`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`\n📋 Endpoints disponíveis:`);
  console.log(`   GET  /status     - Status da conexão`);
  console.log(`   GET  /qr         - QR Code (se disponível)`);
  console.log(`   POST /connect    - Conectar ao WhatsApp`);
  console.log(`   POST /disconnect - Desconectar`);
  console.log(`   POST /send       - Enviar mensagem`);
  console.log(`   POST /send-batch - Enviar em lote`);
  console.log(`   POST /verify     - Verificar número`);
  console.log(`   GET  /events     - Eventos em tempo real`);
  console.log(`   GET  /health     - Health check\n`);
});

process.on('SIGINT', async () => {
  console.log('🔌 Encerrando servidor...');
  await disconnectWhatsApp();
  process.exit(0);
});
