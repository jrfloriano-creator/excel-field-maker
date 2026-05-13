import { useEffect, useState } from 'react';
import { FormaPagamento, AppConfig, ChavePix, Titulo } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Send, FolderOpen } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';
import { calcularTitulo, formatCurrency, formatDate } from '@/lib/calculos';
import { FuncionariosManager } from '@/components/FuncionariosManager';
import { ProprietariosManager } from '@/components/ProprietariosManager';
import { BackupPanel } from '@/components/BackupPanel';
import { EmailPanel } from '@/components/EmailPanel';
import { UsuariosManager } from '@/components/UsuariosManager';
import { MotivosManager } from '@/components/MotivosManager';
import { MaquininhasManager } from '@/components/MaquininhasManager';
import { LogoPanel } from '@/components/LogoPanel';
import { LogPanel } from '@/components/LogPanel';
import { hasPerm, SessionUser } from '@/lib/auth';
import { openExternalUrl } from '@/lib/openUrl';

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: (data: Partial<AppConfig>) => void;
  titulos?: Titulo[];
  onImportTitulos?: (titulos: Titulo[]) => void;
  user: SessionUser | null;
}

export function ConfigPanel({ config, onUpdate, titulos = [], onImportTitulos, user }: ConfigPanelProps) {
  const [novaPixNome, setNovaPixNome] = useState('');
  const [novaPixChave, setNovaPixChave] = useState('');
  const [novaForma, setNovaForma] = useState('');

  const formasPagamento = config.formasPagamento || [];

  const can = (p: any) => hasPerm(config, user, p);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: 'cadastros' } }));
  }, []);

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  const titulosAmanha = titulos.map(t => calcularTitulo(t, config.taxa))
    .filter(t => t.vencimento === amanhaStr && t.situacao !== 'PAGO');

  const handleSendAlerts = () => {
    if (titulosAmanha.length === 0) { toast.info('Nenhum título vence amanhã'); return; }
    const ativos = config.telefonesAlerta.filter(t => t.ativo && t.numero);
    if (ativos.length === 0) { toast.error('Nenhum telefone de alerta ativo'); return; }
    ativos.forEach(tel => {
      titulosAmanha.forEach(t => {
        const cli = config.clientes.find(c => c.id === t.clienteId);
        const apelido = (cli?.apelido && cli.apelido.trim()) || t.cliente;
        const msg = `⚠️ Alerta de Vencimento\n\nCliente: ${apelido}\nValor: ${formatCurrency(t.valor)}\nVencimento: ${formatDate(t.vencimento)} (amanhã)`;
        openExternalUrl(`https://wa.me/55${tel.numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
      });
    });
    toast.success(`${titulosAmanha.length} alerta(s) abertos`);
  };

  const handleAddPix = () => {
    if (!novaPixNome || !novaPixChave) return;
    if (config.chavesPix.length >= 5) { toast.error('Máximo de 5 chaves PIX'); return; }
    onUpdate({ chavesPix: [...config.chavesPix, { id: generateId(), nome: novaPixNome, chave: novaPixChave }] });
    setNovaPixNome(''); setNovaPixChave('');
  };

  const handleAddForma = () => {
    const nome = novaForma.trim();
    if (!nome) return;
    if (formasPagamento.some(f => f.nome.toLowerCase() === nome.toLowerCase())) { toast.error('Já cadastrada'); return; }
    onUpdate({ formasPagamento: [...formasPagamento, { id: generateId(), nome } as FormaPagamento] });
    setNovaForma('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configurações</h2>

      <Tabs defaultValue="cadastros" className="w-full" onValueChange={(v) => window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: v } }))}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="cadastros" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">👥 Cadastros</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">💰 Financeiro</TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">🔔 Alertas</TabsTrigger>
          <TabsTrigger value="aparencia" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">🎨 Aparência</TabsTrigger>
          <TabsTrigger value="sistema" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">⚙️ Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastros" className="space-y-4 mt-4">
          <UsuariosManager config={config} onUpdate={onUpdate} />
          {can('config.proprietarios') && (
            <ProprietariosManager proprietarios={config.proprietarios} onUpdate={(proprietarios) => onUpdate({ proprietarios })} />
          )}
          {can('config.funcionarios') && (
            <FuncionariosManager funcionarios={config.funcionarios} onUpdate={(funcionarios) => onUpdate({ funcionarios })} />
          )}
          {can('config.credor') && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">📝 Credor (Notas Promissórias)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div><Label className="text-xs">Nome</Label>
                  <Input value={config.credor?.nome || ''} onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), nome: e.target.value } })} /></div>
                <div><Label className="text-xs">CPF/CNPJ</Label>
                  <Input value={config.credor?.cpfCnpj || ''} onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), cpfCnpj: e.target.value } })} /></div>
                <div><Label className="text-xs">Cidade/Estado</Label>
                  <Input value={config.credor?.cidadeEstado || ''} onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), cidadeEstado: e.target.value } })} /></div>
              </CardContent>
            </Card>
          )}
          <MotivosManager motivos={config.motivosAlteracao || []} onUpdate={(lista) => onUpdate({ motivosAlteracao: lista })} />
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-4">
          {can('config.taxa') && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Taxa de Juros Mensal (%)</CardTitle></CardHeader>
              <CardContent>
                <Input type="text" inputMode="decimal" value={config.taxa === 0 ? '' : String(config.taxa * 100)}
                  placeholder="Ex: 1.5"
                  onChange={e => {
                    const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                    const num = parseFloat(raw);
                    onUpdate({ taxa: isNaN(num) ? 0 : num / 100 });
                  }} />
              </CardContent>
            </Card>
          )}
          {can('config.pix') && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">🔑 Chaves PIX ({config.chavesPix.length}/5)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {config.chavesPix.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <div className="flex-1 min-w-0"><p className="text-sm truncate">{p.nome}</p><p className="text-xs text-muted-foreground truncate">{p.chave}</p></div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onUpdate({ chavesPix: config.chavesPix.filter(x => x.id !== p.id) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {config.chavesPix.length < 5 && (
                  <div className="space-y-2">
                    <Input placeholder="Nome" value={novaPixNome} onChange={e => setNovaPixNome(e.target.value)} />
                    <Input placeholder="Chave PIX" value={novaPixChave} onChange={e => setNovaPixChave(e.target.value)} />
                    <Button variant="outline" size="sm" className="w-full" onClick={handleAddPix}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {can('config.formasPagamento') && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">💳 Formas de Pagamento ({formasPagamento.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {formasPagamento.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <p className="text-sm flex-1 truncate">{f.nome}</p>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onUpdate({ formasPagamento: formasPagamento.filter(x => x.id !== f.id) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Ex: PIX, Cartão" value={novaForma} onChange={e => setNovaForma(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddForma(); } }} />
                  <Button variant="outline" size="sm" onClick={handleAddForma}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}
          {can('config.maquininhas') && (
            <MaquininhasManager maquininhas={config.maquininhas || []} onUpdate={(lista) => onUpdate({ maquininhas: lista })} />
          )}
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4 mt-4">
          {can('config.telefonesAlerta') && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">📱 Telefones para Alerta Diário</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {config.telefonesAlerta.map((tel, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="tel" placeholder={`Telefone ${i + 1}`} value={tel.numero}
                      onChange={e => { const u = [...config.telefonesAlerta]; u[i] = { ...u[i], numero: e.target.value.replace(/\D/g, '') }; onUpdate({ telefonesAlerta: u }); }} className="flex-1" />
                    <Switch checked={tel.ativo} onCheckedChange={() => { const u = [...config.telefonesAlerta]; u[i] = { ...u[i], ativo: !u[i].ativo }; onUpdate({ telefonesAlerta: u }); }} />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleSendAlerts}>
                  <Send className="h-4 w-4 mr-1" /> Enviar Alertas Agora ({titulosAmanha.length})
                </Button>
              </CardContent>
            </Card>
          )}
          {(can('config.emailCobranca') || can('config.emailEnviar')) && (
            <EmailPanel config={config} titulos={titulos} onUpdate={onUpdate} />
          )}
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-4 mt-4">
          {can('config.darkMode') && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="font-medium text-sm">🌙 Fundo Escuro</p></div>
                <Switch checked={config.darkMode} onCheckedChange={(c) => { onUpdate({ darkMode: c }); document.documentElement.classList.toggle('dark', c); }} />
              </CardContent>
            </Card>
          )}
          {can('config.avatar') && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="font-medium text-sm">🤖 Avatar de Ajuda</p></div>
                <Switch checked={config.avatarAjudaAtivo ?? true} onCheckedChange={(c) => onUpdate({ avatarAjudaAtivo: c })} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">📁 Pasta para Salvar Dados (Promissórias/PDF)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs">Caminho no computador</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: C:\Documentos\ZOOM\PDFs"
                  value={config.caminhoSalvarDados || ''}
                  onChange={e => onUpdate({ caminhoSalvarDados: e.target.value })}
                  className="flex-1 text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Selecionar pasta"
                  onClick={async () => {
                    try {
                      // Tenta usar Tauri dialog API se disponível
                      if ((window as any).__TAURI_INTERNALS__) {
                        const { open } = await import('@tauri-apps/plugin-dialog');
                        const selected = await open({ directory: true, multiple: false, title: 'Selecionar pasta para salvar dados' });
                        if (selected && typeof selected === 'string') {
                          onUpdate({ caminhoSalvarDados: selected });
                          toast.success('Pasta selecionada');
                        }
                      } else {
                        toast.info('Seleção de pasta disponível apenas no app desktop. Digite o caminho manualmente.');
                      }
                    } catch {
                      toast.info('Digite o caminho da pasta manualmente.');
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Informe o caminho onde deseja salvar os arquivos PDF e Promissórias gerados pelo sistema.
              </p>
              <Button size="sm" className="w-full" onClick={() => { toast.success('Caminho salvo!'); }}>
                Salvar Caminho
              </Button>
            </CardContent>
          </Card>
          <LogoPanel logo={config.logoEmpresa} onUpdate={(logo) => onUpdate({ logoEmpresa: logo })} />
          {can('config.backup') && (
            <BackupPanel titulos={titulos} config={config} onImportTitulos={(t) => onImportTitulos?.(t)} onImportConfig={(p) => onUpdate(p)} />
          )}
          <LogPanel logs={config.logs || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
