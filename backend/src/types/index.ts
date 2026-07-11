export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  qrCode?: string;
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BatchMessageResult {
  phoneNumber: string;
  success: boolean;
  error?: string;
}
