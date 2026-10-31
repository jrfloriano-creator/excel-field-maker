import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Copy, ExternalLink, MessageCircle, SkipForward } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { abrirWhatsApp, telefoneValido } from '@/lib/whatsapp/whatsappLink';

export interface ItemFilaWhatsApp {
  id: string;
  nome: string;
  telefone: string;
  mensagem: string;
}

type Estado = 'pendente' | 'enviado' | 'pulado';

interface FilaEnvioWhatsAppProps {
  open: boolean;
  titulo?: string;
  itens: ItemFilaWhatsApp[];
  onClose: () => void;
  onEnviado?: (item: ItemFilaWhatsApp) => void;
}

export function FilaEnvioWhatsApp({ open, titulo = 'Enviar pelo WhatsApp', itens, onClose, onEnviado }: FilaEnvioWhatsAppProps) {
  const [indice, setIndice] = useState(0);
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [mensagens, setMensagens] = useState<Record<string, string>>({});
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setIndice(0);
    setEstados({});
    setAbertos({});
    setMensagens(Object.fromEntries(itens.map((i) => [i.id, i.mensagem])));
  }, [open, itens]);

  const total = itens.length;
  const atual = itens[indice];
  const terminou = total > 0 && indice >= total;

  const resumo = useMemo(() => {
    const valores = Object.values(estados);
    return {
      enviados: valores.filter((e) => e === 'enviado').length,
      pulados: valores.filter((e) => e === 'pulado').length,
    };
  }, [estados]);

  if (!open) return null;

  const mensagemAtual = atual ? mensagens[atual.id] ?? atual.mensagem : '';
  const telefoneOk = atual ? telefoneValido(atual.telefone) : false;

  const avancar = (estado: Estado) => {
    if (!atual) return;
    setEstados((prev) => ({ ...prev, [atual.id]: estado }));
    if (estado === 'enviado') onEnviado?.(atual);
    setIndice((i) => i + 1);
  };

  const abrir = async () => {
    if (!atual) return;
    const ok = await abrirWhatsApp(atual.telefone, mensagemAtual);
    if (ok) setAbertos((prev) => ({ ...prev, [atual.id]: true }));
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagemAtual);
      toast.success('Mensagem copiada.');
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum destinatário na fila.</p>
        ) : terminou ? (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
            <p className="font-medium">Fila concluída</p>
            <p className="text-sm text-muted-foreground">
              {resumo.enviados} enviado(s) • {resumo.pulados} pulado(s)
            </p>
            <Button onClick={onClose} className="w-full">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Destinatário {indice + 1} de {total}</span>
              <span>{resumo.enviados} enviado(s) • {resumo.pulados} pulado(s)</span>
            </div>
            <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(indice / total) * 100}%` }} />
            </div>

            <div className="rounded-md border p-3">
              <p className="font-medium">{atual.nome}</p>
              <p className={`text-xs ${telefoneOk ? 'text-muted-foreground' : 'text-destructive'}`}>
                {telefoneOk ? atual.telefone : `Telefone inválido ou ausente (${atual.telefone || 'vazio'})`}
              </p>
            </div>

            <Textarea
              value={mensagemAtual}
              onChange={(e) => setMensagens((prev) => ({ ...prev, [atual.id]: e.target.value }))}
              rows={8}
              className="text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={abrir} disabled={!telefoneOk} className="gap-1 col-span-2">
                <ExternalLink className="h-4 w-4" />
                1. Abrir conversa no WhatsApp
              </Button>
              <Button variant="outline" onClick={copiar} className="gap-1">
                <Copy className="h-4 w-4" />
                Copiar mensagem
              </Button>
              <Button variant="outline" onClick={() => avancar('pulado')} className="gap-1">
                <SkipForward className="h-4 w-4" />
                Pular
              </Button>
              <Button
                onClick={() => avancar('enviado')}
                disabled={!abertos[atual.id]}
                variant="secondary"
                className="gap-1 col-span-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                2. Já enviei — próximo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No WhatsApp, confira o texto e clique em Enviar. Depois volte aqui e confirme.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}