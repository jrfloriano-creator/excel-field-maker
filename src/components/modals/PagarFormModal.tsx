import { PagarForm } from '@/components/PagarForm';
import { TituloComCalculo, AppConfig } from '@/types/titulo';

interface PagarFormModalProps {
  pagarId: string | null;
  titulo: TituloComCalculo | null;
  creditoCliente: number;
  config: AppConfig;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export function PagarFormModal({ pagarId, titulo, creditoCliente, config, onSubmit, onClose }: PagarFormModalProps) {
  if (!pagarId || !titulo) return null;
  return (
    <PagarForm
      clienteNome={titulo.cliente}
      valorOriginal={titulo.valorCorrigido}
      creditoDisponivel={Math.max(0, creditoCliente)}
      funcionarios={config.funcionarios}
      formasPagamento={config.formasPagamento || []}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
