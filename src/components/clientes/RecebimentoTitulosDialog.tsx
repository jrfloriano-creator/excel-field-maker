/**
 * RecebimentoTitulosDialog — mostra os títulos PENDENTES/VENCIDOS do cliente
 * selecionado com checkboxes, permite recebimento em lote (ou parcial) e
 * marca os títulos selecionados como PAGO no banco.
 */
import { useMemo, useState } from 'react';
import { Cliente, Titulo, AppConfig } from '@/types/titulo';
import { SessionUser, appendLog } from '@/lib/auth';
import { verifyPin } from '@/lib/storage';
import { calcularTitulo, buildPagamentoWhatsMsg } from '@/lib/calculos';
import { formatCurrency, formatDate } from '@/lib/calculos';
import { obterNomeCliente } from '@/lib/whatsapp/message';
import { enviarWhatsAppUnico } from '@/lib/whatsapp/whatsappService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { CheckSquare, Square, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  cliente: Cliente | null;
  titulos: Titulo[];
  config: AppConfig;
  user: SessionUser | null;
  updateTitulo: (id: string, data: Partial<Titulo>) => void | Promise<void>;
  updateConfig: (data: Partial<AppConfig>) => void | Promise<void>;
  onClose: () => void;
}

export function RecebimentoTitulosDialog({ cliente, titulos, config, user, updateTitulo, updateConfig, onClose }: Props) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState('');
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [maquininhaId, setMaquininhaId] = useState('');
  const [usuarioId, setUsuarioId] = useState(user?.id || '');
  const [pinUsuario, setPinUsuario] = useState('');
  const [enviarWhats, setEnviarWhats] = useState(true);
  const [semJurosMulta, setSemJurosMulta] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const titulosPendentes = useMemo(() => {
    if (!cliente) return [];
    return titulos
      .filter(t => t.clienteId === cliente.id)
      .map(t => calcularTitulo(t, config.taxa, config.contasPagar?.multa || 0))
      .filter(t => t.situacao !== 'PAGO')
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  }, [cliente, titulos, config.taxa]);

  const titulosSelecionados = useMemo(
    () => titulosPendentes.filter(t => selecionados.has(t.id)),
    [titulosPendentes, selecionados]
  );

  const totalOriginal = useMemo(
    () => titulosSelecionados.reduce((s, t) => s + (semJurosMulta ? t.valor : t.valorCorrigido), 0),
    [titulosSelecionados, semJurosMulta]
  );

  const todosSelecionados = titulosPendentes.length > 0 && selecionados.size === titulosPendentes.length;

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => setSelecionados(new Set(titulosPendentes.map(t => t.id)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const reset = () => {
    setSelecionados(new Set());
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setValorPago('');
    setFormaPagamentoId('');
    setMaquininhaId('');
    setUsuarioId(user?.id || '');
    setPinUsuario('');
    setEnviarWhats(true);
    setSemJurosMulta(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formaSel = (config.formasPagamento || []).find(f => f.id === formaPagamentoId);
  const formaNome = formaSel?.nome.toLowerCase() ?? '';
  const isPix = formaNome.includes('pix');
  const requireMaquininha = !!formaSel && !isPix;
  const usuarioSel = (config.usuarios || []).find(u => u.id === usuarioId);

  const valorRecebidoN = valorPago === '' ? totalOriginal : (parseFloat(valorPago) || 0);

  const handleConfirmar = async () => {
    if (submitting) return;
    if (titulosSelecionados.length === 0) {
      toast.error('Selecione ao menos um título para receber.');
      return;
    }
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

      const maquininhaSel = (config.maquininhas || []).find(m => m.id === maquininhaId);

      // Distribui o valor recebido proporcionalmente entre os títulos selecionados
      // (ajuste de arredondamento aplicado ao último título).
      let acumulado = 0;
      titulosSelecionados.forEach((t, idx) => {
        const isUltimo = idx === titulosSelecionados.length - 1;
        const valorBase = semJurosMulta ? t.valor : t.valorCorrigido;
        const proporcional = totalOriginal > 0 ? (valorBase / totalOriginal) * valorRecebidoN : 0;
        const valorTitulo = isUltimo
          ? Math.round((valorRecebidoN - acumulado) * 100) / 100
          : Math.round(proporcional * 100) / 100;
        acumulado += valorTitulo;

        updateTitulo(t.id, {
          dataPagamento,
          valorPago: valorTitulo,
          recebidoPor: usuarioSel.nome,
          formaPagamento: formaSel.nome,
          maquininhaPagamento: maquininhaSel?.nome,
        });
      });

      appendLog(
        config,
        updateConfig,
        user,
        'titulo.pagar',
        `Recebeu ${titulosSelecionados.length} título(s) de ${cliente?.nome} — ${formatCurrency(valorRecebidoN)} via ${formaSel.nome} por ${usuarioSel.nome}${enviarWhats ? ' [WhatsApp enviado]' : ''}`
      );

      if (enviarWhats && cliente?.telefone) {
        const apelido = obterNomeCliente(cliente);
        const tipoTituloFormatado = titulosSelecionados.length > 1
          ? `${titulosSelecionados.length} título(s)`
          : `${titulosSelecionados[0].tipo} ${titulosSelecionados[0].numero}`;
        const msg = buildPagamentoWhatsMsg({
          apelido,
          dataPagamento,
          formaPagamento: formaSel.nome,
          valorPago: valorRecebidoN,
          tipoTitulo: tipoTituloFormatado,
          numeroTitulo: titulosSelecionados[0].numero,
          recebidoPor: usuarioSel.nome,
        });
        enviarWhatsAppUnico(cliente.telefone, msg);
        appendLog(config, updateConfig, user, 'whatsapp.pagamento', `WhatsApp pagamento p/ ${apelido}`);
      }

      toast.success(`${titulosSelecionados.length} título(s) recebido(s) com sucesso!`);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Receber Títulos — {cliente?.nome}
          </DialogTitle>
        </DialogHeader>

        {titulosPendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum título pendente ou vencido para este cliente.
          </p>
        ) : (
          <div className="space-y-3">
            <Button
              variant={todosSelecionados ? 'default' : 'outline'}
              size="sm"
              className="gap-1 text-xs"
              onClick={todosSelecionados ? desmarcarTodos : selecionarTodos}
            >
              {todosSelecionados ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
              {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {titulosPendentes.map(t => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-xs border border-border rounded px-2.5 py-1.5 cursor-pointer hover:bg-accent/30"
                >
                  <Checkbox
                    checked={selecionados.has(t.id)}
                    onCheckedChange={() => toggleSelecionado(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.tipo} • Nº {t.numero}</span>
                      <StatusBadge situacao={t.situacao} className="text-[10px] px-1.5 py-0.5" />
                    </div>
                    <p className="text-muted-foreground">
                      Venc.: {formatDate(t.vencimento)} • {formatCurrency(semJurosMulta ? t.valor : t.valorCorrigido)}
                      {!semJurosMulta && t.valorJuros > 0 && ` (juros ${formatCurrency(t.valorJuros)})`}
                      {!semJurosMulta && t.valorMulta > 0 && ` (multa ${formatCurrency(t.valorMulta)})`}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selecionados.size > 0 && (
              <>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                  <span className="text-sm font-semibold">
                    {selecionados.size} título{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    Total: <strong>{formatCurrency(totalOriginal)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-secondary/50">
                  <Checkbox id="sem-juros-multa-lote" checked={semJurosMulta} onCheckedChange={(c) => setSemJurosMulta(c === true)} />
                  <Label htmlFor="sem-juros-multa-lote" className="text-xs cursor-pointer">
                    Receber sem Juros e Multa
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data do Pagamento</Label>
                    <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Recebido (pode ser parcial)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={totalOriginal.toFixed(2)}
                      value={valorPago}
                      onChange={e => setValorPago(e.target.value)}
                    />
                  </div>
                </div>
                {valorRecebidoN !== totalOriginal && (
                  <p className="text-[11px] text-blue-600">
                    Valor será rateado proporcionalmente entre os títulos selecionados.
                  </p>
                )}

                <div>
                  <Label className="text-xs">Forma de Pagamento *</Label>
                  <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                    <SelectTrigger>
                      <SelectValue placeholder={(config.formasPagamento || []).length === 0 ? 'Cadastre em Config › Financeiro' : 'Selecione a forma'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(config.formasPagamento || []).map(f => (
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
                        <SelectValue placeholder={(config.maquininhas || []).length === 0 ? 'Cadastre em Config › Financeiro' : 'Selecione a maquininha'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(config.maquininhas || []).map(m => (
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
                      <SelectValue placeholder={(config.usuarios || []).length === 0 ? 'Cadastre usuários' : 'Selecione o usuário'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(config.usuarios || []).map(u => (
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
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-secondary/50">
                  <Checkbox id="whats-lote" checked={enviarWhats} onCheckedChange={(c) => setEnviarWhats(!!c)} />
                  <Label htmlFor="whats-lote" className="text-xs cursor-pointer">
                    📱 Enviar mensagem WhatsApp ao cliente após confirmar recebimento
                  </Label>
                </div>

                <Button
                  onClick={handleConfirmar}
                  disabled={submitting}
                  className="w-full bg-paid hover:bg-paid/90 text-paid-foreground"
                >
                  {submitting ? 'Validando...' : 'Receber'}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
