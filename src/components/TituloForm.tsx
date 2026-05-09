import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Titulo, Proprietario, Cliente, ProprietarioConfig, AppConfig } from '@/types/titulo';
import { toast } from 'sonner';
import { hasPerm, SessionUser } from '@/lib/auth';
import { MotivoDialog } from './MotivoDialog';
import { formatCurrency } from '@/lib/calculos';

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
    valorPago?: number;
    dataPagamento?: string;
  }, motivo?: string) => void;
  onClose: () => void;
  editData?: Titulo | null;
  clientes: Cliente[];
  proprietarios: ProprietarioConfig[];
  config: AppConfig;
  user: SessionUser | null;
}

export function TituloForm({ onSubmit, onClose, editData, clientes, proprietarios, config, user }: TituloFormProps) {
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
  const [valorPago, setValorPago] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [askMotivo, setAskMotivo] = useState<{ pendingData: any } | null>(null);

  const isEdit = !!editData;
  const can = (p: any) => hasPerm(config, user, p);
  // Em modo criação tudo é livre; em modo edição respeita permissões
  const may = (perm: any) => !isEdit || can(perm);

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
      setValorPago(editData.valorPago?.toString() || '');
      setDataPagamento(editData.dataPagamento || '');
    }
  }, [editData]);

  useEffect(() => {
    if (editData) return;
    if (vencimentoTocado) return;
    if (!dataEmissao) return;
    setVencimento(addDaysISO(dataEmissao, 30));
  }, [dataEmissao, vencimentoTocado, editData]);

  useEffect(() => {
    if (clienteId && !editData) {
      const c = clientes.find(c => c.id === clienteId);
      if (c) setTelefone(c.telefone || '');
    }
  }, [clienteId, clientes, editData]);

  const valorN = parseFloat(valor) || 0;
  const valorPagoN = parseFloat(valorPago) || 0;
  const diferenca = useMemo(() => valorPagoN - valorN, [valorPagoN, valorN]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) { toast.error('Selecione um cliente cadastrado'); return; }
    if (!vencimento || !valor || !dataEmissao) return;
    if (!proprietario) { toast.error('Selecione um proprietário'); return; }

    const data = {
      tipo, cliente: cliente.nome, clienteId: cliente.id, telefone,
      dataEmissao, vencimento, valor: parseFloat(valor), proprietario,
      ...(isEdit && valorPago ? { valorPago: valorPagoN, dataPagamento: dataPagamento || today } : {}),
    };

    if (isEdit) {
      // Pede motivo antes de salvar
      setAskMotivo({ pendingData: data });
      return;
    }
    onSubmit(data);
  };

  const confirmMotivo = (motivo: string) => {
    if (askMotivo) {
      onSubmit(askMotivo.pendingData, motivo);
      setAskMotivo(null);
    }
  };

  return (
    <>
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{isEdit ? 'Editar Título' : 'Novo Título'}</CardTitle>
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
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Proprietário *</Label>
              <Select value={proprietario} onValueChange={setProprietario} disabled={!may('titulo.editar.proprietario')}>
                <SelectTrigger><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
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
              {isEdit && !can('titulo.editar.proprietario') && <p className="text-[10px] text-muted-foreground">Sem permissão para alterar.</p>}
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={!may('titulo.editar.recebimento')}>
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
              <Select value={clienteId} onValueChange={setClienteId} disabled={clientes.length === 0 || !may('titulo.editar.cliente')}>
                <SelectTrigger><SelectValue placeholder={clientes.length === 0 ? 'Cadastre clientes primeiro' : 'Selecione o cliente'} /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="11999999999" type="tel"
                disabled={!may('titulo.editar.telefone')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Emissão *</Label>
                <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} required
                  disabled={!may('titulo.editar.emissao')} />
              </div>
              <div>
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={vencimento}
                  onChange={e => { setVencimento(e.target.value); setVencimentoTocado(true); }}
                  required disabled={!may('titulo.editar.vencimento')} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00" required disabled={!may('titulo.editar.valor')} />
            </div>

            {isEdit && (
              <div className="border border-border rounded-md p-3 space-y-2 bg-secondary/40">
                <p className="text-xs font-semibold">💵 Recebimento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Valor pago</Label>
                    <Input type="number" step="0.01" min="0" value={valorPago}
                      onChange={e => setValorPago(e.target.value)} placeholder="0,00"
                      disabled={!can('titulo.editar.recebimento')} />
                  </div>
                  <div>
                    <Label className="text-xs">Data pagamento</Label>
                    <Input type="date" value={dataPagamento}
                      onChange={e => setDataPagamento(e.target.value)}
                      disabled={!can('titulo.editar.recebimento')} />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Diferença:</span>
                  <strong className={diferenca < 0 ? 'text-overdue' : diferenca > 0 ? 'text-blue-500' : ''}>
                    {valorPago ? formatCurrency(diferenca) : '—'}
                  </strong>
                </div>
                {diferenca > 0 && (
                  <p className="text-[10px] text-blue-500">
                    Valor excedente vira crédito ({formatCurrency(diferenca)}) para o próximo título.
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full">{isEdit ? 'Salvar Alterações' : 'Adicionar Título'}</Button>
          </form>
        </CardContent>
      </Card>

      {askMotivo && (
        <MotivoDialog
          acao={`Editando título #${editData?.numero} ${editData?.cliente}`}
          motivos={config.motivosAlteracao || []}
          onConfirm={confirmMotivo}
          onClose={() => setAskMotivo(null)}
        />
      )}
    </>
  );
}
