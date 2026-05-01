import { useMemo, useState } from 'react';
import { AppConfig, Titulo } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, Send } from 'lucide-react';
import { calcularTitulo, formatCurrency, formatDate } from '@/lib/calculos';
import { openGmailCompose } from '@/lib/email';
import { toast } from 'sonner';

interface Props {
  config: AppConfig;
  titulos: Titulo[];
  onUpdate: (data: Partial<AppConfig>) => void;
}

const TEMPLATE_PADRAO = `Olá {cliente},

Identificamos que o título {tipo} no valor de {valor} venceu em {vencimento} e está em aberto.
Pedimos a gentileza de regularizar o pagamento o quanto antes.

Em caso de dúvidas, estamos à disposição.

Atenciosamente.`;

function preencher(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function EmailPanel({ config, titulos, onUpdate }: Props) {
  const [emailLivreTo, setEmailLivreTo] = useState('');
  const [emailLivreAssunto, setEmailLivreAssunto] = useState('');
  const [emailLivreTexto, setEmailLivreTexto] = useState('');

  const texto = config.textoCobrancaEmail ?? TEMPLATE_PADRAO;

  const atrasados = useMemo(() => {
    return titulos
      .map(t => calcularTitulo(t, config.taxa))
      .filter(t => t.situacao === 'VENCIDO');
  }, [titulos, config.taxa]);

  const comEmail = useMemo(
    () => atrasados.filter(t => {
      const c = config.clientes.find(c => c.id === t.clienteId);
      return c?.email;
    }),
    [atrasados, config.clientes]
  );

  const handleEnviarCobrancas = () => {
    if (comEmail.length === 0) {
      toast.error('Nenhum cliente em atraso com e-mail cadastrado');
      return;
    }
    comEmail.forEach((t, i) => {
      const cliente = config.clientes.find(c => c.id === t.clienteId);
      if (!cliente?.email) return;
      const corpo = preencher(texto, {
        cliente: t.cliente,
        tipo: t.tipo,
        valor: formatCurrency(t.valorCorrigido),
        vencimento: formatDate(t.vencimento),
      });
      // Pequeno delay entre aberturas para evitar bloqueio do navegador
      setTimeout(() => {
        openGmailCompose({
          to: cliente.email,
          subject: `Cobrança - ${t.tipo}`,
          body: corpo,
        });
      }, i * 250);
    });
    toast.success(`${comEmail.length} e-mail(s) abertos no Gmail`);
  };

  const handleEnviarLivre = () => {
    if (!emailLivreTo.trim()) { toast.error('Informe o destinatário'); return; }
    openGmailCompose({
      to: emailLivreTo.trim(),
      subject: emailLivreAssunto,
      body: emailLivreTexto,
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📧 E-mail de Cobrança (Gmail)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Variáveis: {'{cliente}'}, {'{tipo}'}, {'{valor}'}, {'{vencimento}'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Texto de cobrança</Label>
          <Textarea
            rows={7}
            value={texto}
            onChange={e => onUpdate({ textoCobrancaEmail: e.target.value })}
          />
          <Button
            className="w-full"
            variant="outline"
            onClick={handleEnviarCobrancas}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar cobrança aos atrasados ({comEmail.length}/{atrasados.length})
          </Button>
          {atrasados.length > 0 && comEmail.length < atrasados.length && (
            <p className="text-xs text-muted-foreground">
              {atrasados.length - comEmail.length} cliente(s) em atraso sem e-mail cadastrado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✉️ Enviar E-mail (Gmail)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label className="text-xs">Para</Label>
            <Input
              type="email"
              value={emailLivreTo}
              onChange={e => setEmailLivreTo(e.target.value)}
              placeholder="destinatario@email.com"
            />
          </div>
          <div>
            <Label className="text-xs">Assunto</Label>
            <Input
              value={emailLivreAssunto}
              onChange={e => setEmailLivreAssunto(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              rows={6}
              value={emailLivreTexto}
              onChange={e => setEmailLivreTexto(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleEnviarLivre}>
            <Mail className="h-4 w-4 mr-1" /> Abrir no Gmail
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
