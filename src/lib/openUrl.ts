/**
 * openExternalUrl — abre URL externa de forma compatível com Tauri v2 e web.
 *
 * No Tauri v2, usamos um comando Rust customizado 'open_external_url' que
 * chama cmd /c start no Windows (confiável, sempre funciona).
 * Em browser/PWA, cai para window.open como fallback.
 */
import { invoke } from '@tauri-apps/api/core';

export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const isTauri = '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    try {
      await invoke('open_external_url', { url });
      return;
    } catch (e) {
      console.error('[openExternalUrl] Rust command falhou:', e);
      // Prossegue para fallback
    }
  }

  // Fallback PWA/browser: window.open padrão
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    // Fallback final: cria <a> temporário e clica (evita popup blocker)
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
  }
}
