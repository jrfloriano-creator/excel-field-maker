import { useEffect, useState, useRef, useCallback } from 'react';
import { FormaPagamento, AppConfig, ChavePix, Titulo, ALL_PERMISSOES, PERMISSAO_LABELS, NivelUsuario, Permissao, Desconto, ContaPagarCategoria, ContasPagarConfig } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Trash2, Send, FolderOpen, Shield, Clock, Percent, DollarSign, 
  Users, CreditCard, AlertCircle, Palette, Settings, ArrowLeft, HelpCircle,
  CheckCircle2, AlertTriangle, Info, Moon, Sun
} from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';
import { calcularTitulo, formatCurrency, formatDate } from '@/lib/calculos';
import { obterNomeCliente } from '@/lib/whatsapp/message';
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
import { ConfiguracoesContasPagar } from '@/components/contas-pagar/ConfiguracoesContasPagar';
import { WhatsAppConnection } from '@/components/whatsapp/WhatsAppConnection';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ==============================================
// COMPONENTE TOOLTIP EXPLICATIVO
// ==============================================
const TooltipInfo = ({ children }: { children: React.ReactNode }) => (
  <div className="relative group inline-flex items-center">
    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border">
      {children}
    </div>
  </div>
);

// ==============================================
// TIPOS
// ==============================================
interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: (data: Partial<AppConfig>) => void;
  titulos?: Titulo[];
  onImportTitulos?: (titulos: Titulo[]) => void;
  user: SessionUser | null;
  initialTab?: 'cadastros' | 'financeiro' | 'contas-pagar' | 'alertas' | 'aparencia' | 'sistema';
  abaAtivaExterna?: 'cadastros' | 'financeiro' | 'contas-pagar' | 'alertas' | 'aparencia' | 'sistema';
  cardFocado?: string;
}

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  MASTER: 'MASTER',
  GERENCIAL: 'GERENCIAL',
  USUARIO: 'USUÁRIO',
};

const CONTAS_PAGAR_CATEGORIAS: { value: ContaPagarCategoria; label: string; descricao: string }[] = [
  { value: 'FORNECEDOR', label: 'Fornecedor', descricao: 'Pagamentos a fornecedores de produtos/serviços' },
  { value: 'FUNCIONARIO', label: 'Funcionário', descricao: 'Salários, benefícios e encargos de colaboradores' },
  { value: 'IMPOSTO', label: 'Imposto', descricao: 'Tributos federais, estaduais e municipais' },
  { value: 'ALUGUEL', label: 'Aluguel', descricao: 'Aluguel de imóveis e equipamentos' },
  { value: 'UTILIDADE', label: 'Utilidade', descricao: 'Água, energia, internet, telefone' },
  { value: 'SERVICO', label: 'Serviço', descricao: 'Prestadores de serviço pessoa física/jurídica' },
  { value: 'OUTRO', label: 'Outro', descricao: 'Despesas que não se encaixam nas categorias acima' },
];

const GRUPOS_CONFIG = [
  { id: 'cadastros' as const, titulo: 'Cadastros', icone: <Users className="h-7 w-7" />, descricao: 'Usuários, Proprietários, Credores' },
  { id: 'financeiro' as const, titulo: 'Financeiro', icone: <CreditCard className="h-7 w-7" />, descricao: 'Taxas, PIX, Formas de Pagamento' },
  { id: 'contas-pagar' as const, titulo: 'Contas a Pagar', icone: <DollarSign className="h-7 w-7" />, descricao: 'Centros de Custo, Parâmetros', restritoMaster: true },
  { id: 'alertas' as const, titulo: 'Alertas', icone: <AlertCircle className="h-7 w-7" />, descricao: 'Notificações, Aniversários, E-mail' },
  { id: 'aparencia' as const, titulo: 'Aparência', icone: <Palette className="h-7 w-7" />, descricao: 'Tema, Logo, Avatar' },
  { id: 'sistema' as const, titulo: 'Sistema', icone: <Settings className="h-7 w-7" />, descricao: 'Backup, WhatsApp, Segurança' },
];

