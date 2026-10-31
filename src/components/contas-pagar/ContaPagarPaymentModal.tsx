// src/components/contas-pagar/ContaPagarPaymentModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ContaPagarComCalculo } from '@/types/titulo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, hojeLocal } from '@/lib/calculos';

interface ContaPagarPaymentModalProps {
  conta: ContaPagarComCalculo | null;
  config: AppConfig;
  onSubmit: (data: { paidAt: string; paidAmount: number; formaPagamentoId?: string; formaPagamentoNome?: string }) => void;
  onClose: () => void;
}

function diasDeAtraso(vencimento: string, paidAt: string): number {
  const venc = new Date(`${vencimento}T00:00:00`).getTime();
  const pago = new Date(`${paidAt}T00:00:00`).getTime();
  const dias = Math.round((pago - venc) / 86400000);
  return dias > 0 ? dias : 0;
}

export function ContaPagarPaymentModal({ conta, config, onSubmit, onClose }: ContaPagarPaymentModalProps) {
  // CORREÇÃO CRÍTICA: usa hojeLocal() em vez de new Date().toISOString().split('T')[0]
  const [paidAt, setPaidAt] = useState(hojeLocal());
  const [paidAmount, setPaidAmount] = useState(conta ? String(conta.valor) : '');
  const [formaPagamentoId, setFormaPagamentoId] = useState(conta?.formaPagamentoId || '');
  const [semJurosMulta, setSemJurosMulta] = useState(false);

  const formasAtivas = useMemo(
    () => ((config.contasPagar as any)?.formasPagamento || []).filter((item: any) => item.ativo),
    [config.contasPagar]
  );

  // CORREÇÃO: usa config.taxa (percentual, ex: 1 = 1% ao mês)
  const taxaMensal = config.taxa || 0;
  const multaConfig = config.contasPagar?.multa || 0;
  const diasAtraso = conta ? diasDeAtraso(conta.vencimento, paidAt) : 0;

  // CORREÇÃO CRÍTICA: taxa como percentual (1% = 1, não 0,01)
  const valorJuros = (!semJurosMulta && conta && diasAtraso > 0)
    ? Math.round(conta.valor * (taxaMensal / 30 / 100) * diasAtraso * 100) / 100
    : 0;
  // CORREÇÃO: multa também como percentual
  const valorMulta = (!semJurosMulta && conta && diasAtraso > 0)
    ? Math.round(conta.valor * (multaConfig / 100) * 100) / 100
    : 0;
  const valorSugerido = conta ? Math.round((conta.valor + valorJuros + valorMulta) * 100) / 100 : 0;

  // CORREÇÃO CRÍTICA: key={conta?.id} para resetar estado ao trocar de conta
  useEffect(() => {
    if (conta) {
      setPaidAmount(String(valorSugerido));
      setFormaPagamentoId(conta.formaPagamentoId || '');
      setSemJurosMulta(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidAt, semJurosMulta, conta?.id]);

  if (!conta) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const valor = parseFloat(paidAmount.replace(',', '.'));
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor pago válido.');
      return;
    }
    const forma = formasAtivas.find((item: any) => item.id === formaPagamentoId);
    onSubmit({
      paidAt,
      paidAmount: valor,
      formaPagamentoId: forma?.id,
      formaPagamentoNome: forma?.nome,
    });
  };

  return (
    <Card className="border-paid/20 shadow-lg" key={conta.id}>
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
          <div className="flex items-center gap-2">
            <Checkbox id="sem-juros-multa" checked={semJurosMulta} onCheckedChange={(checked) => setSemJurosMulta(checked === true)} />
            {/* CORREÇÃO: Rótulo correto (antes era "Receber", agora "Pagar") */}
            <Label htmlFor="sem-juros-multa" className="text-sm font-normal cursor-pointer">Pagar sem juros e multa</Label>
          </div>
          {diasAtraso > 0 && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
              <div>Dias em atraso: <strong>{diasAtraso}</strong></div>
              <div>Juros: <strong>{semJurosMulta ? formatCurrency(0) : formatCurrency(valorJuros)}</strong></div>
              <div>Multa: <strong>{semJurosMulta ? formatCurrency(0) : formatCurrency(valorMulta)}</strong></div>
              <div>Valor total sugerido: <strong>{formatCurrency(semJurosMulta ? conta.valor : valorSugerido)}</strong></div>
            </div>
          )}
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={formaPagamentoId || 'none'} onValueChange={value => setFormaPagamentoId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder={formasAtivas.length === 0 ? 'Cadastre em Configurações' : 'Selecione'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem forma informada</SelectItem>
                {formasAtivas.map((item: any) => (
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