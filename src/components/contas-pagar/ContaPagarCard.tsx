import { AppConfig, ContaPagarComCalculo } from '@/types/titulo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/calculos';
import { CreditCard, Pencil, RotateCcw, Trash2 } from 'lucide-react';

interface ContaPagarCardProps {
  conta: ContaPagarComCalculo;
  config: AppConfig;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onReverter: (id: string) => void;
}

const STATUS_LABELS = {
  PENDENTE: 'Pendente',
  VENCIDO: 'Vencido',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
} as const;

const STATUS_CLASSES = {
  PENDENTE: 'bg-slate-100 text-slate-700 border-slate-200',
  VENCIDO: 'bg-red-100 text-red-700 border-red-200',
  PAGO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELADO: 'bg-zinc-100 text-zinc-700 border-zinc-200',
} as const;

export function ContaPagarCard({ conta, onEdit, onDelete, onPagar, onReverter }: ContaPagarCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{conta.descricao}</p>
            <p className="text-xs text-muted-foreground truncate">
              #{conta.numero} • {conta.favorecido} • {conta.categoria}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_CLASSES[conta.status]}>
            {STATUS_LABELS[conta.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <p className="font-medium">{formatDate(conta.vencimento)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-medium">{formatCurrency(conta.valor)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Competência</p>
            <p className="font-medium">{conta.competencia || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Centro de custo</p>
            <p className="font-medium truncate">{conta.centroCustoNome || '—'}</p>
          </div>
        </div>

        {conta.status === 'PAGO' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Pago em</p>
              <p className="font-medium">{conta.paidAt ? formatDate(conta.paidAt) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor pago</p>
              <p className="font-medium">{formatCurrency(conta.paidAmount || conta.valor)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forma</p>
              <p className="font-medium truncate">{conta.formaPagamentoNome || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reversão</p>
              <p className="font-medium truncate">{conta.reversalReason || '—'}</p>
            </div>
          </div>
        )}

        {conta.observacoes && (
          <div>
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-sm whitespace-pre-wrap">{conta.observacoes}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {conta.status !== 'PAGO' ? (
            <Button variant="outline" size="sm" className="flex-1 min-w-[120px]" onClick={() => onPagar(conta.id)}>
              <CreditCard className="h-4 w-4 mr-1" />
              Baixar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 min-w-[120px]" onClick={() => onReverter(conta.id)}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reverter baixa
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(conta.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(conta.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}