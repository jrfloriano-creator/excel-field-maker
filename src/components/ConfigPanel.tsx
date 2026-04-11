import { useState } from 'react';
import { AppConfig, ChavePix, TelefoneAlerta } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: (data: Partial<AppConfig>) => void;
}

export function ConfigPanel({ config, onUpdate }: ConfigPanelProps) {
  const [novaPixNome, setNovaPixNome] = useState('');
  const [novaPixChave, setNovaPixChave] = useState('');

  const handleAddPix = () => {
    if (!novaPixNome || !novaPixChave) return;
    if (config.chavesPix.length >= 5) {
      toast.error('Máximo de 5 chaves PIX');
      return;
    }
    const nova: ChavePix = { id: generateId(), nome: novaPixNome, chave: novaPixChave };
    onUpdate({ chavesPix: [...config.chavesPix, nova] });
    setNovaPixNome('');
    setNovaPixChave('');
    toast.success('Chave PIX adicionada');
  };

  const handleRemovePix = (id: string) => {
    onUpdate({ chavesPix: config.chavesPix.filter(p => p.id !== id) });
  };

  const handleTelefoneChange = (index: number, value: string) => {
    const updated = [...config.telefonesAlerta];
    updated[index] = { ...updated[index], numero: value.replace(/\D/g, '') };
    onUpdate({ telefonesAlerta: updated });
  };

  const handleTelefoneToggle = (index: number) => {
    const updated = [...config.telefonesAlerta];
    updated[index] = { ...updated[index], ativo: !updated[index].ativo };
    onUpdate({ telefonesAlerta: updated });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configurações</h2>

      {/* Taxa de juros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Taxa de Juros Mensal (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={(config.taxa * 100).toFixed(1)}
            onChange={e => onUpdate({ taxa: parseFloat(e.target.value) / 100 })}
          />
        </CardContent>
      </Card>

      {/* Dark Mode */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">🌙 Fundo Escuro</p>
            <p className="text-xs text-muted-foreground">Ativar modo escuro</p>
          </div>
          <Switch
            checked={config.darkMode}
            onCheckedChange={(checked) => {
              onUpdate({ darkMode: checked });
              document.documentElement.classList.toggle('dark', checked);
            }}
          />
        </CardContent>
      </Card>

      {/* Telefones para alerta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📱 Telefones para Alerta Diário</CardTitle>
          <p className="text-xs text-muted-foreground">Receba alertas de boletos a vencer no dia seguinte</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.telefonesAlerta.map((tel, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="tel"
                placeholder={`Telefone ${i + 1}`}
                value={tel.numero}
                onChange={e => handleTelefoneChange(i, e.target.value)}
                className="flex-1"
              />
              <Switch
                checked={tel.ativo}
                onCheckedChange={() => handleTelefoneToggle(i)}
              />
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <Label className="text-xs whitespace-nowrap">⏰ Horário de envio:</Label>
            <Input
              type="time"
              value={config.horarioAlerta || '08:00'}
              onChange={e => onUpdate({ horarioAlerta: e.target.value })}
              className="w-28"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mensagem enviada via WhatsApp: Nome do Cliente e Valor do título a vencer no dia seguinte.
          </p>
        </CardContent>
      </Card>

      {/* Chaves PIX */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🔑 Chaves PIX ({config.chavesPix.length}/5)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.chavesPix.map(pix => (
            <div key={pix.id} className="flex items-center gap-2 p-2 bg-secondary rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pix.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{pix.chave}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemovePix(pix.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {config.chavesPix.length < 5 && (
            <div className="space-y-2">
              <Input
                placeholder="Nome da chave (ex: Banco X)"
                value={novaPixNome}
                onChange={e => setNovaPixNome(e.target.value)}
              />
              <Input
                placeholder="Chave PIX"
                value={novaPixChave}
                onChange={e => setNovaPixChave(e.target.value)}
              />
              <Button variant="outline" size="sm" className="w-full" onClick={handleAddPix}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Chave PIX
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium">🔐 Senha de Segurança</p>
          <p className="text-xs text-muted-foreground mb-2">
            {config.pin ? 'Senha cadastrada. Usada para excluir títulos e acessar configurações.' : 'Nenhuma senha cadastrada.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Trigger PIN setup from parent
              const event = new CustomEvent('reset-pin');
              window.dispatchEvent(event);
            }}
          >
            {config.pin ? 'Alterar Senha' : 'Criar Senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
