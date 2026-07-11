export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr';

export interface ConnectionState {
  status: ConnectionStatus;
  qrCode?: string;
  phoneNumber?: string;
  connectedAt?: string;
  lastError?: string;
}

export interface SendMessagePayload {
  phone: string;
  message: string;
}

export interface BatchMessageItem {
  phone: string;
  message: string;
  variables?: Record<string, string>;
}

export interface BatchMessagePayload {
  items: BatchMessageItem[];
  template?: string;
}

export interface BatchMessageResult {
  phone: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerifyNumberPayload {
  phone: string;
}

export interface VerifyNumberResult {
  phone: string;
  exists: boolean;
  jid?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
