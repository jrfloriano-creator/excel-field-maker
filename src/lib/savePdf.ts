/**
 * savePdf — salva o PDF no caminho configurado (Tauri) ou faz download (browser).
 * openFolder — abre a pasta no explorador de arquivos (Tauri) ou exibe toast (browser).
 */
import jsPDF from 'jspdf';
import { toast } from 'sonner';

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

export async function savePdf(
  pdf: jsPDF,
  filename: string,
  caminhoSalvarDados?: string,
): Promise<void> {
  if (isTauriEnv() && caminhoSalvarDados) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const arrayBuffer = pdf.output('arraybuffer');
      const data = Array.from(new Uint8Array(arrayBuffer));
      const sep = caminhoSalvarDados.includes('\\') ? '\\' : '/';
      const fullPath = caminhoSalvarDados.replace(/[\\/]$/, '') + sep + filename;
      await invoke('write_bytes_to_file', { path: fullPath, data });
      toast.success(`PDF salvo em: ${fullPath}`);
      return;
    } catch (err) {
      console.warn('[savePdf] falha ao salvar via Tauri, usando download padrão', err);
      toast.warning('Não foi possível salvar no caminho configurado. Baixando normalmente.');
    }
  }
  pdf.save(filename);
}

export async function openFolder(path?: string): Promise<void> {
  if (!path) {
    toast.warning('Nenhuma pasta configurada em Configurações > Sistema > Pasta para Salvar Dados');
    return;
  }
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_folder', { path });
      return;
    } catch (err) {
      console.warn('[openFolder] falha ao abrir pasta via Tauri', err);
    }
  }
  toast.info(`Pasta configurada: ${path}`);
}
