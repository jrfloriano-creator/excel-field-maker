import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { FormaPagamento, Maquininha } from '@/types/titulo';
import { formatCurrency } from '@/lib/calculos';
import { toast } from 'sonner';

interface PagarFormProps {
  clienteNome: string;
  valorOriginal: number;
  creditoDisponivel?: number;
  recebidoPor: string;
  formasPagamento?: FormaPagamento[];
  maquininhas?: Maquininha[];
  onSubmit: (data: {
    dataPagamento: string;
    valorPago: number;
    recebidoPor: string;
    formaPagamento?: string;
    maquininhaPagamento?: string;
    enviarWhats: boolean;
    creditoAplicado: number;
    creditoGerado: number;
  }) => void;
  onClose: () => void;
}

export function PagarForm({ clienteNome, valorOriginal, creditoDisponivel = 0, recebidoPor, formasPagamento = [], maquininhas = [], onSubmit, onClose }: PagarFormProps) {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState(valorOriginal.toString());
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [maquininhaId, setMaquininhaId] = useState('');
  const [enviarWhats, setEnviarWhats] = useState(true);
  const [usarCredito, setUsarCredito] = useState(creditoDisponivel > 0);

  const valorN = parseFloat(valorPago) || 0;
  const credito = usarCredito ? creditoDisponivel : 0;
  const totalRecebido = valorN + credito;
  const diferenca = totalRecebido - valorOriginal;
  const creditoGerado = diferenca > 0 ? diferenca : 0;

  const formaSel = formasPagamento.find(f => f.id === formaPagamentoId);
  const isPix = formaSel?.nome.toLowerCase().includes('pix') ?? false;
  const requireMaquininha = !!formaSel && !isPix;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    if (!forma) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    if (requireMaquininha && !maquininhaId) {
      toast.error('Selecione a maquininha utilizada para recebimento');
      return;
    }
    const maquininhaSel = maquininhas.find(m => m.id === maquininhaId);
    onSubmit({
      dataPagamento,
      valorPago: valorN,
      recebidoPor,
      formaPagamento: forma.nome,
      maquininhaPagamento: maquininhaSel?.nome,
      enviarWhats,
      creditoAplicado: credito,
      creditoGerado,
    });
  };

  return (
    <Card className="border-paid/20 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Registrar Recebimento</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">Cliente: <strong>{clienteNome}</strong></p>

        <div className="flex items-center gap-2 mb-3 p-2 rounded bg-secondary/50">
          <Checkbox id="whats" checked={enviarWhats} onCheckedChange={(c) => setEnviarWhats(!!c)} />
          <Label htmlFor="whats" className="text-xs cursor-pointer">
            📱 Enviar mensagem WhatsApp ao cliente após confirmar pagamento
          </Label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Data do Pagamento</Label>
            <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Valor do Título</Label>
            <Input value={formatCurrency(valorOriginal)} disabled />
          </div>
          {creditoDisponivel > 0 && (
            <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10">
              <Checkbox id="credito" checked={usarCredito} onCheckedChange={(c) => setUsarCredito(!!c)} />
              <Label htmlFor="credito" className="text-xs cursor-pointer">
                Aplicar crédito do mês anterior: <strong>{formatCurrency(creditoDisponivel)}</strong>
              </Label>
            </div>
          )}
          <div>
            <Label className="text-xs">Valor Pago</Label>
            <Input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Diferença</Label>
            <Input
              value={formatCurrency(diferenca)}
              disabled
              className={diferenca < 0 ? 'text-destructive font-semibold' : diferenca > 0 ? 'text-blue-600 font-semibold' : ''}
            />
            {diferenca > 0 && (
              <p className="text-[11px] text-blue-600 mt-1">
                💰 Crédito de {formatCurrency(diferenca)} será abatido no próximo mês.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento *</Label>
            <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
              <SelectTrigger>
                <SelectValue placeholder={formasPagamento.length === 0 ? 'Cadastre em Config › Financeiro' : 'Selecione a forma'} />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requireMaquininha && (
            <div>
              <Label className="text-xs">Maquininha *</Label>
              <Select value={maquininhaId} onValueChange={setMaquininhaId}>
                <SelectTrigger>
                  <SelectValue placeholder={maquininhas.length === 0 ? 'Cadastre em Config › Financeiro' : 'Selecione a maquininha'} />
                </SelectTrigger>
                <SelectContent>
                  {maquininhas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Recebido por</Label>
            <Input value={recebidoPor} disabled className="text-muted-foreground" />
          </div>
          <Button type="submit" className="w-full bg-paid hover:bg-paid/90 text-paid-foreground">Confirmar Recebimento</Button>
        </form>
      </CardContent>
    </Card>
  );
}
