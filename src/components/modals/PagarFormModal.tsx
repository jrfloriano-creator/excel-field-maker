import { PagarForm } from '@/components/PagarForm';
import { TituloComCalculo, AppConfig } from '@/types/titulo';

interface PagarFormModalProps {
  pagarId: string | null;
  titulo: TituloComCalculo | null;
  creditoCliente: number;
  config: AppConfig;
  onSubmit: (data: any) => void;
  onClose: () => void;
  onMigratePin?: (funcionarioId: string, newHash: string) => void;
}

export function PagarFormModal({ pagarId, titulo, creditoCliente, config, onSubmit, onClose, onMigratePin }: PagarFormModalProps) {
  if (!pagarId || !titulo) return null;
  return (
    <PagarForm
      clienteNome={titulo.cliente}
      valorOriginal={titulo.valorCorrigido}
      creditoDisponivel={Math.max(0, creditoCliente)}
      funcionarios={config.funcionarios}
      formasPagamento={config.formasPagamento || []}
      maquininhas={config.maquininhas || []}
      onSubmit={onSubmit}
      onClose={onClose}
      onMigratePin={onMigratePin}
    />
  );
}
