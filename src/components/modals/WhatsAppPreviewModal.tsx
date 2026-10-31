// src/components/modals/WhatsAppPreviewModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { abrirWhatsApp } from '@/lib/whatsapp/whatsappLink';

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telefone: string;
  nomeDestinatario: string;
  mensagemInicial: string;
}

export function WhatsAppPreviewModal({ open, onOpenChange, telefone, nomeDestinatario, mensagemInicial }: WhatsAppPreviewModalProps) {
  const [telefoneInput, setTelefoneInput] = useState(telefone);
  const [mensagem, setMensagem] = useState(mensagemInicial);

  useEffect(() => {
    setTelefoneInput(telefone);
    setMensagem(mensagemInicial);
  }, [telefone, mensagemInicial, open]);

  const handleSend = async () => {
    if (!telefoneInput.trim()) {
      toast.error('O numero de telefone esta vazio.');
      return;
    }
    if (!mensagem.trim()) {
      toast.error('A mensagem nao pode estar vazia.');
      return;
    }

    try {
      const aberto = await abrirWhatsApp(telefoneInput, mensagem);
      if (aberto) {
        toast.success('Conversa aberta no WhatsApp. Confira a mensagem e clique em Enviar.');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('[WhatsAppPreviewModal] Erro ao abrir WhatsApp:', error);
      toast.error('Nao foi possivel abrir o WhatsApp. Verifique o numero.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Enviar pelo WhatsApp
          </DialogTitle>
          {nomeDestinatario && <DialogDescription>Destinatario: {nomeDestinatario}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefone-preview">Numero de Telefone</Label>
            <input
              id="telefone-preview"
              type="text"
              value={telefoneInput}
              onChange={(e) => setTelefoneInput(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex: 11999999999"
            />
            <p className="text-xs text-muted-foreground">
              O sistema normaliza para o formato internacional (Brasil).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem-preview">Mensagem</Label>
            <Textarea
              id="mensagem-preview"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={8}
              className="resize-none text-sm"
              placeholder="Digite ou edite a mensagem aqui..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white">
            <Send className="h-4 w-4 mr-2" /> Abrir no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
