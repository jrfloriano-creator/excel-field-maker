import { TituloComCalculo, ChavePix, ProprietarioConfig } from '@/types/titulo';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate, formatPhone, getWhatsAppLink } from '@/lib/calculos';
import { MessageCircle, Trash2, CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { getContrastColor, darkenColor } from '@/lib/colors';

interface TituloCardProps {
  titulo: TituloComCalculo;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onEdit: (id: string) => void;
  chavesPix: ChavePix[];
  proprietarios: ProprietarioConfig[];
}

export function TituloCard({ titulo, onDelete, onPagar, onEdit, chavesPix, proprietarios }: TituloCardProps) {
  const [selectedPixId, setSelectedPixId] = useState<string>('');
  const selectedPix = chavesPix.find(p => p.id === selectedPixId);

  const propConfig = proprietarios.find(p => p.id === titulo.proprietario);
  const bgColor = propConfig?.cor || '#e5e7eb';
  const fgColor = getContrastColor(bgColor);
  const borderColor = darkenColor(bgColor, 40);

  return (
    <Card className="overflow-hidden border-2" style={{ backgroundColor: bgColor, color: fgColor, borderColor }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{titulo.cliente}</p>
            <p className="text-xs opacity-70">
              {titulo.tipo} • Nº {titulo.numero} • {propConfig?.nome || '—'}
            </p>
          </div>
          <StatusBadge situacao={titulo.situacao} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div>
            <p className="opacity-70 text-xs">Emissão</p>
            <p className="font-medium">{formatDate(titulo.dataEmissao)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Vencimento</p>
            <p className="font-medium">{formatDate(titulo.vencimento)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Valor</p>
            <p className="font-medium">{formatCurrency(titulo.valor)}</p>
          </div>
          {titulo.situacao === 'VENCIDO' && (
            <>
              <div>
                <p className="opacity-70 text-xs">Juros ({Math.abs(titulo.diasAVencer)}d)</p>
                <p className="font-medium">{formatCurrency(titulo.valorJuros)}</p>
              </div>
              <div className="col-span-2">
                <p className="opacity-70 text-xs">Valor Corrigido</p>
                <p className="font-semibold">{formatCurrency(titulo.valorCorrigido)}</p>
              </div>
            </>
          )}
          {titulo.situacao === 'PAGO' && titulo.dataPagamento && (
            <div>
              <p className="opacity-70 text-xs">Pago em</p>
              <p className="font-medium">{formatDate(titulo.dataPagamento)}</p>
            </div>
          )}
          {titulo.situacao === 'PAGO' && titulo.valorPago && (
            <div>
              <p className="opacity-70 text-xs">Valor Pago</p>
              <p className="font-medium">{formatCurrency(titulo.valorPago)}</p>
            </div>
          )}
          {titulo.situacao === 'PAGO' && titulo.recebidoPor && (
            <div className="col-span-2">
              <p className="opacity-70 text-xs">Recebido por</p>
              <p className="font-medium">{titulo.recebidoPor}</p>
            </div>
          )}
        </div>

        {titulo.telefone && (
          <p className="text-xs opacity-70 mt-2">📱 {formatPhone(titulo.telefone)}</p>
        )}

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
              <Button variant="outline" size="sm" className="w-full bg-card text-foreground">
                <MessageCircle className="h-4 w-4" />
                Cobrar
              </Button>
            </a>
          )}
          {titulo.situacao !== 'PAGO' && (
            <Button variant="outline" size="sm" className="flex-1 bg-card text-foreground" onClick={() => onPagar(titulo.id)}>
              <CreditCard className="h-4 w-4" />
              Pagar
            </Button>
          )}
          <Button variant="ghost" size="sm" className="bg-card/60 text-foreground hover:bg-card" onClick={() => onEdit(titulo.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="bg-card/60 text-destructive hover:bg-card hover:text-destructive" onClick={() => onDelete(titulo.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
