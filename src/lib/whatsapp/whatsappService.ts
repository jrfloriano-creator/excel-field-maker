/**
 * whatsappService.ts — Cliente HTTP/SSE singleton para o backend WhatsApp (Fase 1).
 *
 * Encapsula toda a comunicação com o backend Express+Baileys (porta 3001 por
 * padrão), expondo métodos de alto nível para conectar, desconectar, enviar
 * mensagens (unitárias e em lote), verificar números e acompanhar o status
 * de conexão/QR Code via Server-Sent Events (SSE).
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr';

export interface ConnectionState {
  status: ConnectionStatus;
  qrCode?: string;
  phoneNumber?: string;
  connectedAt?: string;
  lastError?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BatchMessageItem {
  phone: string;
  message: string;
  variables?: Record<string, string>;
}

export interface BatchMessageResult {
  phone: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface VerifyNumberResult {
  phone: string;
  exists: boolean;
  jid?: string;
}

type StatusListener = (state: ConnectionState) => void;
type QRCodeListener = (qrCode: string) => void;

const BACKEND_URL: string =
  (import.meta.env.VITE_WHATSAPP_BACKEND_URL as string | undefined) || 'http://localhost:3001';

/**
 * Serviço singleton de integração com o backend WhatsApp.
 * Use a instância exportada `whatsappService` — não instancie diretamente.
 */
class WhatsAppService {
  private eventSource: EventSource | null = null;
  private statusListeners: Set<StatusListener> = new Set();
  private qrListeners: Set<QRCodeListener> = new Set();
  private lastState: ConnectionState | null = null;

  private get baseUrl(): string {
    return BACKEND_URL;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const body: ApiResponse<T> = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || `Erro na requisição ao backend WhatsApp (${res.status})`);
    }
    return body.data as T;
  }

  /** Inicia a conexão com o WhatsApp (irá gerar QR Code se necessário). */
  async conectar(): Promise<ConnectionState> {
    return this.request<ConnectionState>('/connect', { method: 'POST' });
  }

  /** Desconecta a sessão atual do WhatsApp. */
  async desconectar(): Promise<ConnectionState> {
    return this.request<ConnectionState>('/disconnect', { method: 'POST' });
  }

  /** Retorna o estado atual da conexão (status, qrCode, telefone, etc.). */
  async getStatus(): Promise<ConnectionState> {
    return this.request<ConnectionState>('/status', { method: 'GET' });
  }

  /** Envia uma mensagem de texto para um único número. */
  async enviarMensagem(phone: string, message: string): Promise<SendResult> {
    return this.request<SendResult>('/send', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    });
  }

  /** Envia mensagens em lote (um item por cliente/telefone). */
  async enviarEmLote(messages: BatchMessageItem[]): Promise<BatchMessageResult[]> {
    return this.request<BatchMessageResult[]>('/send-batch', {
      method: 'POST',
      body: JSON.stringify({ items: messages }),
    });
  }

  /** Verifica se um número possui WhatsApp ativo. */
  async verificarNumero(phone: string): Promise<VerifyNumberResult> {
    return this.request<VerifyNumberResult>('/verify', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  /**
   * Abre o stream SSE (/events) para acompanhar mudanças de status/QR Code
   * em tempo real. Chame `onStatusChange`/`onQRCode` para escutar eventos e
   * `fecharEventStream()` para encerrar quando não for mais necessário.
   */
  iniciarEventStream(): void {
    if (this.eventSource) return;

    this.eventSource = new EventSource(`${this.baseUrl}/events`);

    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const state: ConnectionState = JSON.parse(event.data);
        this.lastState = state;
        this.statusListeners.forEach((listener) => listener(state));
        if (state.status === 'qr' && state.qrCode) {
          this.qrListeners.forEach((listener) => listener(state.qrCode as string));
        }
      } catch (e) {
        console.warn('[whatsappService] Falha ao processar evento SSE', e);
      }
    };

    this.eventSource.onerror = () => {
      // EventSource tenta reconectar automaticamente; nada a fazer aqui.
    };
  }

  /** Encerra o stream SSE ativo, se houver. */
  fecharEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /** Registra um listener para mudanças de status de conexão. Retorna função de cleanup. */
  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    if (this.lastState) listener(this.lastState);
    return () => this.statusListeners.delete(listener);
  }

  /** Registra um listener para quando um novo QR Code for emitido. Retorna função de cleanup. */
  onQRCode(listener: QRCodeListener): () => void {
    this.qrListeners.add(listener);
    if (this.lastState?.status === 'qr' && this.lastState.qrCode) {
      listener(this.lastState.qrCode);
    }
    return () => this.qrListeners.delete(listener);
  }
}

export const whatsappService = new WhatsAppService();
