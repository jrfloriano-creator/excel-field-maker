import { useState } from 'react';
import { ProprietarioConfig } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';

interface Props {
  proprietarios: ProprietarioConfig[];
  onUpdate: (proprietarios: ProprietarioConfig[]) => void;
}

export function ProprietariosManager({ proprietarios, onUpdate }: Props) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#FFD9B3');

  const handleAdd = () => {
    if (!nome.trim()) {
      toast.error('Informe o nome');
      return;
    }
    if (proprietarios.some(p => p.nome.toLowerCase() === nome.trim().toLowerCase())) {
      toast.error('Proprietário já cadastrado');
      return;
    }
    const novo: ProprietarioConfig = {
      id: generateId(),
      nome: nome.trim(),
      cor,
    };
    onUpdate([...proprietarios, novo]);
    setNome('');
    setCor('#FFD9B3');
    toast.success('Proprietário cadastrado');
  };

  const handleRemove = (id: string) => {
    if (proprietarios.length <= 1) {
      toast.error('É necessário ao menos 1 proprietário');
      return;
    }
    onUpdate(proprietarios.filter(p => p.id !== id));
    toast.success('Proprietário removido');
  };

  const handleColorChange = (id: string, novaCor: string) => {
    onUpdate(proprietarios.map(p => p.id === id ? { ...p, cor: novaCor } : p));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🎨 Proprietários</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cadastre proprietários e escolha a cor de fundo dos títulos.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {proprietarios.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border" style={{ backgroundColor: p.cor }}>
            <input
              type="color"
              value={p.cor}
              onChange={e => handleColorChange(p.id, e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border"
              title="Alterar cor"
            />
            <p className="text-sm font-medium flex-1 truncate" style={{ color: '#1a1a1a' }}>{p.nome}</p>
            <Button variant="ghost" size="sm" onClick={() => handleRemove(p.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Nome do proprietário</Label>
            <Input placeholder="Ex: João" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Cor de fundo dos títulos</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cor}
                onChange={e => setCor(e.target.value)}
                className="h-10 w-14 rounded cursor-pointer border"
              />
              <div className="flex-1 h-10 rounded border flex items-center px-3 text-sm" style={{ backgroundColor: cor, color: '#1a1a1a' }}>
                Pré-visualização
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Proprietário
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
