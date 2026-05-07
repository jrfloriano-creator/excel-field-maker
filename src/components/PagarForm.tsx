import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { Funcionario, FormaPagamento } from '@/types/titulo';
import { verifyPin } from '@/lib/storage';
import { toast } from 'sonner';

interface PagarFormProps {
  clienteNome: string;
  valorOriginal: number;
  funcionarios: Funcionario[];
  formasPagamento?: FormaPagamento[];
  onSubmit: (data: { dataPagamento: string; valorPago: number; recebidoPor: string; formaPagamento?: string }) => void;
  onClose: () => void;
}

export function PagarForm({ clienteNome, valorOriginal, funcionarios, formasPagamento = [], onSubmit, onClose }: PagarFormProps) {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState(valorOriginal.toString());
  const [funcionarioId, setFuncionarioId] = useState('');
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (funcionarios.length === 0) {
      toast.error('Cadastre um funcionário em Configurações antes de receber títulos');
      return;
    }
    const func = funcionarios.find(f => f.id === funcionarioId);
    if (!func) {
      toast.error('Selecione o funcionário que recebeu');
      return;
    }
    if (pin.length !== 4 || !verifyPin(pin, func.pin)) {
      toast.error('Senha do funcionário incorreta');
      return;
    }
    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    onSubmit({
      dataPagamento,
      valorPago: parseFloat(valorPago),
      recebidoPor: func.nome,
      formaPagamento: forma?.nome,
    });
  };

  return (
    <Card className="border-paid/20 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Registrar Pagamento</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">Cliente: <strong>{clienteNome}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Data do Pagamento</Label>
            <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Valor Pago</Label>
            <Input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Recebido por *</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger>
                <SelectValue placeholder={funcionarios.length === 0 ? 'Nenhum funcionário cadastrado' : 'Selecione o funcionário'} />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
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
          <div>
            <Label className="text-xs">Senha do funcionário (4 dígitos) *</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="text-center text-xl tracking-[0.5em]"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-paid hover:bg-paid/90 text-paid-foreground">Confirmar Pagamento</Button>
        </form>
      </CardContent>
    </Card>
  );
}
