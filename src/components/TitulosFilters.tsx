import { TituloComCalculo, ProprietarioConfig } from '@/types/titulo';
import { FiltroSituacao } from '@/hooks/useFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TitulosFiltersProps {
  filtro: FiltroSituacao;
  setFiltro: (f: FiltroSituacao) => void;
  titulosByMonth: TituloComCalculo[];
  proprietarioFilter?: string;
  setProprietarioFilter?: (v: string) => void;
  proprietarios?: ProprietarioConfig[];
}

export function TitulosFilters({
  filtro, setFiltro, titulosByMonth,
  proprietarioFilter = 'TODOS',
  setProprietarioFilter,
  proprietarios = [],
}: TitulosFiltersProps) {
  return (
    <div className="space-y-2 mb-2">
      {proprietarios.length > 0 && setProprietarioFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Proprietário:</span>
          <Select value={proprietarioFilter} onValueChange={setProprietarioFilter}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              {proprietarios.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
    </div>
  );
}
