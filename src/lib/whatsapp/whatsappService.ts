import { Cliente } from '@/types/cliente';
import { Titulo } from '@/types/titulo';

const BACKEND_URL = import.meta.env.VITE_WHATSAPP_BACKEND_URL || 'http://localhost:3001';

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  qrCode?: string;
  error?: string;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private eventSource: EventSource | null = null;
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private qrListeners: ((qrCode: string) => void)[] = [];

  static getInstance(): WhatsAppService {
    if (!this.instance) {
      this.instance = new WhatsAppService();
    }
    return this.instance;
  }

  async conectar(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao conectar' };
    }
  }

  async desconectar(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao desconectar' };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${BACKEND_URL}/status`);
      return await response.json();
    } catch (error) {
      return { status: 'disconnected', error: String(error) };
    }
  }

  async enviarMensagem(phoneNumber: string, message: string): Promise<SendMessageResponse> {
    try {
      const cleaned = phoneNumber.replace(/\D/g, '');
      const response = await fetch(`${BACKEND_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned, message })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao enviar mensagem' };
    }
  }

  async enviarEmLote(messages: Array<{ phoneNumber: string; message: string }>): Promise<any> {
    try {
      const formatted = messages.map(m => ({
        phoneNumber: m.phoneNumber.replace(/\D/g, ''),
        message: m.message
      }));
      
      const response = await fetch(`${BACKEND_URL}/send-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formatted })
      });
      
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao enviar mensagens em lote' };
    }
  }

  async verificarNumero(phoneNumber: string): Promise<{ exists: boolean; formattedNumber: string; jid: string | null }> {
    try {
      const cleaned = phoneNumber.replace(/\D/g, '');
      const response = await fetch(`${BACKEND_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned })
      });
      return await response.json();
    } catch (error) {
      return { exists: false, formattedNumber: phoneNumber, jid: null };
    }
  }

  iniciarEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${BACKEND_URL}/events`);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status') {
          this.statusListeners.forEach(listener => listener(data.data));
        }
        if (data.type === 'qr') {
          this.qrListeners.forEach(listener => listener(data.data));
        }
      } catch (error) {
        console.error('Erro ao processar evento:', error);
      }
    };

    this.eventSource.onerror = () => {
      setTimeout(() => this.iniciarEventStream(), 5000);
    };
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): void {
    this.statusListeners.push(listener);
  }

  onQRCode(listener: (qrCode: string) => void): void {
    this.qrListeners.push(listener);
  }

  removeListener(listener: (status: ConnectionStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  fecharEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const whatsappService = WhatsAppService.getInstance();
