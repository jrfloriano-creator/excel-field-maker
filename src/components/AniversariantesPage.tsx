// src/components/AniversariantesPage.tsx
import { useEffect, useState } from 'react';
import { AppConfig, Cliente } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dbDriver } from '@/lib/database';
import { toast } from 'sonner';
import { montarMensagemAniversario } from '@/lib/financeiro';
import { WhatsAppPreviewModal } from '@/components/modals/WhatsAppPreviewModal';

interface AniversariantesPageProps {
  config: AppConfig;
}

function getBirthdayMonth(dataNascimento: string): number {
  const trimmed = dataNascimento.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseInt(trimmed.split('-')[1], 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return parseInt(trimmed.split('/')[1], 10);
  return -1;
}

function formatBirthday(dataNascimento: string): string {
  const trimmed = dataNascimento.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[2]}/${parts[1]}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[0]}/${parts[1]}`;
  }
  return trimmed;
}

export function AniversariantesPage({ config }: AniversariantesPageProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const enviadosStorageKey = `aniversario_enviados_${currentYear}`;
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  
  // ✅ Estado para o Modal de Pré-visualização
  const [previewData, setPreviewData] = useState<{ open: boolean; telefone: string; nome: string; mensagem: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await dbDriver.kvGet(enviadosStorageKey);
      if (!cancelled && Array.isArray(stored)) setEnviados(new Set(stored));
    })();
    return () => { cancelled = true; };
  }, [enviadosStorageKey]);

  const aniversariantes = config.clientes.filter(c =>
    c.dataNascimento && getBirthdayMonth(c.dataNascimento) === currentMonth
  );

  const mensagemBase = config.mensagemAniversario || 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!';

  const handleWhatsApp = (cliente: Cliente) => {
    const phone = (cliente.telefone || '').replace(/\D/g, '');
    if (!phone) {
      toast.error(`O cliente ${cliente.nome} não possui telefone cadastrado.`);
      return;
    }
    
    const mensagem = montarMensagemAniversario({ cliente, mensagemBase });

    // ✅ Abre o modal para revisão em vez de enviar direto
    setPreviewData({
      open: true,
      telefone: cliente.telefone,
      nome: cliente.apelido || cliente.nome.split(' ')[0],
      mensagem: mensagem
    });

    // Marca como enviado no histórico
    setEnviados(prev => {
      const next = new Set(prev).add(cliente.id);
      dbDriver.kvSet(enviadosStorageKey, Array.from(next));
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            Aniversariantes de {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}
            <span className="ml-auto text-[11px] bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded font-medium">
              {aniversariantes.length} cliente{aniversariantes.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aniversariantes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Cake className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum aniversariante neste mês.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {aniversariantes
                .slice()
                .sort((a, b) => {
                  const getDay = (d: string) => {
                    const t = d.trim();
                    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return parseInt(t.split('-')[2], 10);
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return parseInt(t.split('/')[0], 10);
                    return 0;
                  };
                  return getDay(a.dataNascimento || '') - getDay(b.dataNascimento || '');
                })
                .map(cliente => {
                  const hasPhone = !!(cliente.telefone || '').replace(/\D/g, '');
                  const jaEnviado = enviados.has(cliente.id);
                  return (
                    <div
                      key={cliente.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        jaEnviado ? 'bg-green-100 hover:bg-green-200' : 'bg-card hover:bg-accent/30'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-semibold text-sm truncate', jaEnviado && 'text-black')}>
                          {cliente.nome}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">🎂 {formatBirthday(cliente.dataNascimento!)}</span>
                          {cliente.telefone && <span className="text-xs text-muted-foreground">📱 {cliente.telefone}</span>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10 hover:text-green-700"
                        disabled={!hasPhone}
                        title={hasPhone ? 'Enviar parabéns via WhatsApp' : 'Cliente sem telefone cadastrado'}
                        onClick={() => handleWhatsApp(cliente)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground">
            <strong>Mensagem configurada:</strong> <span className="italic">{mensagemBase}</span>
          </p>
        </CardContent>
      </Card>

      {/* ✅ Renderização do Modal de Pré-visualização */}
      {previewData && (
        <WhatsAppPreviewModal
          open={previewData.open}
          onOpenChange={(open) => !open && setPreviewData(null)}
          telefone={previewData.telefone}
          nomeDestinatario={previewData.nome}
          mensagemInicial={previewData.mensagem}
        />
      )}
    </div>
  );
}