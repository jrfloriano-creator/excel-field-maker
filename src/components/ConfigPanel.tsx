import { useEffect, useState } from 'react';
import { FormaPagamento, AppConfig, ChavePix, Titulo, ALL_PERMISSOES, PERMISSAO_LABELS, NivelUsuario, Permissao, Desconto, ContaPagarCategoria, ContasPagarConfig } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Send, FolderOpen, Shield, Clock, Percent, DollarSign } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';
import { calcularTitulo, formatCurrency, formatDate } from '@/lib/calculos';
import { ProprietariosManager } from '@/components/ProprietariosManager';
import { BackupPanel } from '@/components/BackupPanel';
import { EmailPanel } from '@/components/EmailPanel';
import { UsuariosManager } from '@/components/UsuariosManager';
import { MotivosManager } from '@/components/MotivosManager';
import { MaquininhasManager } from '@/components/MaquininhasManager';
import { LogoPanel } from '@/components/LogoPanel';
import { LogPanel } from '@/components/LogPanel';
import { hasPerm, SessionUser, defaultPermissoes } from '@/lib/auth';
import { openExternalUrl } from '@/lib/openUrl';

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: (data: Partial<AppConfig>) => void;
  titulos?: Titulo[];
  onImportTitulos?: (titulos: Titulo[]) => void;
  user: SessionUser | null;
  initialTab?: 'cadastros' | 'financeiro' | 'contas-pagar' | 'alertas' | 'aparencia' | 'sistema';
}

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  MASTER: 'MASTER',
  GERENCIAL: 'GERENCIAL',
  USUARIO: 'USUÁRIO',
};

const CONTAS_PAGAR_CATEGORIAS: { value: ContaPagarCategoria; label: string }[] = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'FUNCIONARIO', label: 'Funcionário' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'UTILIDADE', label: 'Utilidade' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'OUTRO', label: 'Outro' },
];

