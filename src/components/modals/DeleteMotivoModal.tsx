import { MotivoDialog } from '@/components/MotivoDialog';
import { MotivoAlteracao } from '@/types/titulo';

interface DeleteMotivoModalProps {
  pendingDelete: { kind: 'titulo' | 'cliente' | 'conta-pagar'; id: string } | null;
  motivosAlteracao: MotivoAlteracao[];
  onConfirm: (motivo: string) => void;
  onClose: () => void;
}

export function DeleteMotivoModal({ pendingDelete, motivosAlteracao, onConfirm, onClose }: DeleteMotivoModalProps) {
  if (!pendingDelete) return null;
  return (
    <MotivoDialog
      acao={pendingDelete.kind === 'titulo' ? 'Excluindo título' : pendingDelete.kind === 'cliente' ? 'Excluindo cliente' : 'Excluindo conta a pagar'}
      motivos={motivosAlteracao}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
