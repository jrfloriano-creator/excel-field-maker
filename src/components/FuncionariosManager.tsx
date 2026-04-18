import { useState } from 'react';
import { Funcionario } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { generateId, hashPin } from '@/lib/storage';
import { toast } from 'sonner';

interface Props {
  funcionarios: Funcionario[];
  onUpdate: (funcionarios: Funcionario[]) => void;
}

export function FuncionariosManager({ funcionarios, onUpdate }: Props) {
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');

  const handleAdd = () => {
    if (!nome.trim()) {
      toast.error('Informe o nome');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('Senha deve ter 4 dígitos');
      return;
    }
    if (funcionarios.some(f => f.nome.toLowerCase() === nome.trim().toLowerCase())) {
      toast.error('Funcionário já cadastrado');
      return;
    }
    const novo: Funcionario = {
      id: generateId(),
      nome: nome.trim(),
      pin: hashPin(pin),
    };
    onUpdate([...funcionarios, novo]);
    setNome('');
    setPin('');
    toast.success('Funcionário cadastrado');
  };

  const handleRemove = (id: string) => {
    onUpdate(funcionarios.filter(f => f.id !== id));
    toast.success('Funcionário removido');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">👥 Funcionários Autorizados</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cadastre funcionários com senha individual de 4 dígitos. A senha será exigida ao receber um título.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {funcionarios.map(f => (
          <div key={f.id} className="flex items-center gap-2 p-2 bg-secondary rounded-md">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.nome}</p>
              <p className="text-xs text-muted-foreground">Senha: ••••</p>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(f.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Nome do funcionário</Label>
            <Input
              placeholder="Ex: João Silva"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Senha (4 dígitos)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="text-center tracking-[0.5em]"
            />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Funcionário
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
