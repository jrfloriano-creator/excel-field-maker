import { toast } from 'sonner';
import { openExternalUrl } from '@/lib/openUrl';

const LIMITE_URL = 7500;
const CHAVE_MODO = 'zoom_whatsapp_modo';

/** 'web' = navegador (abre uma aba por envio) | 'app' = WhatsApp Desktop (reaproveita a janela) */
export type ModoWhatsApp = 'web' | 'app';

export function getModoWhatsApp(): ModoWhatsApp {
  try { return localStorage.getItem(CHAVE_MODO) === 'app' ? 'app' : 'web'; } catch { return 'web'; }
}
export function setModoWhatsApp(modo: ModoWhatsApp): void {
  try { localStorage.setItem(CHAVE_MODO, modo); } catch { /* ignora */ }
}

export function normalizarTelefoneBR(telefone: string | undefined | null): string | null {
  if (!telefone) return null;
  let digits = telefone.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith('55')) return null;
  if (digits.length !== 12 && digits.length !== 13) return null;
  return digits;
}
export function telefoneValido(telefone: string | undefined | null): boolean {
  return normalizarTelefoneBR(telefone) !== null;
}

export function linkWhatsApp(telefone: string, mensagem?: string): string | null {
  const numero = normalizarTelefoneBR(telefone);
  if (!numero) return null;
  const base = `https://wa.me/${numero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
export function linkWhatsAppApp(telefone: string, mensagem?: string): string | null {
  const numero = normalizarTelefoneBR(telefone);
  if (!numero) return null;
  const base = `whatsapp://send?phone=${numero}`;
  return mensagem ? `${base}&text=${encodeURIComponent(mensagem)}` : base;
}

async function copiar(texto: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

// ✅ CORREÇÃO: guarda anti-loop — impede reabrir a mesma conversa rapidamente
//    (ex: loop infinito de abas no navegador ao clicar em enviar cobrança).
const ultimaAberturaPorTelefone = new Map<string, number>();
const INTERVALO_ANTI_LOOP_MS = 8000;

export async function abrirWhatsApp(telefone: string, mensagem: string, modoForcado?: ModoWhatsApp): Promise<boolean> {
  if (!telefoneValido(telefone)) {
    toast.error('Telefone inválido ou ausente. Use DDD + número (ex.: 11 99999-9999).');
    return false;
  }
  const modo = modoForcado ?? getModoWhatsApp();
  const link = modo === 'app' ? linkWhatsAppApp : linkWhatsApp;
  const url = link(telefone, mensagem) as string;
  const chave = normalizarTelefoneBR(telefone) as string;
  const agora = Date.now();
  const ultima = ultimaAberturaPorTelefone.get(chave) ?? 0;
  if (agora - ultima < INTERVALO_ANTI_LOOP_MS) {
    // Evita reentrada/loop de abertura da mesma conversa em sequência curta
    return false;
  }
  ultimaAberturaPorTelefone.set(chave, agora);

  const temPix = /000201|BR\.GOV\.BCB\.PIX|Chave PIX|chave.*pix/i.test(mensagem);
  // ✅ CORREÇÃO: envia via link wa.me sempre que a URL com a mensagem cabe no limite.
  // A mensagem (que inclui a chave PIX quando houver) vai no parâmetro "text" do link,
  // garantindo que o PIX seja enviado junto com a mensagem clicável no envio.
  if (url.length > LIMITE_URL) {
    const ok = await copiar(mensagem);
    // ✅ Abre o link COMPLETO (com a mensagem no parâmetro text) — não abre sem a mensagem
    await openExternalUrl(url, { forcarBrowser: true });
    toast.message(ok
      ? 'Mensagem com a chave PIX copiada. Abra a conversa e cole o texto manualmente para enviar.'
      : 'Mensagem longa: abra a conversa e cole o texto manualmente.');
    return true;
  }

  if (modo === 'app') {
    await copiar(mensagem);
    await openExternalUrl(url);
    toast.message('Aberto no WhatsApp Desktop. Se o texto não aparecer, cole com Ctrl+V (já copiado).', {
      action: { label: 'Usar navegador', onClick: () => setModoWhatsApp('web') },
    });
    return true;
  }

  // Modo Web (padrão): abre o WhatsApp Web com a mensagem via link (wa.me -> web.whatsapp.com).
  // ✅ NOTA: forçamos window.open (forcarBrowser) — dentro do Tauri o comando via invoke
  //    (opener) vinha falhando (IPC/shell), e o window.open é quem abre a aba com sucesso.
  //    A mensagem (tabela + PIX) vai no parâmetro "text" do link wa.me.
  await openExternalUrl(url, { forcarBrowser: true });
  return true;
}