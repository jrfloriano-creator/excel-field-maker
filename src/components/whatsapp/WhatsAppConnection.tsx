// src/components/whatsapp/WhatsAppConnection.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ExternalLink } from 'lucide-react';

export const WhatsAppConnection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp
          </span>
          <Badge className="bg-green-500">Link direto (wa.me)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          O envio de mensagens é feito pelo link <strong>wa.me</strong>. Ao clicar em "Enviar pelo WhatsApp", 
          o sistema abre a conversa com a mensagem já preenchida. Você só precisa clicar em Enviar no seu WhatsApp.
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <ExternalLink className="w-4 h-4" />
          <span>Funciona com WhatsApp Web ou WhatsApp Desktop</span>
        </div>
      </CardContent>
    </Card>
  );
};
