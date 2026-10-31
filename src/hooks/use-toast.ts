// src/hooks/use-toast.ts
// ============================================================
// CORREÇÃO CRÍTICA: Este arquivo foi DESATIVADO.
// O sistema agora usa exclusivamente 'sonner' para toasts.
// Este arquivo mantido apenas para compatibilidade com imports
// legados, mas não deve ser usado em código novo.
// ============================================================

// CORREÇÃO: export vazio para não quebrar imports existentes
export function useToast() {
  console.warn('[use-toast] Este hook foi descontinuado. Use "import { toast } from sonner" em vez disso.');
  return {
    toasts: [],
    toast: () => {
      console.warn('[use-toast] toast() descontinuado. Use sonner.');
    },
    dismiss: () => {
      console.warn('[use-toast] dismiss() descontinuado. Use sonner.');
    },
  };
}

export function toast(props: any) {
  console.warn('[use-toast] toast() descontinuado. Use sonner.', props);
}