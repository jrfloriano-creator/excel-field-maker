/**
 * openExternalUrl — abre URL externa de forma compatível com Tauri v2 e web.
 *
 * No Tauri v2, usamos um comando Rust customizado 'open_external_url' que
 * chama o opener do sistema (confiável, sempre funciona).
 * Em browser/PWA, cai para window.open como fallback.
 */
import { invoke } from '@tauri-apps/api/core';

// ✅ CORREÇÃO: guarda de abas abertas — impede que a mesma URL seja aberta
//    rapidamente em sequência (loop infinito de abas no navegador).
const abasAbertas = new Map<string, number>();

function podeAbrir(url: string): boolean {
  const agora = Date.now();
  const ultima = abasAbertas.get(url) ?? 0;
  if (agora - ultima < 3000) return false; // já abriu esta mesma URL há menos de 3s
  abasAbertas.set(url, agora);
  return true;
}

export async function openExternalUrl(url: string, opts?: { forcarBrowser?: boolean }): Promise<void> {
  if (typeof window === 'undefined') return;

  // ✅ CORREÇÃO: guarda de abas abertas — evita loop infinito de abertura
  //    de novas abas com a mesma URL.
  if (!podeAbrir(url)) return;

  const isTauri = '__TAURI_INTERNALS__' in window;

  // ✅ CORREÇÃO: forcar abertura via browser (window.open) — usada nos envios
  //    WhatsApp Web para não depender do opener do Tauri (que estava falhando).
  if (!opts?.forcarBrowser && isTauri) {
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
    // ✅ Remove só depois (1s) para não cancelar a abertura da nova aba
    setTimeout(() => { try { a.remove(); } catch { /* noop */ } }, 1000);
  }
}
