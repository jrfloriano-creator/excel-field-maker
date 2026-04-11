import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Titulo } from '@/types/titulo';

interface TituloFormProps {
  onSubmit: (data: {
    tipo: string;
    cliente: string;
    telefone: string;
    vencimento: string;
    valor: number;
  }) => void;
  onClose: () => void;
  editData?: Titulo | null;
}

export function TituloForm({ onSubmit, onClose, editData }: TituloFormProps) {
  const [tipo, setTipo] = useState('PROMISSÓRIA');
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (editData) {
      setTipo(editData.tipo);
      setCliente(editData.cliente);
      setTelefone(editData.telefone);
      setVencimento(editData.vencimento);
      setValor(editData.valor.toString());
    }
  }, [editData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !vencimento || !valor) return;
    onSubmit({
      tipo,
      cliente: cliente.toUpperCase(),
      telefone,
      vencimento,
      valor: parseFloat(valor),
    });
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{editData ? 'Editar Título' : 'Novo Título'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROMISSÓRIA">Promissória</SelectItem>
                <SelectItem value="CADERNO">Caderno</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cliente *</Label>
            <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" required />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="11999999999" type="tel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vencimento *</Label>
              <Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required />
            </div>
          </div>
          <Button type="submit" className="w-full">{editData ? 'Salvar Alterações' : 'Adicionar Título'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
