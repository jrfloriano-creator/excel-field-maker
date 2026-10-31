import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface MotivoDialogProps {
  acao: string;
  motivos?: string[]; // ← opcional, pode não vir
  onConfirm: (motivo: string) => void;
  onClose: () => void;
}

export function MotivoDialog({ acao, motivos = [], onConfirm, onClose }: MotivoDialogProps) {
  const [motivo, setMotivo] = useState('');

  // Garante que motivos é sempre um array ✅
  const listaMotivos = Array.isArray(motivos) ? motivos : [];

  // ✅ CORREÇÃO: normaliza itens que podem ser string ou objeto {id, texto}
  const textoDoMotivo = (m: any): string => {
    if (typeof m === 'string') return m;
    return m?.texto || m?.motivo || '';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmação</DialogTitle>
          <DialogDescription>{acao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Informe o motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo..."
            />
          </div>

          {/* Lista de motivos salvos — com proteção ✅ */}
          {listaMotivos.length > 0 && (
            <div className="space-y-2">
              <Label>Motivos frequentes</Label>
              <div className="flex flex-wrap gap-2">
                {listaMotivos.map((m, i) => {
                  const texto = textoDoMotivo(m);
                  return (
                    <Button
                      key={i}
                      variant="secondary"
                      size="sm"
                      onClick={() => setMotivo(texto)}
                    >
                      {texto}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(motivo)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}