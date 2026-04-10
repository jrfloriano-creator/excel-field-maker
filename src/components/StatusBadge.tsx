import { Situacao } from '@/types/titulo';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  situacao: Situacao;
  className?: string;
}

export function StatusBadge({ situacao, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
        situacao === 'VENCIDO' && 'bg-overdue text-overdue-foreground',
        situacao === 'NO PRAZO' && 'bg-ontime text-ontime-foreground',
        situacao === 'PAGO' && 'bg-paid text-paid-foreground',
        className
      )}
    >
      {situacao === 'VENCIDO' && '⚠️ '}
      {situacao === 'PAGO' && '✅ '}
      {situacao === 'NO PRAZO' && '⏳ '}
      {situacao}
    </span>
  );
}
