/**
 * EnviarWhatsAppButton — Envio de mensagens via backend WhatsApp (Baileys).
 *
 * Diferente do EnviarWhatsApp.tsx (que abre links wa.me), este componente
 * verifica se o backend está conectado, agrupa os títulos selecionados por
 * cliente, mostra a prévia da mensagem (usando obterNomeCliente/apelido) e
 * envia tudo em lote via whatsappService.enviarEmLote, exibindo o status de
 * envio (pendente/enviado/erro) por cliente.
 */
import { useEffect, useMemo, useState } from 'react';
import { Cliente, Titulo, TituloComCalculo } from '@/types/titulo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { obterNomeCliente, gerarMensagemWhatsApp, TituloResumoMensagem } from '@/lib/whatsapp/message';
import { whatsappService, ConnectionState, BatchMessageItem } from '@/lib/whatsapp/whatsappService';

type TituloBase = Titulo | TituloComCalculo;

interface GrupoCliente {
  clienteId: string;
  clienteNome: string;
  telefone: string;
  cliente?: Cliente;
  titulos: TituloBase[];
  total: number;
}

type EnvioStatus = 'pending' | 'sending' | 'sent' | 'error';

interface Props {
  titulosSelecionados: TituloBase[];
  clientes: Cliente[];
  empresa?: string;
  pix?: { nome: string; chave: string };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EnviarWhatsAppButton({ titulosSelecionados, clientes, empresa, pix, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [connState, setConnState] = useState<ConnectionState>({ status: 'disconnected' });
  const [status, setStatus] = useState<Record<string, EnvioStatus>>({});

  useEffect(() => {
    if (!open) return;
    whatsappService.getStatus().then(setConnState).catch(() => setConnState({ status: 'disconnected' }));
  }, [open]);

  const grupos = useMemo((): GrupoCliente[] => {
    const map = new Map<string, GrupoCliente>();
    for (const t of titulosSelecionados) {
      const key = t.clienteId || t.cliente;
      if (!key) continue;
      const clienteRef = clientes.find(c => c.id === t.clienteId);
      if (!map.has(key)) {
        map.set(key, {
          clienteId: key,
          clienteNome: t.cliente,
          telefone: t.telefone || clienteRef?.telefone || '',
          cliente: clienteRef,
          titulos: [t],
          total: t.valor,
        });
      } else {
        const grupo = map.get(key)!;
        grupo.titulos.push(t);
        grupo.total += t.valor;
      }
    }
    return [...map.values()];
  }, [titulosSelecionados, clientes]);

  const preview = (grupo: GrupoCliente): string => {
    const listaTitulos: TituloResumoMensagem[] = grupo.titulos.map(t => ({
      tipo: t.tipo,
      numero: t.numero,
      vencimento: t.vencimento,
      valor: t.valor,
      pago: !!t.dataPagamento,
    }));
    return gerarMensagemWhatsApp({
      tipo: 'COBRANCA',
      cliente: grupo.cliente || { nome: grupo.clienteNome },
      listaTitulos,
      empresa,
      pix,
    });
  };

  const conectado = connState.status === 'connected';

  const handleEnviarTodos = async () => {
    if (!conectado) {
      toast.error('WhatsApp não está conectado. Conecte-se em Configurações → Sistema.');
      return;
    }

    const semTelefone = grupos.filter(g => !g.telefone);
    if (semTelefone.length > 0) {
      toast.error(`${semTelefone.length} cliente(s) sem telefone cadastrado.`);
    }
    const comTelefone = grupos.filter(g => !!g.telefone);
    if (comTelefone.length === 0) {
      toast.error('Nenhum título com telefone disponível para envio.');
      return;
    }

    setEnviando(true);
    const initialStatus: Record<string, EnvioStatus> = {};
    comTelefone.forEach(g => { initialStatus[g.clienteId] = 'pending'; });
    setStatus(initialStatus);

    try {
      const items: BatchMessageItem[] = comTelefone.map(grupo => ({
        phone: grupo.telefone,
        message: preview(grupo),
      }));

      setStatus(prev => {
        const next = { ...prev };
        comTelefone.forEach(g => { next[g.clienteId] = 'sending'; });
        return next;
      });

      const results = await whatsappService.enviarEmLote(items);

      const newStatus: Record<string, EnvioStatus> = {};
      let sucessos = 0;
      comTelefone.forEach((grupo, idx) => {
        const resultado = results[idx];
        const ok = resultado?.success ?? false;
        newStatus[grupo.clienteId] = ok ? 'sent' : 'error';
        if (ok) sucessos += 1;
      });
      setStatus(newStatus);

      if (sucessos > 0) {
        toast.success(`${sucessos} mensagem(ns) enviada(s) com sucesso.`);
        onSuccess?.();
      }
      if (sucessos < comTelefone.length) {
        toast.error(`${comTelefone.length - sucessos} mensagem(ns) falharam ao enviar.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar mensagens em lote');
      setStatus(prev => {
        const next = { ...prev };
        comTelefone.forEach(g => { if (next[g.clienteId] !== 'sent') next[g.clienteId] = 'error'; });
        return next;
      });
    } finally {
      setEnviando(false);
    }
  };

  const statusIcon = (clienteId: string) => {
    const s = status[clienteId];
    if (s === 'sent') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === 'sending') return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
          onClick={() => setOpen(true)}
          disabled={titulosSelecionados.length === 0}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Enviar WhatsApp
        </Button>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            Enviar via WhatsApp
          </DialogTitle>
        </DialogHeader>

        {!conectado && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              WhatsApp não está conectado. Vá em Configurações → Sistema para conectar antes de enviar.
            </p>
          </div>
        )}

        {grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum título selecionado.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {grupos.map(grupo => (
              <div key={grupo.clienteId} className="border border-border rounded-lg p-3 bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {obterNomeCliente(grupo.cliente || { nome: grupo.clienteNome })}
                    {statusIcon(grupo.clienteId)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {grupo.titulos.length} título{grupo.titulos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {!grupo.telefone && (
                  <p className="text-xs text-destructive">⚠ Sem telefone cadastrado — não será enviado.</p>
                )}
                <pre className="text-[11px] whitespace-pre-wrap font-sans text-muted-foreground bg-background/60 rounded p-2 border border-border/50">
                  {preview(grupo)}
                </pre>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleEnviarTodos}
          disabled={enviando || grupos.length === 0 || !conectado}
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Send className="h-4 w-4" />
          {enviando ? 'Enviando...' : `Enviar (${grupos.length} cliente${grupos.length !== 1 ? 's' : ''})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
