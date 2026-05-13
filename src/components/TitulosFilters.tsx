import { TituloComCalculo } from '@/types/titulo';
import { FiltroSituacao } from '@/hooks/useFilters';

interface TitulosFiltersProps {
  filtro: FiltroSituacao;
  setFiltro: (f: FiltroSituacao) => void;
  titulosByMonth: TituloComCalculo[];
}

export function TitulosFilters({ filtro, setFiltro, titulosByMonth }: TitulosFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {(['TODOS', 'VENCIDO', 'NO PRAZO', 'PAGO'] as const).map(f => (
        <button key={f} onClick={() => setFiltro(f)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${filtro === f ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'}`}>
          {f === 'TODOS' ? `Todos (${titulosByMonth.length})` :
           f === 'VENCIDO' ? `Vencidos (${titulosByMonth.filter(t => t.situacao === 'VENCIDO').length})` :
           f === 'NO PRAZO' ? `No Prazo (${titulosByMonth.filter(t => t.situacao === 'NO PRAZO').length})` :
           `Pagos (${titulosByMonth.filter(t => t.situacao === 'PAGO').length})`}
        </button>
      ))}
    </div>
  );
}
