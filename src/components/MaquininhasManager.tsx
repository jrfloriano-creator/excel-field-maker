import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Maquininha } from '@/types/titulo';
import { generateId } from '@/lib/storage';

interface Props {
  maquininhas: Maquininha[];
  onUpdate: (lista: Maquininha[]) => void;
}

export function MaquininhasManager({ maquininhas, onUpdate }: Props) {
  const [nome, setNome] = useState('');

  const add = () => {
    const n = nome.trim();
    if (!n) return;
    onUpdate([...maquininhas, { id: generateId(), nome: n }]);
    setNome('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">💳 Maquininhas/Operadoras</CardTitle>
        <p className="text-xs text-muted-foreground">Ex: Moderninha, InfinitPay, Itaú</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {maquininhas.map(m => (
          <div key={m.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
            <p className="text-sm flex-1 truncate">{m.nome}</p>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onUpdate(maquininhas.filter(x => x.id !== m.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Nome da maquininha"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
