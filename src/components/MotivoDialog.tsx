import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MotivoAlteracao } from '@/types/titulo';
import { X } from 'lucide-react';

interface Props {
  acao: string; // descrição da ação
  motivos: MotivoAlteracao[];
  onConfirm: (motivo: string) => void;
  onClose: () => void;
}

export function MotivoDialog({ acao, motivos, onConfirm, onClose }: Props) {
  const [sel, setSel] = useState<string>('');
  const [outro, setOutro] = useState('');

  const handleOk = () => {
    let texto = '';
    if (sel === '__outro__') texto = outro.trim();
    else texto = motivos.find(m => m.id === sel)?.texto || '';
    if (!texto) return;
    onConfirm(texto);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Motivo da alteração</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{acao}</p>
          <div>
            <Label className="text-xs">Selecione o motivo</Label>
            <Select value={sel} onValueChange={setSel}>
              <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
              <SelectContent>
                {motivos.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">Cadastre motivos em Config › Cadastros</div>
                )}
                {motivos.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.texto}</SelectItem>
                ))}
                <SelectItem value="__outro__">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sel === '__outro__' && (
            <Textarea
              rows={3}
              placeholder="Descreva o motivo"
              value={outro}
              onChange={e => setOutro(e.target.value)}
            />
          )}
          <Button className="w-full" onClick={handleOk} disabled={!sel || (sel === '__outro__' && !outro.trim())}>
            Confirmar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
