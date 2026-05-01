import { useState } from 'react';
import { AppConfig, ChavePix, Titulo } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Send } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';
import { calcularTitulo, formatCurrency, formatDate } from '@/lib/calculos';
import { FuncionariosManager } from '@/components/FuncionariosManager';
import { ProprietariosManager } from '@/components/ProprietariosManager';
import { BackupPanel } from '@/components/BackupPanel';
import { EmailPanel } from '@/components/EmailPanel';

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: (data: Partial<AppConfig>) => void;
  titulos?: Titulo[];
  onImportTitulos?: (titulos: Titulo[]) => void;
}

export function ConfigPanel({ config, onUpdate, titulos = [], onImportTitulos }: ConfigPanelProps) {
  const [novaPixNome, setNovaPixNome] = useState('');
  const [novaPixChave, setNovaPixChave] = useState('');

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  const titulosAmanha = titulos
    .map(t => calcularTitulo(t, config.taxa))
    .filter(t => t.vencimento === amanhaStr && t.situacao !== 'PAGO');

  const handleSendAlerts = () => {
    if (titulosAmanha.length === 0) {
      toast.info('Nenhum título vence amanhã');
      return;
    }
    const telefonesAtivos = config.telefonesAlerta.filter(t => t.ativo && t.numero);
    if (telefonesAtivos.length === 0) {
      toast.error('Nenhum telefone de alerta ativo');
      return;
    }
    telefonesAtivos.forEach(tel => {
      titulosAmanha.forEach(titulo => {
        const msg = `⚠️ Alerta de Vencimento\n\nCliente: ${titulo.cliente}\nValor: ${formatCurrency(titulo.valor)}\nVencimento: ${formatDate(titulo.vencimento)} (amanhã)`;
        const link = `https://wa.me/55${tel.numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
      });
    });
    toast.success(`${titulosAmanha.length} alerta(s) aberto(s) no WhatsApp`);
  };

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

      <ProprietariosManager
        proprietarios={config.proprietarios}
        onUpdate={(proprietarios) => onUpdate({ proprietarios })}
      />

      <FuncionariosManager
        funcionarios={config.funcionarios}
        onUpdate={(funcionarios) => onUpdate({ funcionarios })}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📝 Credor (Notas Promissórias)</CardTitle>
          <p className="text-xs text-muted-foreground">Dados usados na emissão das promissórias</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label className="text-xs">Nome Completo</Label>
            <Input
              value={config.credor?.nome || ''}
              onChange={e => onUpdate({ credor: { ...(config.credor || { nome: '', cpfCnpj: '', cidadeEstado: '' }), nome: e.target.value } })}
              placeholder="Nome do credor"
            />
          </div>
          <div>
            <Label className="text-xs">CPF/CNPJ</Label>
            <Input
              value={config.credor?.cpfCnpj || ''}
              onChange={e => onUpdate({ credor: { ...(config.credor || { nome: '', cpfCnpj: '', cidadeEstado: '' }), cpfCnpj: e.target.value } })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <Label className="text-xs">Cidade/Estado (Pagável em)</Label>
            <Input
              value={config.credor?.cidadeEstado || ''}
              onChange={e => onUpdate({ credor: { ...(config.credor || { nome: '', cpfCnpj: '', cidadeEstado: '' }), cidadeEstado: e.target.value } })}
              placeholder="Ex: São Paulo/SP"
            />
          </div>
        </CardContent>
      </Card>

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
              <Switch checked={tel.ativo} onCheckedChange={() => handleTelefoneToggle(i)} />
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
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 text-paid border-paid/30 hover:bg-paid/10"
            onClick={handleSendAlerts}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar Alertas Agora ({titulosAmanha.length} título{titulosAmanha.length !== 1 ? 's' : ''} vencem amanhã)
          </Button>
        </CardContent>
      </Card>

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
              <Input placeholder="Nome da chave (ex: Banco X)" value={novaPixNome} onChange={e => setNovaPixNome(e.target.value)} />
              <Input placeholder="Chave PIX" value={novaPixChave} onChange={e => setNovaPixChave(e.target.value)} />
              <Button variant="outline" size="sm" className="w-full" onClick={handleAddPix}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Chave PIX
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BackupPanel
        titulos={titulos}
        config={config}
        onImportTitulos={(t) => onImportTitulos?.(t)}
        onImportConfig={(patch) => onUpdate(patch)}
      />

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
