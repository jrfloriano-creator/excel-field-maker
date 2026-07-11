/**
 * WhatsAppConnection — Card de conexão com o backend WhatsApp (Fase 1).
 *
 * Exibe o status atual da conexão (badges coloridos), renderiza o QR Code
 * para pareamento quando necessário e oferece botões para conectar,
 * desconectar e atualizar o status manualmente.
 */
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw, Smartphone, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappService, ConnectionState } from '@/lib/whatsapp/whatsappService';

const STATUS_CONFIG: Record<ConnectionState['status'], { label: string; className: string; icon: React.ReactNode }> = {
  connected: { label: 'Conectado', className: 'bg-green-500 text-white border-green-500', icon: <Wifi className="h-3 w-3" /> },
  connecting: { label: 'Conectando...', className: 'bg-yellow-500 text-white border-yellow-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  qr: { label: 'Aguardando leitura do QR Code', className: 'bg-blue-500 text-white border-blue-500', icon: <Smartphone className="h-3 w-3" /> },
  disconnected: { label: 'Desconectado', className: 'bg-red-500 text-white border-red-500', icon: <WifiOff className="h-3 w-3" /> },
};

export function WhatsAppConnection() {
  const [state, setState] = useState<ConnectionState>({ status: 'disconnected' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    whatsappService
      .getStatus()
      .then(setState)
      .catch(() => {
        // backend pode estar offline; mantém estado padrão "disconnected"
      });

    whatsappService.iniciarEventStream();
    const unsubscribe = whatsappService.onStatusChange(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleConectar = async () => {
    setLoading(true);
    try {
      const novoEstado = await whatsappService.conectar();
      setState(novoEstado);
      toast.success('Iniciando conexão com o WhatsApp...');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao conectar com o backend WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDesconectar = async () => {
    setLoading(true);
    try {
      const novoEstado = await whatsappService.desconectar();
      setState(novoEstado);
      toast.success('WhatsApp desconectado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const novoEstado = await whatsappService.getStatus();
      setState(novoEstado);
    } catch (e) {
      toast.error('Backend WhatsApp indisponível. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = STATUS_CONFIG[state.status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" /> Conexão WhatsApp
          </CardTitle>
          <Badge className={`gap-1 ${cfg.className}`}>
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === 'connected' && (
          <p className="text-xs text-muted-foreground">
            Conectado {state.phoneNumber ? `como +${state.phoneNumber}` : ''}
            {state.connectedAt ? ` desde ${new Date(state.connectedAt).toLocaleString('pt-BR')}` : ''}
          </p>
        )}

        {state.status === 'qr' && state.qrCode && (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="p-3 bg-white rounded-lg border border-border">
              <QRCodeSVG value={state.qrCode} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar um aparelho e escaneie o código acima.
            </p>
          </div>
        )}

        {state.status === 'disconnected' && state.lastError && (
          <p className="text-xs text-destructive">Último erro: {state.lastError}</p>
        )}

        <div className="flex gap-2">
          {state.status === 'connected' ? (
            <Button variant="destructive" size="sm" className="flex-1" onClick={handleDesconectar} disabled={loading}>
              Desconectar
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConectar}
              disabled={loading || state.status === 'connecting'}
            >
              Conectar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} title="Atualizar status">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
