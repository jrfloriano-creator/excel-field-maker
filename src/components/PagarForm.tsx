import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { FormaPagamento, Maquininha, Usuario } from '@/types/titulo';
import { formatCurrency } from '@/lib/calculos';
import { verifyPin } from '@/lib/storage';
import { toast } from 'sonner';

interface PagarFormProps {
  clienteNome: string;
  valorOriginal: number;
  creditoDisponivel?: number;
  recebidoPor: string;
  recebidoPorId?: string;
  usuarios?: Usuario[];
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

export function PagarForm({
  clienteNome,
  valorOriginal,
  creditoDisponivel = 0,
  recebidoPor,
  recebidoPorId,
  usuarios = [],
  formasPagamento = [],
  maquininhas = [],
  onSubmit,
  onClose,
}: PagarFormProps) {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState(valorOriginal.toString());
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [maquininhaId, setMaquininhaId] = useState('');
  const [enviarWhats, setEnviarWhats] = useState(true);
  const [usarCredito, setUsarCredito] = useState(creditoDisponivel > 0);
  const [usuarioId, setUsuarioId] = useState(recebidoPorId || usuarios[0]?.id || '');
  const [pinUsuario, setPinUsuario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valorN = parseFloat(valorPago) || 0;
  const credito = usarCredito ? creditoDisponivel : 0;
  const totalRecebido = valorN + credito;
  const diferenca = totalRecebido - valorOriginal;
  const creditoGerado = diferenca > 0 ? diferenca : 0;

  const formaSel = formasPagamento.find(f => f.id === formaPagamentoId);
  const formaNome = formaSel?.nome.toLowerCase() ?? '';
  const isPix = formaNome.includes('pix');
  // FEAT 10: maquininha obrigatória para qualquer pagamento exceto PIX
  const requireMaquininha = !!formaSel && !isPix;

  const usuarioSel = usuarios.find(u => u.id === usuarioId);
  const nomeRecebedor = usuarioSel?.nome ?? recebidoPor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formaSel) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    if (requireMaquininha && !maquininhaId) {
      toast.error('Selecione a maquininha utilizada para recebimento');
      return;
    }
    if (!usuarioSel) {
      toast.error('Selecione quem está recebendo');
      return;
    }
    if (pinUsuario.length !== 4) {
      toast.error('Informe a senha (4 dígitos) do usuário que está recebendo');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await verifyPin(pinUsuario, usuarioSel.pin);
      if (!ok) {
        toast.error('Senha do usuário incorreta');
        setPinUsuario('');
        setSubmitting(false);
        return;
      }
      const maquininhaSel = maquininhas.find(m => m.id === maquininhaId);
      onSubmit({
        dataPagamento,
        valorPago: valorN,
        recebidoPor: nomeRecebedor,
        formaPagamento: formaSel.nome,
        maquininhaPagamento: maquininhaSel?.nome,
        enviarWhats,
        creditoAplicado: credito,
        creditoGerado,
      });
    } finally {
      setSubmitting(false);
    }
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
              <Label className="text-xs">Maquininha * (obrigatório exceto PIX)</Label>
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
            <Label className="text-xs">Recebido por *</Label>
            <Select value={usuarioId} onValueChange={(v) => { setUsuarioId(v); setPinUsuario(''); }}>
              <SelectTrigger>
                <SelectValue placeholder={usuarios.length === 0 ? 'Cadastre usuários' : 'Selecione o usuário'} />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}{u.master ? ' (MASTER)' : ` (${u.nivel})`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Senha (4 dígitos) do usuário *</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinUsuario}
              onChange={e => setPinUsuario(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="text-center tracking-[0.5em] font-bold"
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Confirme a senha cadastrada do usuário selecionado em Config › Cadastros.
            </p>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-paid hover:bg-paid/90 text-paid-foreground">
            {submitting ? 'Validando…' : 'Confirmar Recebimento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
