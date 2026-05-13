import { TituloCard } from '@/components/TituloCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TituloComCalculo, AppConfig } from '@/types/titulo';

interface TitulosTableProps {
  titulosFiltrados: TituloComCalculo[];
  config: AppConfig;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onAddNew: () => void;
}

export function TitulosTable({ titulosFiltrados, config, onEdit, onDelete, onPagar, onAddNew }: TitulosTableProps) {
  if (titulosFiltrados.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-2">📋</p>
        <p>Nenhum título encontrado</p>
        <Button className="mt-4" onClick={onAddNew}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {titulosFiltrados.map(t => (
        <TituloCard
          key={t.id}
          titulo={t}
          onDelete={onDelete}
          onPagar={onPagar}
          onEdit={onEdit}
          chavesPix={config.chavesPix}
          proprietarios={config.proprietarios}
          clientes={config.clientes}
        />
      ))}
    </div>
  );
}
