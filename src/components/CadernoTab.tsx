import { useEffect, useMemo, useState } from 'react';
import { AppConfig, Cliente, Titulo } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '@/lib/promissoria';

interface Props {
  config: AppConfig;
  onAddTitulos?: (titulos: Omit<Titulo, 'id' | 'numero'>[]) => void;
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toISOString().split('T')[0];
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return dt.toISOString().split('T')[0];
}

export function CadernoTab({ config, onAddTitulos }: Props) {
  const hoje = new Date().toISOString().split('T')[0];
  const [proprietario, setProprietario] = useState(config.proprietarios[0]?.id || '');
  const [clienteId, setClienteId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [dataEmissao, setDataEmissao] = useState(hoje);
  const [primeiroVenc, setPrimeiroVenc] = useState(addDays(hoje, 30));
  const [vencTocado, setVencTocado] = useState(false);
  const [valorTotal, setValorTotal] = useState('');

  useEffect(() => {
    if (!vencTocado && dataEmissao) setPrimeiroVenc(addDays(dataEmissao, 30));
  }, [dataEmissao, vencTocado]);

  const cliente: Cliente | undefined = useMemo(
    () => config.clientes.find(c => c.id === clienteId),
    [config.clientes, clienteId]
  );

  const qtd = parseInt(quantidade) || 0;
  const valor = parseFloat(valorTotal.replace(',', '.')) || 0;
  const valorParcela = qtd > 0 ? valor / qtd : 0;

  const handleSalvar = () => {
    if (!proprietario) { toast.error('Selecione o proprietário'); return; }
    if (!cliente) { toast.error('Selecione o cliente'); return; }
    if (qtd < 1) { toast.error('Quantidade inválida'); return; }
    if (valor <= 0) { toast.error('Informe o valor total'); return; }
    if (!primeiroVenc) { toast.error('Informe a data do 1º vencimento'); return; }
    if (!onAddTitulos) return;

    const novos: Omit<Titulo, 'id' | 'numero'>[] = Array.from({ length: qtd }, (_, i) => ({
      tipo: qtd > 1 ? `Caderno ${i + 1}/${qtd}` : 'Caderno',
      cliente: cliente.nome,
      clienteId: cliente.id,
      telefone: cliente.telefone || '',
      dataEmissao,
      vencimento: addMonths(primeiroVenc, i),
      valor: Number(valorParcela.toFixed(2)),
      proprietario,
    }));
    onAddTitulos(novos);
    toast.success(`${qtd} título(s) Caderno salvo(s)`);
    setValorTotal('');
    setQuantidade('1');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lançamento de Venda em Caderno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Proprietário</Label>
            <Select value={proprietario} onValueChange={setProprietario}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {config.proprietarios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tipo</Label>
            <Input value="Caderno" disabled />
          </div>

          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {config.clientes.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">Nenhum cliente cadastrado</div>
                ) : (
                  config.clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {cliente && (
              <p className="text-[11px] text-muted-foreground mt-1">
                📱 {cliente.telefone || '—'}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Quantidade de Parcelas</Label>
            <Input
              type="number"
              min={1}
              value={quantidade}
              onChange={e => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data de Emissão</Label>
              <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">1º Vencimento</Label>
              <Input
                type="date"
                value={primeiroVenc}
                onChange={e => { setPrimeiroVenc(e.target.value); setVencTocado(true); }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Valor Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valorTotal}
              onChange={e => setValorTotal(e.target.value)}
              placeholder="0,00"
            />
            {qtd > 0 && valor > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {qtd}x de {formatBRL(valorParcela)}
              </p>
            )}
          </div>

          <Button onClick={handleSalvar} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <Save className="h-4 w-4 mr-1" /> Salvar no Banco de Títulos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
