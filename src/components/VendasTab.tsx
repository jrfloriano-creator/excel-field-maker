import { useState } from 'react';
import { AppConfig, VendaVista, Cliente } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculos';
import { toast } from 'sonner';
import { UserPlus, Save } from 'lucide-react';
import { SessionUser } from '@/lib/auth';

interface Props {
  config: AppConfig;
  onUpdate: (patch: Partial<AppConfig>) => void;
  user: SessionUser | null;
  onNewCliente: () => void;
}

export function VendasTab({ config, onUpdate, user, onNewCliente }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNovo, setClienteNovo] = useState(false);
  const [valor, setValor] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcento'>('valor');
  const [desconto, setDesconto] = useState('');
  const [formaPagId, setFormaPagId] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [maquininhaId, setMaquininhaId] = useState('');

  const formas = config.formasPagamento || [];
  const maquininhas = config.maquininhas || [];
  const formaSel = formas.find(f => f.id === formaPagId);
  const isCartao = formaSel?.nome.toLowerCase().includes('cart');

  const valorN = parseFloat(valor) || 0;
  const descN = parseFloat(desconto) || 0;
  const valorFinal = descontoTipo === 'valor'
    ? Math.max(0, valorN - descN)
    : Math.max(0, valorN * (1 - descN / 100));

  const salvar = () => {
    if (!formaSel) { toast.error('Selecione a forma de pagamento'); return; }
    if (valorN <= 0) { toast.error('Informe o valor'); return; }
    let nome = '';
    let cId: string | undefined;
    if (clienteNovo) {
      nome = 'CLIENTE NOVO';
    } else {
      const c = config.clientes.find(c => c.id === clienteId);
      if (!c) { toast.error('Selecione o cliente'); return; }
      nome = c.nome;
      cId = c.id;
    }
    const venda: VendaVista = {
      id: generateId(),
      data: today,
      clienteId: cId,
      clienteNome: nome,
      valor: valorFinal,
      desconto: descN,
      descontoTipo,
      formaPagamento: formaSel.nome,
      parcelas: isCartao ? parseInt(parcelas) || 1 : undefined,
      maquininha: isCartao ? maquininhas.find(m => m.id === maquininhaId)?.nome : undefined,
      registradoPor: user?.nome || '—',
    };
    onUpdate({ vendas: [...(config.vendas || []), venda] });
    toast.success('Venda registrada');
    setValor(''); setDesconto(''); setParcelas('1');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🛒 Vendas à Vista</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nova Venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cnovo" checked={clienteNovo} onChange={e => setClienteNovo(e.target.checked)} />
            <Label htmlFor="cnovo" className="text-xs cursor-pointer">Cliente Novo (não cadastrar)</Label>
          </div>
          {!clienteNovo && (
            <div>
              <Label className="text-xs">Cliente</Label>
              <div className="flex gap-2">
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {config.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={onNewCliente} title="Cadastrar novo">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Valor da Compra (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Desconto</Label>
              <Input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={descontoTipo} onValueChange={(v) => setDescontoTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">R$</SelectItem>
                  <SelectItem value="porcento">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
            <Select value={formaPagId} onValueChange={setFormaPagId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isCartao && (
            <>
              <div>
                <Label className="text-xs">Parcelas</Label>
                <Input type="number" min={1} value={parcelas} onChange={e => setParcelas(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Maquininha</Label>
                <Select value={maquininhaId} onValueChange={setMaquininhaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="p-2 bg-secondary rounded text-sm flex justify-between">
            <span>Valor Final:</span>
            <strong>{formatCurrency(valorFinal)}</strong>
          </div>
          <Button onClick={salvar} className="w-full">
            <Save className="h-4 w-4 mr-1" /> Registrar Venda
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimas Vendas ({(config.vendas || []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-72 overflow-y-auto">
          {(config.vendas || []).slice().reverse().slice(0, 30).map(v => (
            <div key={v.id} className="border rounded p-2 text-xs">
              <div className="flex justify-between">
                <span>{v.clienteNome}</span>
                <strong>{formatCurrency(v.valor)}</strong>
              </div>
              <p className="text-muted-foreground">
                {v.data} • {v.formaPagamento}{v.parcelas ? ` ${v.parcelas}x` : ''}{v.maquininha ? ` • ${v.maquininha}` : ''}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
