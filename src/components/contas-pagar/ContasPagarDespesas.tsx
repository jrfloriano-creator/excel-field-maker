import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Shield, Gift, Home, Zap, Briefcase, ShieldCheck, Wrench, Megaphone, CreditCard, Plane, FileText, Repeat, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculos';
import type { AppConfig, ContaPagar, CategoriaDespesa } from '@/types/titulo';
import { CATEGORIA_DESPESA_NOMES } from '@/types/titulo';

// Mapeamento ícone + categoria — alinhado com gruposDespesa do storage.ts
const categoriasConfig: Array<{
  id: CategoriaDespesa;
  nome: string;
  icone: any;
}> = [
  { id: 'REMUNERAÇÕES', nome: CATEGORIA_DESPESA_NOMES['REMUNERAÇÕES'], icone: Users },
  { id: 'ENCARGOS SOCIAIS', nome: CATEGORIA_DESPESA_NOMES['ENCARGOS SOCIAIS'], icone: Shield },
  { id: 'BENEFÍCIOS', nome: CATEGORIA_DESPESA_NOMES['BENEFÍCIOS'], icone: Gift },
  { id: 'OCUPAÇÃO', nome: CATEGORIA_DESPESA_NOMES['OCUPAÇÃO'], icone: Home },
  { id: 'TARIFAS PÚBLICAS', nome: CATEGORIA_DESPESA_NOMES['TARIFAS PÚBLICAS'], icone: Zap },
  { id: 'PRESTADORES SERVIÇOS', nome: CATEGORIA_DESPESA_NOMES['PRESTADORES SERVIÇOS'], icone: Briefcase },
  { id: 'SEGUROS', nome: CATEGORIA_DESPESA_NOMES['SEGUROS'], icone: ShieldCheck },
  { id: 'MANUTENÇÃO', nome: CATEGORIA_DESPESA_NOMES['MANUTENÇÃO'], icone: Wrench },
  { id: 'MARKETING', nome: CATEGORIA_DESPESA_NOMES['MARKETING'], icone: Megaphone },
  { id: 'FINANCEIROS', nome: CATEGORIA_DESPESA_NOMES['FINANCEIROS'], icone: CreditCard },
  { id: 'VIAGENS', nome: CATEGORIA_DESPESA_NOMES['VIAGENS'], icone: Plane },
  { id: 'GERAIS', nome: CATEGORIA_DESPESA_NOMES['GERAIS'], icone: FileText },
];

