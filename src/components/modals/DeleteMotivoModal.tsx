// src/components/modals/DeleteMotivoModal.tsx
import { MotivoDialog } from '@/components/MotivoDialog';

// CORREÇÃO CRÍTICA: Tipo alinhado com string[] (não MotivoAlteracao[])
interface DeleteMotivoModalProps {
  pendingDelete: { kind: 'titulo' | 'cliente' | 'conta-pagar'; id: string } | null;
  motivosAlteracao: string[]; // CORREÇÃO: era MotivoAlteracao[]
  onConfirm: (motivo: string) => void;
  onClose: () => void;
}

export function DeleteMotivoModal({ pendingDelete, motivosAlteracao, onConfirm, onClose }: DeleteMotivoModalProps) {
  if (!pendingDelete) return null;
  return (
    <MotivoDialog
      acao={
        pendingDelete.kind === 'titulo'
          ? 'Excluindo título'
          : pendingDelete.kind === 'cliente'
          ? 'Excluindo cliente'
          : 'Excluindo conta a pagar'
      }
      // CORREÇÃO CRÍTICA: prop correta é motivos (não motivosAlteracao)
      // O MotivoDialog espera 'motivos', não 'motivosAlteracao'
      motivos={motivosAlteracao}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}