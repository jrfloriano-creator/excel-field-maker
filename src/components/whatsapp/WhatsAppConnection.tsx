import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { whatsappService } from '@/lib/whatsapp/whatsappService';
import { QRCodeSVG } from 'qrcode.react';

export const WhatsAppConnection: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'qr'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarStatus();
    whatsappService.iniciarEventStream();

    const statusListener = (newStatus: any) => {
      setStatus(newStatus.status);
      setQrCode(newStatus.qrCode || null);
      setErro(newStatus.error || null);
    };

    const qrListener = (qr: string) => {
      setQrCode(qr);
      setStatus('qr');
    };

    whatsappService.onStatusChange(statusListener);
    whatsappService.onQRCode(qrListener);

    return () => {
      whatsappService.fecharEventStream();
      whatsappService.removeListener(statusListener);
    };
  }, []);

  const carregarStatus = async () => {
    try {
      const result = await whatsappService.getStatus();
      setStatus(result.status);
      setQrCode(result.qrCode || null);
      setErro(result.error || null);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const handleConectar = async () => {
    setLoading(true);
    try {
      const result = await whatsappService.conectar();
      if (!result.success) {
        toast({
          title: '❌ Erro ao conectar',
          description: result.error || 'Falha na conexão',
          variant: 'destructive'
        });
      } else {
        toast({
          title: '🔄 Conectando...',
          description: 'Aguardando QR Code para autenticação'
        });
        setStatus('connecting');
      }
    } catch (error: any) {
      toast({
        title: '❌ Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDesconectar = async () => {
    try {
      await whatsappService.desconectar();
      setStatus('disconnected');
      setQrCode(null);
      toast({
        title: '🔌 Desconectado',
        description: 'WhatsApp desconectado com sucesso'
      });
    } catch (error: any) {
      toast({
        title: '❌ Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">🟢 Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500">🔄 Conectando...</Badge>;
      case 'qr':
        return <Badge className="bg-blue-500">📱 Escaneie o QR Code</Badge>;
      default:
        return <Badge variant="destructive">⛔ Desconectado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📱 WhatsApp</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {status === 'connected' ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span>
            {status === 'connected' && 'Conectado ao WhatsApp!'}
            {status === 'connecting' && 'Conectando...'}
            {status === 'qr' && 'Escaneie o QR Code com seu WhatsApp'}
            {status === 'disconnected' && 'Desconectado'}
          </span>
        </div>

        {status === 'qr' && qrCode && (
          <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <QRCodeSVG value={qrCode} size={200} level="H" />
            </div>
            <p className="text-sm text-gray-500 text-center">
              1. Abra o WhatsApp no seu celular<br />
              2. Toque em Menu (⋮) ou Configurações<br />
              3. Selecione "WhatsApp Web"<br />
              4. Escaneie o QR Code
            </p>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 p-3 rounded-lg text-red-600 text-sm">
            ⚠️ {erro}
          </div>
        )}

        <div className="flex gap-2">
          {status === 'disconnected' || status === 'qr' ? (
            <Button onClick={handleConectar} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </Button>
          ) : status === 'connected' ? (
            <Button onClick={handleDesconectar} variant="destructive" className="flex-1">
              <WifiOff className="w-4 h-4" />
              Desconectar
            </Button>
          ) : (
            <Button onClick={handleConectar} disabled className="flex-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando...
            </Button>
          )}
          <Button variant="outline" onClick={carregarStatus} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
