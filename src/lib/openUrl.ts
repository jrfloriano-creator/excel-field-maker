/**
 * openExternalUrl — abre URL externa de forma compatível com Tauri v2 e web.
 *
 * No Tauri v2, window.open() pode ser bloqueado ou redirecionar para um
 * novo webview em vez do navegador do sistema. Este utilitário usa
 * @tauri-apps/plugin-opener (openUrl) quando disponível e cai para
 * window.open/anchor como fallback para PWA/browser.
 *
 * Para que o opener funcione no Tauri produção:
 *  - Cargo.toml: tauri-plugin-opener = "2"
 *  - main.rs: .plugin(tauri_plugin_opener::init())
 *  - capabilities/default.json: "opener:allow-open-url"
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const isTauri = '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    // Tauri v2: usa plugin-opener.openUrl para abrir no navegador padrão do sistema
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opener = await import('@tauri-apps/plugin-opener' as any);
      // A API correta do plugin-opener é openUrl(), não open()
      if (typeof opener.openUrl === 'function') {
        await opener.openUrl(url);
        return;
      }
      // Fallback para versões mais antigas que expõem open()
      if (typeof opener.open === 'function') {
        await opener.open(url);
        return;
      }
    } catch {
      // Plugin não disponível ou falhou — tenta shell
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
