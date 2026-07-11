import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { whatsappService } from '@/lib/whatsapp/whatsappService';
import { gerarMensagemWhatsApp, obterNomeCliente } from '@/lib/whatsapp/message';

interface EnviarWhatsAppButtonProps {
  titulos: any[];
  clientes: any[];
  onSuccess?: () => void;
  disabled?: boolean;
}

export const EnviarWhatsAppButton: React.FC<EnviarWhatsAppButtonProps> = ({
  titulos,
  clientes,
  onSuccess,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<'disconnected' | 'connected' | 'checking'>('checking');

  const verificarConexao = async () => {
    try {
      const status = await whatsappService.getStatus();
      setStatusConexao(status.status === 'connected' ? 'connected' : 'disconnected');
    } catch {
      setStatusConexao('disconnected');
    }
  };

  const titulosPorCliente = titulos.reduce((acc, titulo) => {
    const cliente = clientes.find(c => c.id === titulo.clienteId);
    if (cliente) {
      if (!acc[cliente.id]) {
        acc[cliente.id] = { cliente, titulos: [] };
      }
      acc[cliente.id].titulos.push(titulo);
    }
    return acc;
  }, {} as Record<string, { cliente: any; titulos: any[] }>);

  const handleOpen = () => {
    setIsOpen(true);
    verificarConexao();
  };

  const handleEnviar = async () => {
    if (statusConexao !== 'connected') {
      toast({
        title: '⚠️ WhatsApp não conectado',
        description: 'Conecte o WhatsApp antes de enviar mensagens.',
        variant: 'warning'
      });
      return;
    }

    setEnviando(true);
    const empresa = JSON.parse(localStorage.getItem('empresa_config') || '{}');

    try {
      const mensagens = Object.values(titulosPorCliente).map(grupo => ({
        phoneNumber: grupo.cliente.whatsapp || grupo.cliente.telefone,
        message: gerarMensagemWhatsApp({
          cliente: grupo.cliente,
          titulos: grupo.titulos,
          empresa,
          incluirPix: true,
          tipo: 'COBRANCA'
        })
      }));

      const result = await whatsappService.enviarEmLote(mensagens);

      const sucessos = result.results?.filter((r: any) => r.success)?.length || 0;
      
      if (sucessos > 0) {
        toast({
          title: `✅ ${sucessos} mensagens enviadas!`,
          description: sucessos < mensagens.length ? `${mensagens.length - sucessos} falhas.` : 'Todas as mensagens foram enviadas!'
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: '❌ Falha no envio',
          description: 'Nenhuma mensagem foi enviada.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: '❌ Erro ao enviar',
        description: error.message || 'Falha no envio',
        variant: 'destructive'
      });
    } finally {
      setEnviando(false);
    }
  };

  if (titulos.length === 0) return null;

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={disabled || titulos.length === 0}
        className="gap-2 bg-green-600 hover:bg-green-700"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp ({titulos.length})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💬 Enviar Mensagens WhatsApp</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
              {statusConexao === 'connected' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {statusConexao === 'disconnected' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {statusConexao === 'checking' && (
                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              )}
              <span className="text-sm">
                {statusConexao === 'connected' && '✅ WhatsApp conectado'}
                {statusConexao === 'disconnected' && '⚠️ WhatsApp desconectado'}
                {statusConexao === 'checking' && '🔄 Verificando conexão...'}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">📋 Resumo:</p>
              <p>{Object.keys(titulosPorCliente).length} clientes • {titulos.length} títulos</p>
            </div>

            <div className="space-y-3">
              {Object.values(titulosPorCliente).map((grupo) => {
                const nome = obterNomeCliente(grupo.cliente);
                return (
                  <div key={grupo.cliente.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">⭐ {nome}</span>
                        <span className="text-sm text-gray-500">
                          ({grupo.titulos.length} títulos - R$ {grupo.titulos.reduce((s, t) => s + t.valor, 0).toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 bg-white rounded p-2 text-sm whitespace-pre-wrap border max-h-32 overflow-y-auto">
                      {gerarMensagemWhatsApp({
                        cliente: grupo.cliente,
                        titulos: grupo.titulos,
                        empresa: JSON.parse(localStorage.getItem('empresa_config') || '{}'),
                        incluirPix: true,
                        tipo: 'COBRANCA'
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
              <Button
                onClick={handleEnviar}
                disabled={enviando || statusConexao !== 'connected'}
                className="bg-green-600 hover:bg-green-700"
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                {enviando ? 'Enviando...' : '💬 Enviar Agora'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
