/**
 * EnviarWhatsApp — Dialog que agrupa títulos selecionados por cliente,
 * monta a prévia da mensagem (usando apelido via obterNomeCliente) e
 * envia via WhatsApp, registrando o histórico de envio no localStorage.
 */
import { useMemo, useState } from 'react';
import { Cliente, Titulo, TituloComCalculo } from '@/types/titulo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { openExternalUrl } from '@/lib/openUrl';
import { obterNomeCliente, gerarMensagemWhatsApp, TituloResumoMensagem } from '@/lib/whatsapp/message';

const LS_HISTORICO_KEY = 'zoom_whatsapp_historico';

interface HistoricoEnvio {
  clienteId: string;
  clienteNome: string;
  quantidadeTitulos: number;
  total: number;
  data: string; // ISO
}

function registrarHistorico(entradas: HistoricoEnvio[]) {
  try {
    const raw = localStorage.getItem(LS_HISTORICO_KEY);
    const historico: HistoricoEnvio[] = raw ? JSON.parse(raw) : [];
    historico.push(...entradas);
    localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(historico));
  } catch (e) {
    console.warn('[EnviarWhatsApp] Falha ao registrar histórico', e);
  }
}

type TituloBase = Titulo | TituloComCalculo;

interface GrupoCliente {
  clienteId: string;
  clienteNome: string;
  telefone: string;
  cliente?: Cliente;
  titulos: TituloBase[];
  total: number;
}

interface Props {
  titulosSelecionados: TituloBase[];
  clientes: Cliente[];
  empresa?: string;
  pix?: { nome: string; chave: string };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EnviarWhatsApp({ titulosSelecionados, clientes, empresa, pix, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);

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

  const handleEnviarTodos = async () => {
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
    try {
      const historico: HistoricoEnvio[] = [];
      for (const grupo of comTelefone) {
        const msg = preview(grupo);
        const digits = grupo.telefone.replace(/\D/g, '');
        await openExternalUrl(`https://api.whatsapp.com/send?phone=55${digits}&text=${encodeURIComponent(msg)}`);
        historico.push({
          clienteId: grupo.clienteId,
          clienteNome: obterNomeCliente(grupo.cliente || { nome: grupo.clienteNome }),
          quantidadeTitulos: grupo.titulos.length,
          total: grupo.total,
          data: new Date().toISOString(),
        });
      }
      registrarHistorico(historico);
      toast.success(`WhatsApp aberto para ${comTelefone.length} cliente(s).`);
      setOpen(false);
      onSuccess?.();
    } finally {
      setEnviando(false);
    }
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

        {grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum título selecionado.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {grupos.map(grupo => (
              <div key={grupo.clienteId} className="border border-border rounded-lg p-3 bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate">
                    {obterNomeCliente(grupo.cliente || { nome: grupo.clienteNome })}
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
          disabled={enviando || grupos.length === 0}
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Send className="h-4 w-4" />
          {enviando ? 'Enviando...' : `Enviar (${grupos.length} cliente${grupos.length !== 1 ? 's' : ''})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
