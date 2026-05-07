import { useEffect, useState } from 'react';
import { FormaPagamento } from '@/types/titulo';
import { AppConfig, ChavePix, Titulo } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [novaForma, setNovaForma] = useState('');

  const formasPagamento = config.formasPagamento || [];

  const handleAddForma = () => {
    const nome = novaForma.trim();
    if (!nome) return;
    if (formasPagamento.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Forma de pagamento já cadastrada');
      return;
    }
    const nova: FormaPagamento = { id: generateId(), nome };
    onUpdate({ formasPagamento: [...formasPagamento, nova] });
    setNovaForma('');
    toast.success('Forma de pagamento adicionada');
  };

  const handleRemoveForma = (id: string) => {
    onUpdate({ formasPagamento: formasPagamento.filter(f => f.id !== id) });
  };

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

      <Tabs defaultValue="cadastros" className="w-full" onValueChange={(v) => window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: v } }))}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="cadastros" className="text-xs px-1 py-2">👥 Cadastros</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs px-1 py-2">💰 Financeiro</TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs px-1 py-2">🔔 Alertas</TabsTrigger>
          <TabsTrigger value="aparencia" className="text-xs px-1 py-2">🎨 Aparência</TabsTrigger>
          <TabsTrigger value="sistema" className="text-xs px-1 py-2">⚙️ Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastros" className="space-y-4 mt-4">
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
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Taxa de Juros Mensal (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                inputMode="decimal"
                value={config.taxa === 0 ? '' : String(config.taxa * 100)}
                placeholder="Ex: 1.5"
                onChange={e => {
                  const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                  const num = parseFloat(raw);
                  onUpdate({ taxa: isNaN(num) ? 0 : num / 100 });
                }}
              />
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">💳 Formas de Pagamento ({formasPagamento.length})</CardTitle>
              <p className="text-xs text-muted-foreground">Usadas ao registrar pagamento de títulos</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {formasPagamento.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2 bg-secondary rounded-md">
                  <p className="text-sm flex-1 truncate">{f.nome}</p>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveForma(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Dinheiro, PIX, Cartão"
                  value={novaForma}
                  onChange={e => setNovaForma(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddForma(); } }}
                />
                <Button variant="outline" size="sm" onClick={handleAddForma}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4 mt-4">
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

          <EmailPanel config={config} titulos={titulos} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-4 mt-4">
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
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">🤖 Avatar de Ajuda</p>
                <p className="text-xs text-muted-foreground">Mascote com dicas em cada aba</p>
              </div>
              <Switch
                checked={config.avatarAjudaAtivo ?? true}
                onCheckedChange={(checked) => onUpdate({ avatarAjudaAtivo: checked })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4 mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