// ==============================================
// COMPONENTE PRINCIPAL
// ==============================================
export function ConfigPanel({ 
  config, 
  onUpdate, 
  titulos = [], 
  onImportTitulos, 
  user, 
  initialTab = 'cadastros',
  abaAtivaExterna,
  cardFocado
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const isMaster = user?.nivel === 'MASTER';
  const initialConfigRef = useRef<AppConfig>(JSON.parse(JSON.stringify(config)));
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [destinoSaida, setDestinoSaida] = useState<string | null>(null);
  const [itemExcluir, setItemExcluir] = useState<{ tipo: string; id: string; nome: string; acao: () => void } | null>(null);

  useEffect(() => {
    if (abaAtivaExterna) setActiveTab(abaAtivaExterna);
  }, [abaAtivaExterna]);

  useEffect(() => {
    if (cardFocado && activeTab !== 'inicio') {
      const secao = document.querySelector(`[data-secao="${cardFocado}"]`);
      if (secao) setTimeout(() => secao.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [cardFocado, activeTab]);

  useEffect(() => {
    if (activeTab === 'contas-pagar' && !isMaster) {
      setActiveTab('inicio');
      toast.error('Acesso restrito ao usuário Master');
    }
  }, [activeTab, isMaster]);

  useEffect(() => {
    setTemAlteracoes(JSON.stringify(config) !== JSON.stringify(initialConfigRef.current));
  }, [config]);

  const irParaAba = useCallback((novaAba: string) => {
    if (temAlteracoes && novaAba !== activeTab) {
      setDestinoSaida(novaAba);
      setConfirmarSaida(true);
      return;
    }
    setActiveTab(novaAba);
  }, [temAlteracoes, activeTab]);

  const confirmarSaidaEIr = () => {
    initialConfigRef.current = JSON.parse(JSON.stringify(config));
    setConfirmarSaida(false);
    setTemAlteracoes(false);
    if (destinoSaida) { setActiveTab(destinoSaida); setDestinoSaida(null); }
  };

  const descartarEIr = () => {
    setConfirmarSaida(false); setDestinoSaida(null);
    if (destinoSaida) setActiveTab(destinoSaida);
  };

  const [novaPixNome, setNovaPixNome] = useState('');
  const [novaPixChave, setNovaPixChave] = useState('');
  const [novaForma, setNovaForma] = useState('');
  const [novoCentroCusto, setNovoCentroCusto] = useState('');
  const [novaFormaContaPagar, setNovaFormaContaPagar] = useState('');
  const [novoDescontoApelido, setNovoDescontoApelido] = useState('');
  const [novoDescontoValor, setNovoDescontoValor] = useState('');
  const [novoDescontoTipo, setNovoDescontoTipo] = useState<'valor' | 'porcento'>('valor');
  const [mensagemAniv, setMensagemAniv] = useState(config.mensagemAniversario ?? 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!');
  
  const validarChavePix = (chave: string): string | null => {
    if (!chave.trim()) return null;
    if (chave.length < 5) return 'Chave muito curta';
    if (chave.length > 100) return 'Chave muito longa';
    return null;
  };

  const validarValorTaxa = (valor: string): { valido: boolean; mensagem?: string } => {
    const num = parseFloat(valor.replace(',', '.'));
    if (isNaN(num)) return { valido: false, mensagem: 'Digite um número válido' };
    if (num < 0) return { valido: false, mensagem: 'Valor não pode ser negativo' };
    if (num > 100) return { valido: false, mensagem: 'Valor máximo: 100%' };
    return { valido: true };
  };

  const validarValorDesconto = (valor: string, tipo: 'valor' | 'porcento'): { valido: boolean; mensagem?: string } => {
    const num = parseFloat(valor.replace(',', '.'));
    if (isNaN(num) || num <= 0) return { valido: false, mensagem: 'Informe um valor maior que zero' };
    if (tipo === 'porcento' && num > 100) return { valido: false, mensagem: 'Percentual máximo: 100%' };
    return { valido: true };
  };

  const formasPagamento = config.formasPagamento || [];
  const contasPagarConfig: ContasPagarConfig = config.contasPagar || { ativo: false, centrosCusto: [], formasPagamento: [], categoriasFavoritas: [] };
  const descontos = config.descontos || [];
  const permissoes = config.permissoes || defaultPermissoes();
  const can = (p: Permissao) => hasPerm(config, user, p);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'config', sub: activeTab } }));
  }, [activeTab]);

  useEffect(() => {
    setMensagemAniv(config.mensagemAniversario ?? 'Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!');
  }, [config.mensagemAniversario]);

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  const titulosAmanha = titulos.map(t => calcularTitulo(t, config.taxa, config.contasPagar?.multa || 0))
    .filter(t => t.vencimento === amanhaStr && t.situacao !== 'PAGO');

  const handleSendAlerts = () => {
    if (titulosAmanha.length === 0) { toast.info('Nenhum título vence amanhã'); return; }
    const ativos = config.telefonesAlerta.filter(t => t.ativo && t.numero);
    if (ativos.length === 0) { toast.error('Nenhum telefone de alerta ativo'); return; }
    ativos.forEach(tel => {
      titulosAmanha.forEach(t => {
        const cli = config.clientes.find(c => c.id === t.clienteId);
        const apelido = obterNomeCliente(cli || { nome: t.cliente });
        const msg = `⚠️ Alerta de Vencimento\n\nCliente: ${apelido}\nValor: ${formatCurrency(t.valor)}\nVencimento: ${formatDate(t.vencimento)} (amanhã)`;
        openExternalUrl(`https://wa.me/55${tel.numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
      });
    });
    toast.success(`${titulosAmanha.length} alerta(s) abertos`);
  };

  const handleAddPix = () => {
    const erro = validarChavePix(novaPixChave);
    if (!novaPixNome.trim()) { toast.error('Informe o nome da chave'); return; }
    if (!novaPixChave.trim()) { toast.error('Informe a chave PIX'); return; }
    if (erro) { toast.error(erro); return; }
    if (config.chavesPix.length >= 5) { toast.error('Máximo de 5 chaves PIX'); return; }
    onUpdate({ chavesPix: [...config.chavesPix, { id: generateId(), nome: novaPixNome.trim(), chave: novaPixChave.trim() }] });
    setNovaPixNome(''); setNovaPixChave('');
    toast.success('Chave PIX adicionada! ✅');
  };

  const handleAddForma = () => {
    const nome = novaForma.trim();
    if (!nome) { toast.error('Informe o nome da forma de pagamento'); return; }
    if (formasPagamento.some(f => f.nome.toLowerCase() === nome.toLowerCase())) { toast.error('Já cadastrada'); return; }
    onUpdate({ formasPagamento: [...formasPagamento, { id: generateId(), nome } as FormaPagamento] });
    setNovaForma('');
    toast.success('Forma de pagamento adicionada! ✅');
  };

  const handleUpdateContasPagar = (data: Partial<AppConfig['contasPagar']>) => {
    onUpdate({ contasPagar: { ...contasPagarConfig, ...data } });
  };

  const handleAddCentroCusto = () => {
    const nome = novoCentroCusto.trim();
    if (!nome) { toast.error('Informe o nome do centro de custo'); return; }
    if (contasPagarConfig.centrosCusto.some(item => item.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Centro de custo já cadastrado'); return;
    }
    handleUpdateContasPagar({
      centrosCusto: [...contasPagarConfig.centrosCusto, { id: generateId(), nome, ativo: true, createdAt: new Date().toISOString() }],
    });
    setNovoCentroCusto('');
    toast.success('Centro de custo adicionado! ✅');
  };

  const handleAddFormaContaPagar = () => {
    const nome = novaFormaContaPagar.trim();
    if (!nome) { toast.error('Informe o nome'); return; }
    if (contasPagarConfig.formasPagamento.some(item => item.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Forma de pagamento já cadastrada'); return;
    }
    handleUpdateContasPagar({
      formasPagamento: [...contasPagarConfig.formasPagamento, { id: generateId(), nome, ativo: true, createdAt: new Date().toISOString() }],
    });
    setNovaFormaContaPagar('');
    toast.success('Forma adicionada! ✅');
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
    const validacao = validarValorDesconto(novoDescontoValor, novoDescontoTipo);
    if (!apelido) { toast.error('Informe um apelido para o desconto'); return; }
    if (!validacao.valido) { toast.error(validacao.mensagem); return; }
    const valorNum = parseFloat(novoDescontoValor.replace(',', '.'));
    onUpdate({ descontos: [...descontos, { id: generateId(), apelido, valor: valorNum, tipo: novoDescontoTipo }] });
    setNovoDescontoApelido(''); setNovoDescontoValor(''); setNovoDescontoTipo('valor');
    toast.success('Desconto adicionado! ✅');
  };

  const solicitarExclusao = (tipo: string, id: string, nome: string, acao: () => void) => {
    setItemExcluir({ tipo, id, nome, acao });
  };

  const confirmarExclusao = () => {
    if (itemExcluir) {
      itemExcluir.acao();
      toast.success(`${itemExcluir.tipo} removido! ✅`);
      setItemExcluir(null);
    }
  };

  const hasNivelPerm = (n: NivelUsuario, p: Permissao) => {
    if (n === 'MASTER') return true;
    return (permissoes[n] || []).includes(p);
  };

  return (
    <div className="space-y-6">
      <Dialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Alterações não salvas
            </DialogTitle>
            <DialogDescription>
              Você tem alterações que ainda não foram salvas. Deseja sair mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmarSaida(false)}>Continuar editando</Button>
            <Button variant="destructive" onClick={descartarEIr}>Descartar e sair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemExcluir} onOpenChange={(open) => !open && setItemExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirmar exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{itemExcluir?.nome}</strong>?<br />Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setItemExcluir(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarExclusao}>Sim, excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Configurações</h2>
          {temAlteracoes && activeTab !== 'inicio' && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Info className="h-3 w-3" /> Alterações pendentes
            </p>
          )}
        </div>
        {activeTab !== 'inicio' && (
          <Button variant="outline" size="sm" onClick={() => irParaAba('inicio')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} className="w-full">
        <TabsContent value="inicio" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GRUPOS_CONFIG.map((grupo) => {
              if (grupo.restritoMaster && !isMaster) return null;
              return (
                <Card key={grupo.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  onClick={() => irParaAba(grupo.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-primary group-hover:scale-110 transition-transform">{grupo.icone}</div>
                      <div>
                        <CardTitle className="text-base">{grupo.titulo}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {grupo.descricao}
                          {grupo.restritoMaster && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Apenas Master</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="cadastros" className="space-y-4 mt-2">
          <UsuariosManager config={config} onUpdate={onUpdate} />
          
          <Card data-secao="permissoes">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Permissões por Nível
                  <TooltipInfo>
                    <p className="font-semibold mb-1">Níveis de Acesso</p>
                    <p>• <strong>MASTER</strong>: acesso total</p>
                    <p>• <strong>GERENCIAL</strong>: gestão operacional</p>
                    <p>• <strong>USUÁRIO</strong>: visualização e lançamentos básicos</p>
                  </TooltipInfo>
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
                Para editar permissões, use o painel de Usuários acima.
              </p>
            </CardContent>
          </Card>
          
          {can('config.proprietarios') && <ProprietariosManager proprietarios={config.proprietarios} onUpdate={(p) => onUpdate({ proprietarios: p })} />}
          
          {can('config.credor') && (
            <Card data-secao="credores">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  📝 Credor (Notas Promissórias)
                  <TooltipInfo>Dados que aparecem nas notas promissórias emitidas pelo sistema</TooltipInfo>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-xs">Nome / Razão Social *</Label>
                  <Input value={config.credor?.nome || ''} 
                    onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), nome: e.target.value } })}
                    placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <Label className="text-xs">CPF / CNPJ</Label>
                  <Input value={config.credor?.cpfCnpj || ''} 
                    onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), cpfCnpj: e.target.value } })}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                </div>
                <div>
                  <Label className="text-xs">Cidade / Estado</Label>
                  <Input value={config.credor?.cidadeEstado || ''} 
                    onChange={e => onUpdate({ credor: { ...(config.credor || { nome:'', cpfCnpj:'', cidadeEstado:'' }), cidadeEstado: e.target.value } })}
                    placeholder="São Paulo / SP" />
                </div>
              </CardContent>
            </Card>
          )}
          
          <MotivosManager motivos={config.motivosAlteracao || []} onUpdate={(l) => onUpdate({ motivosAlteracao: l })} />
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-2">
          {can('config.taxa') && (
            <Card data-secao="taxas">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  💰 Taxa de Juros e Multa
                  <TooltipInfo>
                    <p className="mb-1"><strong>Juros mensal</strong>: aplicado por atraso no pagamento</p>
                    <p><strong>Multa</strong>: valor fixo cobrado no vencimento em atraso</p>
                  </TooltipInfo>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Taxa de Juros Mensal (%) *</Label>
                  <Input type="text" inputMode="decimal" 
                    value={config.taxa === 0 ? '' : String((config.taxa || 0) * 100)}
                    placeholder="Ex: 1,5"
                    onChange={e => {
                      const val = e.target.value;
                      const validacao = validarValorTaxa(val);
                      if (validacao.valido || val === '') {
                        const v = parseFloat(val.replace(',', '.')) || 0;
                        onUpdate({ taxa: v / 100 });
                      }
                    }} />
                  {config.taxa > 0 && config.taxa <= 1 && (
                    <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Válido
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Multa por Atraso (R$)</Label>
                  <Input type="text" inputMode="decimal" 
                    value={contasPagarConfig.multa || ''}
                    placeholder="Ex: 10,00"
                    onChange={e => {
                      const v = parseFloat(e.target.value.replace(',', '.')) || 0;
                      handleUpdateContasPagar({ multa: v });
                    }} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-secao="descontos">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" /> 🏷️ Descontos Pré-definidos
                <TooltipInfo>Atalhos usados no lançamento de títulos — selecione e o valor é aplicado automaticamente</TooltipInfo>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {descontos.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.apelido}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.tipo === 'valor' ? formatCurrency(d.valor) : `${d.valor}%`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" 
                    onClick={() => solicitarExclusao('Desconto', d.id, d.apelido, 
                      () => onUpdate({ descontos: descontos.filter(x => x.id !== d.id) })
                    )}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">Apelido *</Label>
                <Input placeholder="Ex: Fidelidade" value={novoDescontoApelido} 
                  onChange={e => setNovoDescontoApelido(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={novoDescontoTipo} onValueChange={(v) => setNovoDescontoTipo(v as 'valor' | 'porcento')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">R$ Fixo</SelectItem>
                        <SelectItem value="porcento">% Percentual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Valor *</Label>
                    <Input type="number" step="0.01" value={novoDescontoValor} 
                      onChange={e => setNovoDescontoValor(e.target.value)} placeholder="0,00" />
                    {novoDescontoValor && (
                      <p className={`text-[10px] mt-1 ${validarValorDesconto(novoDescontoValor, novoDescontoTipo).valido ? 'text-green-600' : 'text-destructive'}`}>
                        {validarValorDesconto(novoDescontoValor, novoDescontoTipo).valido ? '✓ Válido' : validarValorDesconto(novoDescontoValor, novoDescontoTipo).mensagem}
                      </p>
                    )}
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={handleAddDesconto}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Desconto
                </Button>
              </div>
            </CardContent>
          </Card>

          {can('config.pix') && (
            <Card data-secao="pix">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  🔑 Chaves PIX ({config.chavesPix.length}/5)
                  <TooltipInfo>Chaves exibidas nos comprovantes e notas de cobrança</TooltipInfo>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.chavesPix.map(pix => (
                  <div key={pix.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pix.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">{pix.chave}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" 
                      onClick={() => solicitarExclusao('Chave PIX', pix.id, pix.nome,
                        () => onUpdate({ chavesPix: config.chavesPix.filter(c => c.id !== pix.id) })
                      )}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {config.chavesPix.length < 5 && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Nome / Apelido *</Label>
                      <Input placeholder="Ex: Conta Principal" value={novaPixNome} onChange={e => setNovaPixNome(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Chave PIX *</Label>
                      <Input placeholder="Digite a chave" value={novaPixChave} onChange={e => setNovaPixChave(e.target.value)} />
                      {novaPixChave && validarChavePix(novaPixChave) && (
                        <p className="text-[10px] text-destructive mt-1">{validarChavePix(novaPixChave)}</p>
                      )}
                    </div>
                    <Button size="sm" onClick={handleAddPix} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Chave
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('config.formasPagamento') && (
            <Card data-secao="formas-pagamento">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  💳 Formas de Pagamento
                  <TooltipInfo>Meios de pagamento disponíveis no lançamento de títulos</TooltipInfo>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formasPagamento.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <p className="text-sm flex-1 font-medium">{f.nome}</p>
                    <Button variant="ghost" size="sm" className="text-destructive"
                      onClick={() => solicitarExclusao('Forma de Pagamento', f.id, f.nome,
                        () => onUpdate({ formasPagamento: formasPagamento.filter(x => x.id !== f.id) })
                      )}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Ex: PIX, Boleto, Cartão..." value={novaForma} onChange={e => setNovaForma(e.target.value)} />
                  <Button size="sm" onClick={handleAddForma}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {can('config.maquininhas') && <MaquininhasManager maquininhas={config.maquininhas || []} onUpdate={(l) => onUpdate({ maquininhas: l })} />}
        </TabsContent>

        <TabsContent value="contas-pagar" className="space-y-4 mt-2">
          {!isMaster ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Acesso restrito ao usuário Master.</CardContent></Card>
          ) : (
            <>
              <Card data-secao="parametros">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🧾 Configuração do Módulo
                    <TooltipInfo>Ative e configure as regras do módulo de Contas a Pagar</TooltipInfo>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Ativar Módulo de Contas a Pagar</p>
                      <p className="text-xs text-muted-foreground">Habilita lançamentos, projeção e relatórios de despesas</p>
                    </div>
                    <Switch checked={contasPagarConfig.ativo} onCheckedChange={(c) => handleUpdateContasPagar({ ativo: c })} />
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-medium">Categorias Favoritas</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">Aparecem primeiro no lançamento de despesas</p>
                    <div className="flex flex-wrap gap-2">
                      {CONTAS_PAGAR_CATEGORIAS.map(cat => {
                        const ativa = contasPagarConfig.categoriasFavoritas.includes(cat.value);
                        return (
                          <Button key={cat.value} size="sm" variant={ativa ? 'default' : 'outline'} className="text-xs h-auto py-1.5"
                            onClick={() => handleToggleCategoriaFavorita(cat.value)}>
                            {cat.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-secao="centros">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🏢 Centros de Custo
                    <TooltipInfo>Departamentos ou áreas para rateio de despesas</TooltipInfo>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contasPagarConfig.centrosCusto.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                      <p className="text-sm flex-1 font-medium">{item.nome}</p>
                      <Switch checked={item.ativo} onCheckedChange={(c) => handleUpdateContasPagar({
                        centrosCusto: contasPagarConfig.centrosCusto.map(i => i.id === item.id ? { ...i, ativo: c } : i)
                      })} />
                      <Button variant="ghost" size="sm" className="text-destructive"
                        onClick={() => solicitarExclusao('Centro de Custo', item.id, item.nome,
                          () => handleUpdateContasPagar({
                            centrosCusto: contasPagarConfig.centrosCusto.filter(i => i.id !== item.id)
                          })
                        )}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input placeholder="Nome do centro" value={novoCentroCusto} onChange={e => setNovoCentroCusto(e.target.value)} />
                    <Button size="sm" onClick={handleAddCentroCusto}><Plus className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>

              <Card data-secao="formas-pagar-conta">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    💳 Formas de Pagamento
                    <TooltipInfo>Meios disponíveis exclusivamente no módulo de Contas a Pagar</TooltipInfo>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contasPagarConfig.formasPagamento.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
                      <p className="text-sm flex-1 font-medium">{item.nome}</p>
                      <Switch checked={item.ativo} onCheckedChange={(c) => handleUpdateContasPagar({
                        formasPagamento: contasPagarConfig.formasPagamento.map(i => i.id === item.id ? { ...i, ativo: c } : i)
                      })} />
                      <Button variant="ghost" size="sm" className="text-destructive"
                        onClick={() => solicitarExclusao('Forma de Pagamento', item.id, item.nome,
                          () => handleUpdateContasPagar({
                            formasPagamento: contasPagarConfig.formasPagamento.filter(i => i.id !== item.id)
                          })
                        )}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input placeholder="Ex: Boleto bancário" value={novaFormaContaPagar} onChange={e => setNovaFormaContaPagar(e.target.value)} />
                    <Button size="sm" onClick={handleAddFormaContaPagar}><Plus className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3">🗂️ Cadastros do Módulo</h3>
                <ConfiguracoesContasPagar />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4 mt-2">
          {can('config.telefonesAlerta') && (
            <Card data-secao="avisos">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  📱 Telefones para Alerta Diário
                  <TooltipInfo>Números que recebem aviso de títulos que vencem no dia seguinte</TooltipInfo>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.telefonesAlerta.map((tel, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder={`Telefone ${i+1} (com DDD)`} value={tel.numero}
                      onChange={e => {
                        const arr = [...config.telefonesAlerta];
                        arr[i] = { ...arr[i], numero: e.target.value.replace(/\D/g, '') };
                        onUpdate({ telefonesAlerta: arr });
                      }} className="flex-1" />
                    <Switch checked={tel.ativo} onCheckedChange={() => {
                      const arr = [...config.telefonesAlerta];
                      arr[i] = { ...arr[i], ativo: !arr[i].ativo };
                      onUpdate({ telefonesAlerta: arr });
                    }} />
                  </div>
                ))}
                <Button size="sm" className="w-full mt-2" onClick={handleSendAlerts}>
                  <Send className="h-4 w-4 mr-1" /> Enviar Alertas Agora ({titulosAmanha.length} vencimentos amanhã)
                </Button>
              </CardContent>
            </Card>
          )}

          <Card data-secao="notificacoes">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                🎂 Mensagem de Aniversário
                <TooltipInfo>Modelo padrão — use {'{nome}'} para inserir o nome do cliente automaticamente</TooltipInfo>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Mensagem WhatsApp</Label>
                <Textarea value={mensagemAniv} onChange={e => setMensagemAniv(e.target.value)} rows={3} className="mt-1" 
                  placeholder="Feliz aniversário, {nome}! 🎂 Que seu dia seja especial!" />
              </div>
              <Button size="sm" className="w-full" onClick={() => {
                onUpdate({ mensagemAniversario: mensagemAniv });
                toast.success('Mensagem salva! ✅');
              }}>
                Salvar Mensagem
              </Button>
            </CardContent>
          </Card>

          {(can('config.emailCobranca') || can('config.emailEnviar')) && <EmailPanel config={config} titulos={titulos} onUpdate={onUpdate} />}
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-4 mt-2">
          {can('config.darkMode') && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {config.tema === 'escuro' ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium">Tema Escuro</p>
                    <p className="text-xs text-muted-foreground">Alterna entre modo claro e escuro</p>
                  </div>
                </div>
                <Switch 
                  checked={config.tema === 'escuro'} 
                  onCheckedChange={(ligado) => onUpdate({ tema: ligado ? 'escuro' : 'claro' })} 
                />
              </CardContent>
            </Card>
          )}
          <LogoPanel config={config} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4 mt-2">
          <WhatsAppConnection />
          <BackupPanel titulos={titulos} config={config} onImportTitulos={onImportTitulos} onImportConfig={onUpdate} />
          {/* ✅ CORRIGIDO: Passando logs com valor seguro */}
          <LogPanel logs={config.logs || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}