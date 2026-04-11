import { TituloComCalculo, ChavePix } from '@/types/titulo';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate, formatPhone, getWhatsAppLink } from '@/lib/calculos';
import { MessageCircle, Trash2, CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface TituloCardProps {
  titulo: TituloComCalculo;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onEdit: (id: string) => void;
  chavesPix: ChavePix[];
}

export function TituloCard({ titulo, onDelete, onPagar, onEdit, chavesPix }: TituloCardProps) {
  const [selectedPixId, setSelectedPixId] = useState<string>('');

  const selectedPix = chavesPix.find(p => p.id === selectedPixId);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{titulo.cliente}</p>
            <p className="text-xs text-muted-foreground">{titulo.tipo} • Nº {titulo.numero}</p>
          </div>
          <StatusBadge situacao={titulo.situacao} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Vencimento</p>
            <p className="font-medium">{formatDate(titulo.vencimento)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Valor</p>
            <p className="font-medium">{formatCurrency(titulo.valor)}</p>
          </div>
          {titulo.situacao === 'VENCIDO' && (
            <>
              <div>
                <p className="text-muted-foreground text-xs">Juros ({Math.abs(titulo.diasAVencer)}d)</p>
                <p className="font-medium text-overdue">{formatCurrency(titulo.valorJuros)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor Corrigido</p>
                <p className="font-semibold text-overdue">{formatCurrency(titulo.valorCorrigido)}</p>
              </div>
            </>
          )}
          {titulo.situacao === 'PAGO' && titulo.dataPagamento && (
            <div>
              <p className="text-muted-foreground text-xs">Pago em</p>
              <p className="font-medium text-paid">{formatDate(titulo.dataPagamento)}</p>
            </div>
          )}
          {titulo.situacao === 'PAGO' && titulo.valorPago && (
            <div>
              <p className="text-muted-foreground text-xs">Valor Pago</p>
              <p className="font-medium text-paid">{formatCurrency(titulo.valorPago)}</p>
            </div>
          )}
        </div>

        {titulo.telefone && (
          <p className="text-xs text-muted-foreground mt-2">📱 {formatPhone(titulo.telefone)}</p>
        )}

        {/* PIX selection for overdue titles */}
        {titulo.situacao === 'VENCIDO' && titulo.telefone && chavesPix.length > 0 && (
          <div className="mt-2">
            <Select value={selectedPixId} onValueChange={setSelectedPixId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecionar Chave PIX (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem PIX</SelectItem>
                {chavesPix.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}: {p.chave}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {titulo.telefone && titulo.situacao === 'VENCIDO' && (
            <a
              href={getWhatsAppLink(
                titulo.telefone,
                titulo.cliente,
                titulo.valorCorrigido,
                titulo.vencimento,
                selectedPix && selectedPixId !== 'none' ? selectedPix : undefined
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full text-paid border-paid/30 hover:bg-paid/10">
                <MessageCircle className="h-4 w-4" />
                Cobrar
              </Button>
            </a>
          )}
          {titulo.situacao !== 'PAGO' && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onPagar(titulo.id)}>
              <CreditCard className="h-4 w-4" />
              Pagar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(titulo.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(titulo.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
