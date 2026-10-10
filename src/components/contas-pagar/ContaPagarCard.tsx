import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculos';
import { ContaPagar } from '@/types/titulo';
import { Edit, Trash2, CheckCircle, ArrowLeftRight, Calendar, DollarSign } from 'lucide-react';

interface ContaPagarCardProps {
  conta: ContaPagar;
  config: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onReverter: (id: string) => void;
}

export function ContaPagarCard({ conta, config, onEdit, onDelete, onPagar, onReverter }: ContaPagarCardProps) {
  const getStatusColor = (status: ContaPagar['status']) => {
    switch (status) {
      case 'PAGO': return 'border-l-4 border-l-green-500 bg-green-50/50';
      case 'VENCIDO': return 'border-l-4 border-l-red-500 bg-red-50/50';
      case 'PENDENTE': return 'border-l-4 border-l-amber-500 bg-amber-50/50';
      case 'CANCELADO': return 'border-l-4 border-l-gray-400 bg-gray-50/50';
      default: return 'border-l-4 border-l-gray-300';
    }
  };

  const getStatusBadge = (status: ContaPagar['status']) => {
    const estilos = {
      PAGO: 'bg-green-100 text-green-800',
      VENCIDO: 'bg-red-100 text-red-800',
      PENDENTE: 'bg-amber-100 text-amber-800',
      CANCELADO: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estilos[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <Card className={`${getStatusColor(conta.status)} shadow-sm`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {conta.numeroParcelas && conta.numeroParcelas > 1 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">
                  Parcela
                </span>
              )}
              {conta.descricao}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {conta.favorecido} • {conta.categoria}
              {conta.tipoTitulo && <span className="ml-2">📝 {conta.tipoTitulo}</span>}
            </p>
          </div>
          {getStatusBadge(conta.status)}
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {conta.vencimento.split('-').reverse().join('/')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-bold text-emerald-600 flex items-center justify-end gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(conta.valor)}
            </p>
            {conta.valorTotal && conta.numeroParcelas && conta.numeroParcelas > 1 && (
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(conta.valorTotal)} • {conta.numeroParcelas}x
              </p>
            )}
          </div>
        </div>

        {conta.numeroCheque && (
          <p className="text-xs mt-2 text-muted-foreground">
            📋 Cheque: {conta.numeroCheque} — {conta.banco || 'Banco não informado'}
          </p>
        )}
        {conta.bandeiraCartao && (
          <p className="text-xs mt-2 text-muted-foreground">
            💳 {conta.bandeiraCartao} — {conta.emissorCartao || 'Emissor não informado'}
          </p>
        )}
        {conta.recorrente && (
          <p className="text-xs mt-2 text-blue-600 font-medium">
            🔄 Despesa Recorrente {conta.vigenciaMeses ? `• ${conta.vigenciaMeses} meses` : ''}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 flex flex-wrap gap-1 justify-end">
        {conta.status === 'PENDENTE' || conta.status === 'VENCIDO' ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => onPagar(conta.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
              <CheckCircle className="h-4 w-4 mr-1" />
              Pagar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(conta.id)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(conta.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : conta.status === 'PAGO' ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => onReverter(conta.id)} className="text-amber-600">
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Reverter Baixa
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(conta.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(conta.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}