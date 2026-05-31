import { PagarForm } from '@/components/PagarForm';
import { TituloComCalculo, AppConfig } from '@/types/titulo';
import { SessionUser } from '@/lib/auth';

interface PagarFormModalProps {
  pagarId: string | null;
  titulo: TituloComCalculo | null;
  creditoCliente: number;
  config: AppConfig;
  user: SessionUser | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export function PagarFormModal({ pagarId, titulo, creditoCliente, config, user, onSubmit, onClose }: PagarFormModalProps) {
  if (!pagarId || !titulo) return null;
  return (
    <PagarForm
      clienteNome={titulo.cliente}
      valorOriginal={titulo.valorCorrigido}
      creditoDisponivel={Math.max(0, creditoCliente)}
      recebidoPor={user?.nome ?? ''}
      formasPagamento={config.formasPagamento || []}
      maquininhas={config.maquininhas || []}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
