import { useMemo, useState } from 'react';
import { AppConfig, ContaPagarComCalculo } from '@/types/titulo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculos';

interface ContaPagarPaymentModalProps {
  conta: ContaPagarComCalculo | null;
  config: AppConfig;
  onSubmit: (data: { paidAt: string; paidAmount: number; formaPagamentoId?: string; formaPagamentoNome?: string }) => void;
  onClose: () => void;
}

export function ContaPagarPaymentModal({ conta, config, onSubmit, onClose }: ContaPagarPaymentModalProps) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(conta ? String(conta.valor) : '');
  const [formaPagamentoId, setFormaPagamentoId] = useState(conta?.formaPagamentoId || '');

  const formasAtivas = useMemo(
    () => (config.contasPagar?.formasPagamento || []).filter(item => item.ativo),
    [config.contasPagar?.formasPagamento]
  );

  if (!conta) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const valor = parseFloat(paidAmount.replace(',', '.'));
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor pago válido.');
      return;
    }
    const forma = formasAtivas.find(item => item.id === formaPagamentoId);
    onSubmit({
      paidAt,
      paidAmount: valor,
      formaPagamentoId: forma?.id,
      formaPagamentoNome: forma?.nome,
    });
  };

  return (
    <Card className="border-paid/20 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Baixar conta a pagar</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Favorecido: <strong>{conta.favorecido}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Valor original</Label>
            <Input value={formatCurrency(conta.valor)} disabled />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data do pagamento *</Label>
              <Input type="date" value={paidAt} onChange={event => setPaidAt(event.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Valor pago *</Label>
              <Input type="number" step="0.01" min="0" value={paidAmount} onChange={event => setPaidAmount(event.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={formaPagamentoId || 'none'} onValueChange={value => setFormaPagamentoId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder={formasAtivas.length === 0 ? 'Cadastre em Configurações' : 'Selecione'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem forma informada</SelectItem>
                {formasAtivas.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full bg-paid hover:bg-paid/90 text-paid-foreground">Confirmar baixa</Button>
        </form>
      </CardContent>
    </Card>
  );
}