import { TituloForm } from '@/components/TituloForm';
import { AppConfig, Titulo } from '@/types/titulo';
import { SessionUser } from '@/lib/auth';

interface TituloFormModalProps {
  show: boolean;
  editData: Titulo | null;
  config: AppConfig;
  user: SessionUser;
  onSubmit: (data: any, motivo?: string) => void;
  onClose: () => void;
}

export function TituloFormModal({ show, editData, config, user, onSubmit, onClose }: TituloFormModalProps) {
  if (!show) return null;
  return (
    <TituloForm
      onSubmit={onSubmit}
      onClose={onClose}
      editData={editData}
      clientes={config.clientes}
      proprietarios={config.proprietarios}
      config={config}
      user={user}
    />
  );
}