interface ContasPagarDespesasProps {
  config: AppConfig;
  contas: ContaPagar[];
  addConta: (dados: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  onUpdateConta: (id: string, dados: Partial<ContaPagar>) => Promise<void>;
  onDeleteConta?: (id: string) => Promise<void>;
  onUpdateConfig: (dados: Partial<AppConfig['contasPagar']>) => void;
}

export function ContasPagarDespesas({ 
  config, 
  contas, 
  addConta,
  onUpdateConta,
  onDeleteConta,
  onUpdateConfig 
}: ContasPagarDespesasProps) {
  
  // Agrupa contas pela categoria — comparação exata
  const contasPorCategoria = useMemo(() => {
    const mapa = new Map<CategoriaDespesa, ContaPagar[]>();
    categoriasConfig.forEach(cat => mapa.set(cat.id, []));
    
    contas.forEach(conta => {
      const lista = mapa.get(conta.categoria as CategoriaDespesa);
      if (lista) lista.push(conta);
    });
    
    return mapa;
  }, [contas]);

  // =========== ESTADOS ===========
  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaDespesa | null>(null);
  
  // Controle de modo: 'novo' | 'editar'
  const [modo, setModo] = useState<'novo' | 'editar'>('novo');
  const [contaEdicao, setContaEdicao] = useState<ContaPagar | null>(null);
  
  // Modal de exclusão
  const [excluirModalAberto, setExcluirModalAberto] = useState(false);
  const [contaExcluir, setContaExcluir] = useState<ContaPagar | null>(null);

  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    vencimento: '',
    favorecido: '',
    observacao: '',
    recorrente: false,
    quantidadeMeses: '12',
  });

  // =========== ABRIR FORMULÁRIO ===========
  const abrirNovo = (categoriaId: CategoriaDespesa) => {
    setCategoriaAtiva(categoriaId);
    setModo('novo');
    setContaEdicao(null);
    setFormData({
      descricao: '',
      valor: '',
      vencimento: '',
      favorecido: '',
      observacao: '',
      recorrente: false,
      quantidadeMeses: '12',
    });
    setDialogAberto(true);
  };

  const abrirEditar = (conta: ContaPagar) => {
    setCategoriaAtiva(conta.categoria as CategoriaDespesa);
    setModo('editar');
    setContaEdicao(conta);
    setFormData({
      descricao: conta.descricao,
      valor: String(conta.valor),
      vencimento: conta.vencimento,
      favorecido: conta.favorecido || '',
      observacao: conta.observacao || '',
      recorrente: false,
      quantidadeMeses: '1',
    });
    setDialogAberto(true);
  };

  // =========== SALVAR ===========
  const salvar = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Informe a Descrição!');
      return;
    }
    if (!formData.valor || Number(formData.valor) <= 0) {
      toast.error('Informe um Valor válido!');
      return;
    }

    if (modo === 'editar' && contaEdicao) {
      // ✅ EDITAR — altera lançamento existente
      await onUpdateConta(contaEdicao.id, {
        descricao: formData.descricao.trim(),
        valor: Number(formData.valor),
        vencimento: formData.vencimento,
        favorecido: formData.favorecido.trim() || undefined,
        observacao: formData.observacao.trim() || undefined,
      });
      toast.success('✅ Lançamento atualizado!');
      setDialogAberto(false);
      return;
    }

    // ✅ NOVO — com recorrência
    if (!categoriaAtiva) {
      toast.error('Selecione uma categoria!');
      return;
    }

    const valorNumerico = Number(formData.valor);
    const dataBase = formData.vencimento 
      ? new Date(formData.vencimento + 'T00:00:00')
      : new Date();
    
    const quantidadeMeses = formData.recorrente 
      ? Math.max(1, Math.min(60, Number(formData.quantidadeMeses) || 1)) 
      : 1;

    for (let i = 0; i < quantidadeMeses; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      const vencimento = dataVencimento.toISOString().split('T')[0];
      const competencia = vencimento.slice(0, 7);
      
      await addConta({
        descricao: formData.recorrente && i > 0 
          ? `${formData.descricao.trim()} (${i + 1}/${quantidadeMeses})`
          : formData.descricao.trim(),
        categoria: categoriaAtiva,
        tipo: 'DESPESA',
        favorecido: formData.favorecido.trim() || CATEGORIA_DESPESA_NOMES[categoriaAtiva],
        valor: valorNumerico,
        vencimento: vencimento,
        competencia: competencia,
        observacao: formData.observacao.trim() || undefined,
      });

      if (quantidadeMeses > 1) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    toast.success(
      quantidadeMeses === 1 
        ? `✅ Lançamento salvo — ${CATEGORIA_DESPESA_NOMES[categoriaAtiva]}: ${formatCurrency(valorNumerico)}`
        : `✅ ${quantidadeMeses} lançamentos recorrentes criados — ${CATEGORIA_DESPESA_NOMES[categoriaAtiva]}`
    );
    
    setDialogAberto(false);
  };

  // =========== EXCLUIR ===========
  const confirmarExclusao = async () => {
    if (!contaExcluir) return;
    
    if (onDeleteConta) {
      await onDeleteConta(contaExcluir.id);
    } else {
      // Fallback se não vier a função — avise no console
      console.warn('onDeleteConta não foi passado, exclusão pode não persistir');
    }
    
    toast.success('✅ Lançamento excluído!');
    setContaExcluir(null);
    setExcluirModalAberto(false);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setModo('novo');
    setContaEdicao(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📋 Lançamento de Despesas</h2>
        <p className="text-sm text-muted-foreground">
          {categoriasConfig.length} categorias • {contas.filter(c => c.tipo === 'DESPESA').length} lançamentos totais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoriasConfig.map(categoria => {
          const Icon = categoria.icone;
          const itens = contasPorCategoria.get(categoria.id) || [];
          const total = itens.reduce((s, c) => s + c.valor, 0);
          
          return (
            <Card key={categoria.id} className="overflow-hidden">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => abrirNovo(categoria.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Novo
                  </Button>
                </div>
                <CardDescription className="mt-1">
                  {itens.length} lançamento(s) • Total: {formatCurrency(total)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-3">
                {itens.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum lançamento ainda
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {itens.map(item => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between py-2 border-b last:border-0 group"
                      >
                        {/* DADOS DO LANÇAMENTO — CLICA PARA EDITAR */}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1"
                          onClick={() => abrirEditar(item)}
                        >
                          <p className="font-medium text-sm truncate">
                            {item.numero} — {item.descricao}
                            {item.descricao.includes('(') && item.descricao.includes('/') && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                recorrente
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.favorecido || '—'} • Venc: {item.vencimento}
                          </p>
                        </div>
                        
                        {/* VALOR + AÇÕES */}
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <div className="text-right min-w-[90px]">
                            <p className="font-medium text-sm">{formatCurrency(item.valor)}</p>
                            <p className={`text-xs ${
                              item.status === 'PAGO' ? 'text-green-600' :
                              item.status === 'VENCIDO' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {item.status}
                            </p>
                          </div>
                          
                          {/* BOTÕES — APARECEM AO PASSAR O MOUSE */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Editar"
                              onClick={() => abrirEditar(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                              title="Excluir"
                              onClick={() => {
                                setContaExcluir(item);
                                setExcluirModalAberto(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* =========== MODAL: NOVO / EDITAR =========== */}
      <Dialog open={dialogAberto} onOpenChange={fecharDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modo === 'editar' ? '✏️ Editar Lançamento' : '➕ Novo Lançamento'}
            </DialogTitle>
            {modo === 'editar' && (
              <DialogDescription>
                Altere os dados conforme necessário
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.descricao}
                onChange={e => setFormData({...formData, descricao: e.target.value})}
                placeholder="Ex: Salário de outubro"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor R$ *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.valor}
                  onChange={e => setFormData({...formData, valor: e.target.value})}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>{modo === 'editar' ? 'Vencimento' : '1º Vencimento'}</Label>
                <Input
                  type="date"
                  value={formData.vencimento}
                  onChange={e => setFormData({...formData, vencimento: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Favorecido / Credor</Label>
              <Input
                value={formData.favorecido}
                onChange={e => setFormData({...formData, favorecido: e.target.value})}
                placeholder="Quem recebe"
              />
            </div>
            
            {/* RECORRÊNCIA — SOMENTE NO MODO NOVO */}
            {modo === 'novo' && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, recorrente: checked as boolean})
                    }
                  />
                  <Label 
                    htmlFor="recorrente" 
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Repeat className="h-4 w-4" />
                    Despesa Recorrente
                  </Label>
                </div>
                
                {formData.recorrente && (
                  <div className="pl-6">
                    <Label htmlFor="quantidadeMeses">Quantidade de meses vigentes *</Label>
                    <Input
                      id="quantidadeMeses"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.quantidadeMeses}
                      onChange={e => 
                        setFormData({...formData, quantidadeMeses: e.target.value})
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Serão gerados lançamentos mensais consecutivos (máx. 60 meses)
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <Label>Observação</Label>
              <Input
                value={formData.observacao}
                onChange={e => setFormData({...formData, observacao: e.target.value})}
                placeholder="Detalhes adicionais"
              />
            </div>
            
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={fecharDialog}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button onClick={salvar}>
                {modo === 'editar' 
                  ? <><Pencil className="h-4 w-4 mr-1" /> Atualizar</>
                  : formData.recorrente 
                    ? <><Repeat className="h-4 w-4 mr-1" /> Gerar {formData.quantidadeMeses} Lançamentos</>
                    : <><Plus className="h-4 w-4 mr-1" /> Salvar Lançamento</>
                }
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========== MODAL: CONFIRMAR EXCLUSÃO =========== */}
      <Dialog open={excluirModalAberto} onOpenChange={setExcluirModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lançamento?<br />
              <strong>{contaExcluir?.descricao}</strong><br />
              Valor: {contaExcluir && formatCurrency(contaExcluir.valor)}<br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcluirModalAberto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarExclusao}>
              Sim, excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}