import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface PagarFormProps {
  clienteNome: string;
  valorOriginal: number;
  onSubmit: (data: { dataPagamento: string; valorPago: number }) => void;
  onClose: () => void;
}

export function PagarForm({ clienteNome, valorOriginal, onSubmit, onClose }: PagarFormProps) {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState(valorOriginal.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ dataPagamento, valorPago: parseFloat(valorPago) });
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
          <Button type="submit" className="w-full bg-paid hover:bg-paid/90 text-paid-foreground">Confirmar Pagamento</Button>
        </form>
      </CardContent>
    </Card>
  );
}
