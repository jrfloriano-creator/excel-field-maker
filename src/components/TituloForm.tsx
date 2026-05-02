import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Titulo, Proprietario, Cliente, ProprietarioConfig } from '@/types/titulo';
import { toast } from 'sonner';

interface TituloFormProps {
  onSubmit: (data: {
    tipo: string;
    cliente: string;
    clienteId?: string;
    telefone: string;
    dataEmissao: string;
    vencimento: string;
    valor: number;
    proprietario: Proprietario;
  }) => void;
  onClose: () => void;
  editData?: Titulo | null;
  clientes: Cliente[];
  proprietarios: ProprietarioConfig[];
}

export function TituloForm({ onSubmit, onClose, editData, clientes, proprietarios }: TituloFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const addDaysISO = (iso: string, days: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const [tipo, setTipo] = useState('PROMISSÓRIA');
  const [clienteId, setClienteId] = useState<string>('');
  const [telefone, setTelefone] = useState('');
  const [dataEmissao, setDataEmissao] = useState(today);
  const [vencimento, setVencimento] = useState(addDaysISO(today, 30));
  const [vencimentoTocado, setVencimentoTocado] = useState(false);
  const [valor, setValor] = useState('');
  const [proprietario, setProprietario] = useState<Proprietario>('');

  useEffect(() => {
    if (editData) {
      setTipo(editData.tipo);
      setClienteId(editData.clienteId || '');
      setTelefone(editData.telefone);
      setDataEmissao(editData.dataEmissao || today);
      setVencimento(editData.vencimento);
      setVencimentoTocado(true);
      setValor(editData.valor.toString());
      setProprietario(editData.proprietario || '');
    }
  }, [editData]);

  // Auto-atualiza vencimento (+30d) quando emissão muda, exceto se editando ou já editado manualmente
  useEffect(() => {
    if (editData) return;
    if (vencimentoTocado) return;
    if (!dataEmissao) return;
    setVencimento(addDaysISO(dataEmissao, 30));
  }, [dataEmissao, vencimentoTocado, editData]);

  // Auto-fill telefone ao selecionar cliente
  useEffect(() => {
    if (clienteId && !editData) {
      const c = clientes.find(c => c.id === clienteId);
      if (c) setTelefone(c.telefone || '');
    }
  }, [clienteId, clientes, editData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
      toast.error('Selecione um cliente cadastrado');
      return;
    }
    if (!vencimento || !valor || !dataEmissao) return;
    if (!proprietario) {
      toast.error('Selecione um proprietário');
      return;
    }
    onSubmit({
      tipo,
      cliente: cliente.nome,
      clienteId: cliente.id,
      telefone,
      dataEmissao,
      vencimento,
      valor: parseFloat(valor),
      proprietario,
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
        {clientes.length === 0 && (
          <div className="mb-3 p-3 rounded-md bg-warning/10 text-xs">
            Cadastre um cliente na aba <strong>Clientes</strong> antes de criar um título.
          </div>
        )}
        {proprietarios.length === 0 && (
          <div className="mb-3 p-3 rounded-md bg-warning/10 text-xs">
            Cadastre um proprietário em <strong>Configurações</strong>.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Proprietário *</Label>
            <Select value={proprietario} onValueChange={(v) => setProprietario(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o proprietário" />
              </SelectTrigger>
              <SelectContent>
                {proprietarios.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: p.cor }} />
                      {p.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROMISSÓRIA">Promissória</SelectItem>
                <SelectItem value="CADERNO">Caderno</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={clientes.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={clientes.length === 0 ? 'Cadastre clientes primeiro' : 'Selecione o cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="11999999999" type="tel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Emissão *</Label>
              <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Vencimento *</Label>
              <Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Valor *</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required />
          </div>
          <Button type="submit" className="w-full">{editData ? 'Salvar Alterações' : 'Adicionar Título'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