export function ConfigPanel({ config, onUpdate, titulos = [], onImportTitulos, user, initialTab = 'cadastros' }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<ConfigPanelProps['initialTab']>(initialTab);
  const [novaPixNome, setNovaPixNome] = useState('');
  const [novaPixChave, setNovaPixChave] = useState('');
  const [novaForma, setNovaForma] = useState('');
  const [novoCentroCusto, setNovoCentroCusto] = useState('');
  const [novaFormaContaPagar, setNovaFormaContaPagar] = useState('');

  // Desconto form state
  const [novoDescontoApelido, setNovoDescontoApelido] = useState('');
  const [novoDescontoValor, setNovoDescontoValor] = useState('');
  const [novoDescontoTipo, setNovoDescontoTipo] = useState<'valor' | 'porcento'>('valor');

  // Mensagem aniversário local state
  const [mensagemAniv, setMensagemAniv] = useState(config.mensagemAniversario ?? 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!');

  const formasPagamento = config.formasPagamento || [];
  const contasPagarConfig: ContasPagarConfig = config.contasPagar || { ativo: false, centrosCusto: [], formasPagamento: [], categoriasFavoritas: [] };
  const descontos = config.descontos || [];
  const permissoes = config.permissoes || defaultPermissoes();

  const can = (p: Permissao) => hasPerm(config, user, p);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: 'cadastros' } }));
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Keep mensagemAniv in sync if config changes externally
  useEffect(() => {
    setMensagemAniv(config.mensagemAniversario ?? 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!');
  }, [config.mensagemAniversario]);

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

  const handleUpdateContasPagar = (data: Partial<AppConfig['contasPagar']>) => {
    onUpdate({
      contasPagar: {
        ...contasPagarConfig,
        ...data,
      },
    });
  };

  const handleAddCentroCusto = () => {
    const nome = novoCentroCusto.trim();
    if (!nome) return;
    if (contasPagarConfig.centrosCusto.some(item => item.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Centro de custo já cadastrado');
      return;
    }
    handleUpdateContasPagar({
      centrosCusto: [
        ...contasPagarConfig.centrosCusto,
        { id: generateId(), nome, ativo: true, createdAt: new Date().toISOString() },
      ],
    });
    setNovoCentroCusto('');
  };

  const handleAddFormaContaPagar = () => {
    const nome = novaFormaContaPagar.trim();
    if (!nome) return;
    if (contasPagarConfig.formasPagamento.some(item => item.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Forma de pagamento já cadastrada');
      return;
    }
    handleUpdateContasPagar({
      formasPagamento: [
        ...contasPagarConfig.formasPagamento,
        { id: generateId(), nome, ativo: true, createdAt: new Date().toISOString() },
      ],
    });
    setNovaFormaContaPagar('');
  };

  const handleToggleCategoriaFavorita = (categoria: ContaPagarCategoria) => {
    const exists = contasPagarConfig.categoriasFavoritas.includes(categoria);
    handleUpdateContasPagar({
      categoriasFavoritas: exists
        ? contasPagarConfig.categoriasFavoritas.filter(item => item !== categoria)
        : [...contasPagarConfig.categoriasFavoritas, categoria],
    });
  };

  const handleAddDesconto = () => {
    const apelido = novoDescontoApelido.trim();
    const valorNum = parseFloat(novoDescontoValor.replace(',', '.'));
    if (!apelido) { toast.error('Informe um apelido para o desconto'); return; }
    if (isNaN(valorNum) || valorNum <= 0) { toast.error('Informe um valor válido'); return; }
    if (novoDescontoTipo === 'porcento' && valorNum > 100) { toast.error('Percentual máximo é 100%'); return; }
    const novo: Desconto = { id: generateId(), apelido, valor: valorNum, tipo: novoDescontoTipo };
    onUpdate({ descontos: [...descontos, novo] });
    setNovoDescontoApelido('');
    setNovoDescontoValor('');
    setNovoDescontoTipo('valor');
    toast.success('Desconto adicionado');
  };

  const handleRemoveDesconto = (id: string) => {
    onUpdate({ descontos: descontos.filter(d => d.id !== id) });
  };

  const hasNivelPerm = (n: NivelUsuario, p: Permissao) => {
    if (n === 'MASTER') return true;
    return (permissoes[n] || []).includes(p);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configurações</h2>

      <Tabs
        value={activeTab}
        className="w-full"
        onValueChange={(v) => {
          setActiveTab(v as ConfigPanelProps['initialTab']);
          window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: v } }));
        }}
      >
        <TabsList className="grid w-full grid-cols-6 h-auto">
          <TabsTrigger value="cadastros" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">👥 Cadastros</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">💰 Financeiro</TabsTrigger>
          <TabsTrigger value="contas-pagar" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">🧾 Contas a Pagar</TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">🔔 Alertas</TabsTrigger>
          <TabsTrigger value="aparencia" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">🎨 Aparência</TabsTrigger>
          <TabsTrigger value="sistema" className="text-xs px-1 py-2 data-[state=active]:ring-2 data-[state=active]:ring-primary">⚙️ Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastros" className="space-y-4 mt-4">
          <UsuariosManager config={config} onUpdate={onUpdate} />

          {/* Permissões por Nível */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Permissões por Nível
                </CardTitle>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                  {ALL_PERMISSOES.length} permissões
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 pl-3 font-medium" style={{ minWidth: 180 }}>Permissão</th>
                      {(['MASTER', 'GERENCIAL', 'USUARIO'] as NivelUsuario[]).map(n => (
                        <th key={n} className="text-center p-2 font-medium w-20">{NIVEL_LABELS[n]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_PERMISSOES.map((p, i) => (
                      <tr key={p} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="p-1.5 pl-3 text-muted-foreground">{PERMISSAO_LABELS[p]}</td>
                        {(['MASTER', 'GERENCIAL', 'USUARIO'] as NivelUsuario[]).map(n => (
                          <td key={n} className="text-center p-1.5">
                            {hasNivelPerm(n, p) ? (
                              <span className="inline-block w-4 h-4 rounded-full bg-green-500/20 text-green-600 text-[10px] leading-4">✓</span>
                            ) : (
                              <span className="inline-block w-4 h-4 rounded-full bg-red-500/10 text-red-400 text-[10px] leading-4">✗</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground p-2 pl-3 border-t">
                Para editar as permissões de cada nível, use o painel de Usuários acima.
              </p>
            </CardContent>
          </Card>

          {can('config.proprietarios') && (
            <ProprietariosManager proprietarios={config.proprietarios} onUpdate={(proprietarios) => onUpdate({ proprietarios })} />
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

          {/* Descontos pré-definidos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" /> Descontos Pré-definidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {descontos.length > 0 && (
                <div className="space-y-1">
                  {descontos.map(d => (
                    <div key={d.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.apelido}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.tipo === 'valor' ? formatCurrency(d.valor) : `${d.valor}%`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => handleRemoveDesconto(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-muted-foreground font-medium">Adicionar desconto</p>
                <div>
                  <Label className="text-xs">Apelido</Label>
                  <Input placeholder="Ex: Desconto fidelidade" value={novoDescontoApelido} onChange={e => setNovoDescontoApelido(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={novoDescontoTipo} onValueChange={(v) => setNovoDescontoTipo(v as 'valor' | 'porcento')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ Fixo</span>
                        </SelectItem>
                        <SelectItem value="porcento">
                          <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Percentual %</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{novoDescontoTipo === 'valor' ? 'Valor (R$)' : 'Percentual (0–100)'}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={novoDescontoTipo === 'porcento' ? 100 : undefined}
                      step="0.01"
                      placeholder={novoDescontoTipo === 'valor' ? '0.00' : '0'}
                      value={novoDescontoValor}
                      onChange={e => setNovoDescontoValor(e.target.value)}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={handleAddDesconto}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Desconto
                </Button>
              </div>
            </CardContent>
          </Card>

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

        <TabsContent value="contas-pagar" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">🧾 Fase 1 — Configuração do Módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ativar Contas a Pagar</p>
                  <p className="text-[11px] text-muted-foreground">Habilita a base de configuração para as próximas fases do módulo.</p>
                </div>
                <Switch
                  checked={contasPagarConfig.ativo}
                  onCheckedChange={(checked) => handleUpdateContasPagar({ ativo: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Categorias favoritas</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTAS_PAGAR_CATEGORIAS.map(categoria => {
                    const active = contasPagarConfig.categoriasFavoritas.includes(categoria.value);
                    return (
                      <Button
                        key={categoria.value}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggleCategoriaFavorita(categoria.value)}
                      >
                        {categoria.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Centros de Custo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contasPagarConfig.centrosCusto.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{item.ativo ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={(checked) => handleUpdateContasPagar({
                      centrosCusto: contasPagarConfig.centrosCusto.map(current => current.id === item.id ? { ...current, ativo: checked } : current),
                    })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleUpdateContasPagar({
                      centrosCusto: contasPagarConfig.centrosCusto.filter(current => current.id !== item.id),
                    })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Administrativo"
                  value={novoCentroCusto}
                  onChange={e => setNovoCentroCusto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCentroCusto(); } }}
                />
                <Button variant="outline" size="sm" onClick={handleAddCentroCusto}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Formas de Pagamento do Módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contasPagarConfig.formasPagamento.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{item.ativo ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={(checked) => handleUpdateContasPagar({
                      formasPagamento: contasPagarConfig.formasPagamento.map(current => current.id === item.id ? { ...current, ativo: checked } : current),
                    })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleUpdateContasPagar({
                      formasPagamento: contasPagarConfig.formasPagamento.filter(current => current.id !== item.id),
                    })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Boleto"
                  value={novaFormaContaPagar}
                  onChange={e => setNovaFormaContaPagar(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFormaContaPagar(); } }}
                />
                <Button variant="outline" size="sm" onClick={handleAddFormaContaPagar}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
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

          {/* Mensagem de Aniversário */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">🎂 Mensagem de Aniversário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Mensagem enviada ao cliente no WhatsApp</Label>
                <Textarea
                  placeholder="Ex: Feliz aniversário, {nome}! 🎂"
                  value={mensagemAniv}
                  onChange={e => setMensagemAniv(e.target.value)}
                  rows={3}
                  className="mt-1 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use <code className="bg-muted px-1 rounded">{'{nome}'}</code> para inserir o nome do cliente automaticamente.
                </p>
              </div>
              <Button size="sm" className="w-full" onClick={() => {
                onUpdate({ mensagemAniversario: mensagemAniv });
                toast.success('Mensagem salva!');
              }}>
                Salvar Mensagem
              </Button>
            </CardContent>
          </Card>

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
          <LogoPanel logo={config.logoEmpresa} onUpdate={(logo) => onUpdate({ logoEmpresa: logo })} />
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
                      if ('__TAURI_INTERNALS__' in window) {
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

          {/* Timer de Ociosidade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Timer de Ociosidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ativar bloqueio automático</p>
                  <p className="text-[11px] text-muted-foreground">Bloqueia o app após período de inatividade</p>
                </div>
                <Switch
                  checked={config.idleAtivo ?? false}
                  onCheckedChange={(c) => onUpdate({ idleAtivo: c })}
                />
              </div>
              {(config.idleAtivo ?? false) && (
                <div className="space-y-1">
                  <Label className="text-xs">Tempo de inatividade (minutos)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={config.idleMinutes ?? 5}
                    onChange={e => onUpdate({ idleMinutes: Math.max(1, parseInt(e.target.value) || 5) })}
                    className="w-24 text-center"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Mínimo: 1 min. Padrão: 5 min.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chave do Sistema (futuro) */}
          <Card className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">🔑 Chave do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic">
                Recurso disponível em versão futura. Permitirá licenciamento e ativação do sistema por empresa.
              </p>
            </CardContent>
          </Card>

          {can('config.backup') && (
            <BackupPanel titulos={titulos} config={config} onImportTitulos={(t) => onImportTitulos?.(t)} onImportConfig={(p) => onUpdate(p)} />
          )}
          <LogPanel logs={config.logs || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
