// src/hooks/use-mobile.tsx
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// ============================================================
// CORREÇÃO CRÍTICA: useIsMobile agora retorna o valor correto
// no primeiro render.
// Antes: começava com undefined, retornava false no 1º render,
// causando flicker em layouts responsivos.
// Agora: inicializa com o valor real de window.innerWidth.
// ============================================================
export function useIsMobile() {
  // CORREÇÃO: inicializa com valor real (não undefined)
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // CORREÇÃO: sincroniza estado inicial (caso tenha mudado entre render e effect)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}