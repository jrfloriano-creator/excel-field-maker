import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { MotivoAlteracao } from '@/types/titulo';
import { generateId } from '@/lib/storage';

interface Props {
  motivos: MotivoAlteracao[];
  onUpdate: (lista: MotivoAlteracao[]) => void;
}

export function MotivosManager({ motivos, onUpdate }: Props) {
  const [texto, setTexto] = useState('');

  const add = () => {
    const t = texto.trim();
    if (!t) return;
    onUpdate([...motivos, { id: generateId(), texto: t }]);
    setTexto('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">📝 Motivos de Exclusão/Alteração</CardTitle>
        <p className="text-xs text-muted-foreground">Usados ao excluir ou alterar títulos e clientes.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {motivos.map(m => (
          <div key={m.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
            <p className="text-sm flex-1 truncate">{m.texto}</p>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onUpdate(motivos.filter(x => x.id !== m.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Erro de digitação"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
