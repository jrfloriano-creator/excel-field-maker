// src/components/contas-pagar/ContasPagarDespesas.tsx
import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Shield, Gift, Home, Zap, Briefcase, ShieldCheck, Wrench, Megaphone, CreditCard, Plane, FileText, Repeat, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency, hojeLocal } from '@/lib/calculos';
import type { AppConfig, ContaPagar, CategoriaDespesa } from '@/types/titulo';
import { CATEGORIA_DESPESA_NOMES } from '@/types/titulo';
import { generateId } from '@/lib/storage';

const categoriasConfig: Array<{
  id: CategoriaDespesa;
  nome: string;
  icone: any;
}> = [
  { id: 'REMUNERACAO', nome: CATEGORIA_DESPESA_NOMES['REMUNERACAO'], icone: Users },
  { id: 'ENCARGOS_SOCIAIS', nome: CATEGORIA_DESPESA_NOMES['ENCARGOS_SOCIAIS'], icone: Shield },
  { id: 'BENEFICIOS', nome: CATEGORIA_DESPESA_NOMES['BENEFICIOS'], icone: Gift },
  { id: 'OCUPACAO', nome: CATEGORIA_DESPESA_NOMES['OCUPACAO'], icone: Home },
  { id: 'TARIFAS_PUBLICAS', nome: CATEGORIA_DESPESA_NOMES['TARIFAS_PUBLICAS'], icone: Zap },
  { id: 'PRESTADORES_SERVICOS', nome: CATEGORIA_DESPESA_NOMES['PRESTADORES_SERVICOS'], icone: Briefcase },
  { id: 'SEGUROS', nome: CATEGORIA_DESPESA_NOMES['SEGUROS'], icone: ShieldCheck },
  { id: 'MANUTENCAO', nome: CATEGORIA_DESPESA_NOMES['MANUTENCAO'], icone: Wrench },
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

// CORREÇÃO CRÍTICA: Helper addMonths que limita dia ao fim do mês
// Antes: 31/01 + 1 mês = 03/03 (fevereiro pulava)
function addMonthsLimitado(data: Date, meses: number): Date {
  const d = new Date(data);
  const diaOriginal = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // Se o dia "estourou" (ex: 31/01 → 03/03), volta para o último dia do mês correto
  if (d.getDate() < diaOriginal) {
    d.setDate(0); // volta para o último dia do mês anterior
  }
  return d;
}

function dateToISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function ContasPagarDespesas({
  config,
  contas,
  addConta,
  onUpdateConta,
  onDeleteConta,
}: ContasPagarDespesasProps) {
  const contasPorCategoria = useMemo(() => {
    const mapa = new Map<CategoriaDespesa, ContaPagar[]>();
    categoriasConfig.forEach(cat => mapa.set(cat.id, []));
    contas.forEach(conta => {
      const lista = mapa.get(conta.categoria as CategoriaDespesa);
      if (lista) lista.push(conta);
    });
    return mapa;
  }, [contas]);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaDespesa | null>(null);
  const [modo, setModo] = useState<'novo' | 'editar'>('novo');
  const [contaEdicao, setContaEdicao] = useState<ContaPagar | null>(null);
  const [excluirModalAberto, setExcluirModalAberto] = useState(false);
  const [contaExcluir, setContaExcluir] = useState<ContaPagar | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    vencimento: hojeLocal(),
    favorecido: '',
    observacoes: '',
    recorrente: false,
    quantidadeMeses: '12',
  });
  const [salvando, setSalvando] = useState(false);

  const abrirNovo = (categoriaId: CategoriaDespesa) => {
    setCategoriaAtiva(categoriaId);
    setModo('novo');
    setContaEdicao(null);
    setFormData({
      descricao: '',
      valor: '',
      vencimento: hojeLocal(),
      favorecido: '',
      observacoes: '',
      recorrente: false,
      quantidadeMeses: '12',
    });
    setDialogAberto(true);
  };

  const abrirEditar = (conta: ContaPagar) => {
    // CORREÇÃO: bloqueia edição de contas PAGAS
    if (conta.status === 'PAGO') {
      toast.error('Não é possível editar uma conta já paga. Reverta a baixa primeiro.');
      return;
    }
    setCategoriaAtiva(conta.categoria as CategoriaDespesa);
    setModo('editar');
    setContaEdicao(conta);
    setFormData({
      descricao: conta.descricao,
      valor: String(conta.valor),
      vencimento: conta.vencimento,
      favorecido: conta.favorecido || '',
      observacoes: conta.observacoes || conta.observacao || '',
      recorrente: !!conta.recorrente,
      quantidadeMeses: String(conta.vigenciaMeses || 1),
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Informe a Descrição!');
      return;
    }
    if (!formData.valor || Number(formData.valor) <= 0) {
      toast.error('Informe um Valor válido!');
      return;
    }
    // CORREÇÃO CRÍTICA: valida vencimento (não pode estar vazio)
    if (!formData.vencimento) {
      toast.error('Informe a data de vencimento!');
      return;
    }

    setSalvando(true);

    try {
      if (modo === 'editar' && contaEdicao) {
        // CORREÇÃO: recalcula competência ao mudar vencimento
        const competencia = formData.vencimento.slice(0, 7);
        await onUpdateConta(contaEdicao.id, {
          descricao: formData.descricao.trim(),
          valor: Number(formData.valor),
          vencimento: formData.vencimento,
          competencia,
          favorecido: formData.favorecido.trim() || undefined,
          observacoes: formData.observacoes.trim() || undefined,
        });
        toast.success('✅ Lançamento atualizado!');
        setDialogAberto(false);
        return;
      }

      if (!categoriaAtiva) {
        toast.error('Selecione uma categoria!');
        return;
      }

      const valorNumerico = Number(formData.valor);
      // CORREÇÃO CRÍTICA: usa parseLocalDate em vez de new Date(string) para evitar UTC
      const [ano, mes, dia] = formData.vencimento.split('-').map(Number);
      const dataBase = new Date(ano, mes - 1, dia);
      const quantidadeMeses = formData.recorrente
        ? Math.max(1, Math.min(60, Number(formData.quantidadeMeses) || 1))
        : 1;

      // CORREÇÃO CRÍTICA: gera ID de grupo para recorrência
      const grupoRecorrenciaId = quantidadeMeses > 1 ? generateId() : undefined;

      for (let i = 0; i < quantidadeMeses; i++) {
        // CORREÇÃO CRÍTICA: usa addMonthsLimitado (não setMonth direto)
        const dataVencimento = addMonthsLimitado(dataBase, i);
        const vencimento = dateToISO(dataVencimento);
        const competencia = vencimento.slice(0, 7);

        // CORREÇÃO: padroniza campo observacoes (não observacao)
        // CORREÇÃO: grava recorrente + grupoRecorrenciaId + numeroParcelaAtual
        await addConta({
          descricao: quantidadeMeses > 1
            ? `${formData.descricao.trim()} (${i + 1}/${quantidadeMeses})`
            : formData.descricao.trim(),
          categoria: categoriaAtiva,
          tipo: 'DESPESA',
          favorecido: formData.favorecido.trim() || CATEGORIA_DESPESA_NOMES[categoriaAtiva],
          valor: valorNumerico,
          vencimento: vencimento,
          competencia: competencia,
          observacoes: formData.observacoes.trim() || undefined,
          recorrente: quantidadeMeses > 1,
          grupoRecorrenciaId: grupoRecorrenciaId,
          numeroParcelaAtual: quantidadeMeses > 1 ? i + 1 : undefined,
          numeroParcelas: quantidadeMeses > 1 ? quantidadeMeses : undefined,
          vigenciaMeses: quantidadeMeses > 1 ? quantidadeMeses : undefined,
        });
      }

      toast.success(
        quantidadeMeses === 1
          ? `✅ Lançamento salvo — ${CATEGORIA_DESPESA_NOMES[categoriaAtiva]}: ${formatCurrency(valorNumerico)}`
          : `✅ ${quantidadeMeses} lançamentos recorrentes criados — ${CATEGORIA_DESPESA_NOMES[categoriaAtiva]}`
      );
      setDialogAberto(false);
    } catch (e) {
      console.error('[ContasPagarDespesas] erro ao salvar', e);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!contaExcluir) return;
    // CORREÇÃO: exige motivo para exclusão
    if (!motivoExclusao.trim()) {
      toast.error('Informe o motivo da exclusão');
      return;
    }
    // CORREÇÃO: bloqueia exclusão de contas PAGAS
    if (contaExcluir.status === 'PAGO') {
      toast.error('Não é possível excluir uma conta já paga. Reverta a baixa primeiro.');
      return;
    }
    if (onDeleteConta) {
      try {
        await onDeleteConta(contaExcluir.id);
        toast.success('✅ Lançamento excluído!');
        setContaExcluir(null);
        setExcluirModalAberto(false);
        setMotivoExclusao('');
      } catch (e) {
        console.error('[ContasPagarDespesas] erro ao excluir', e);
        toast.error('Erro ao excluir lançamento');
      }
    }
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
                        <div
                          className="flex-1 min-w-0 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1"
                          onClick={() => abrirEditar(item)}
                        >
                          <p className="font-medium text-sm truncate">
                            {item.numero} — {item.descricao}
                            {item.recorrente && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                recorrente
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.favorecido || '—'} • Venc: {formatCurrency(item.valor)}
                          </p>
                        </div>
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
                                setMotivoExclusao('');
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
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>{modo === 'editar' ? 'Vencimento' : '1º Vencimento'} *</Label>
                <Input
                  type="date"
                  value={formData.vencimento}
                  onChange={e => setFormData({ ...formData, vencimento: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Favorecido / Credor</Label>
              <Input
                value={formData.favorecido}
                onChange={e => setFormData({ ...formData, favorecido: e.target.value })}
                placeholder="Quem recebe"
              />
            </div>
            {modo === 'novo' && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, recorrente: checked as boolean })
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
                        setFormData({ ...formData, quantidadeMeses: e.target.value })
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
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Detalhes adicionais"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={fecharDialog}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? (
                  'Salvando...'
                ) : modo === 'editar' ? (
                  <>
                    <Pencil className="h-4 w-4 mr-1" /> Atualizar
                  </>
                ) : formData.recorrente ? (
                  <>
                    <Repeat className="h-4 w-4 mr-1" /> Gerar {formData.quantidadeMeses} Lançamentos
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" /> Salvar Lançamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========== MODAL: CONFIRMAR EXCLUSÃO COM MOTIVO =========== */}
      <Dialog open={excluirModalAberto} onOpenChange={setExcluirModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lançamento?<br />
              <strong>{contaExcluir?.descricao}</strong><br />
              Valor: {contaExcluir && formatCurrency(contaExcluir.valor)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo da exclusão *</Label>
            <Input
              value={motivoExclusao}
              onChange={e => setMotivoExclusao(e.target.value)}
              placeholder="Ex: Lançamento duplicado, erro de digitação..."
            />
          </div>
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