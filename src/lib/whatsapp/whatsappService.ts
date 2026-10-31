import { toast } from 'sonner';
import { abrirWhatsApp } from '@/lib/whatsapp/whatsappLink';

export { linkWhatsApp, normalizarTelefoneBR, telefoneValido } from '@/lib/whatsapp/whatsappLink';

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  qrCode?: string;
  error?: string;
}

// Modo link direto (wa.me) - nao requer backend/QR
export const whatsappService = {
  async conectar() { return { success: false, error: 'Envio por link direto (wa.me). Nao e necessario conectar.' }; },
  async desconectar() { return { success: true }; },
  async resetarSessao() { return { success: true }; },
  async getStatus(): Promise<ConnectionStatus> { return { status: 'disconnected' }; },
  async enviarMensagem(_telefone: string, _mensagem: string) { return { success: false, error: 'Use o envio por link do WhatsApp.' }; },
  async enviarEmLote(_mensagens: Array<{ phoneNumber: string; message: string }>) {
    return { success: false, error: 'Use o envio por link do WhatsApp.' };
  },
  async verificarNumero(telefone: string) { return { exists: true, formattedNumber: telefone, jid: null as string | null }; },
  async iniciarEventStream() {},
  fecharEventStream() {},
  onStatusChange(_listener: (s: ConnectionStatus) => void): () => void { return () => {}; },
  onQRCode(_listener: (qr: string) => void): () => void { return () => {}; },
  removeListener(_listener: (s: ConnectionStatus) => void) {},
};

export async function enviarWhatsAppUnico(telefone: string, mensagem: string): Promise<boolean> {
  if (!telefone) {
    toast.error('Cliente sem telefone cadastrado.');
    return false;
  }
  try {
    const aberto = await abrirWhatsApp(telefone, mensagem);
    if (aberto) {
      toast.success('Conversa aberta no WhatsApp. Confira a mensagem e clique em Enviar.');
    }
    return aberto;
  } catch (error) {
    console.error('[whatsapp] Erro ao abrir WhatsApp:', error);
    toast.error('Nao foi possivel abrir o WhatsApp. Verifique o numero.');
    return false;
  }
}
