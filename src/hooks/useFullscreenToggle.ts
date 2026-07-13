import { useEffect } from "react";

const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

/**
 * Registra o atalho F11 para alternar entre modo fullscreen (sobrepondo a
 * barra de tarefas do Windows) e janela normal. O usuário ainda pode
 * pressionar a tecla Windows para acessar a barra de tarefas temporariamente.
 */
export function useFullscreenToggle() {
  useEffect(() => {
    if (!isTauri()) return;

    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key !== "F11") return;
      event.preventDefault();
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const isFullscreen = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!isFullscreen);
      } catch (e) {
        console.error("Falha ao alternar fullscreen:", e);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
