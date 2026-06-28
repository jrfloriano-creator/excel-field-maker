import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ContaPagar, ContaPagarCategoria } from '@/types/titulo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface ContaPagarFormProps {
  config: AppConfig;
  editData?: ContaPagar | null;
  onSubmit: (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onClose: () => void;
}

const CATEGORIAS: { value: ContaPagarCategoria; label: string }[] = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'FUNCIONARIO', label: 'Funcionário' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'UTILIDADE', label: 'Utilidade' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'OUTRO', label: 'Outro' },
];

export function ContaPagarForm({ config, editData, onSubmit, onClose }: ContaPagarFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<ContaPagarCategoria>('FORNECEDOR');
  const [favorecido, setFavorecido] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(today);
  const [competencia, setCompetencia] = useState(today.slice(0, 7));
  const [centroCustoId, setCentroCustoId] = useState('');
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const centrosAtivos = useMemo(
    () => (config.contasPagar?.centrosCusto || []).filter(item => item.ativo),
    [config.contasPagar?.centrosCusto]
  );
  const formasAtivas = useMemo(
    () => (config.contasPagar?.formasPagamento || []).filter(item => item.ativo),
    [config.contasPagar?.formasPagamento]
  );

  useEffect(() => {
    if (!editData) return;
    setDescricao(editData.descricao);
    setCategoria(editData.categoria);
    setFavorecido(editData.favorecido);
    setValor(String(editData.valor));
    setVencimento(editData.vencimento);
    setCompetencia(editData.competencia || editData.vencimento.slice(0, 7));
    setCentroCustoId(editData.centroCustoId || '');
    setFormaPagamentoId(editData.formaPagamentoId || '');
    setObservacoes(editData.observacoes || '');
  }, [editData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim() || !favorecido.trim() || !vencimento || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Preencha descrição, favorecido, vencimento e valor válido.');
      return;
    }

    const centro = centrosAtivos.find(item => item.id === centroCustoId);
    const forma = formasAtivas.find(item => item.id === formaPagamentoId);

    onSubmit({
      descricao: descricao.trim(),
      categoria,
      favorecido: favorecido.trim(),
      valor: valorNumerico,
      vencimento,
      competencia,
      observacoes: observacoes.trim() || undefined,
      centroCustoId: centro?.id,
      centroCustoNome: centro?.nome,
      formaPagamentoId: forma?.id,
      formaPagamentoNome: forma?.nome,
      paidAt: editData?.paidAt,
      paidAmount: editData?.paidAmount,
      reversalReason: editData?.reversalReason,
      reversedAt: editData?.reversedAt,
      reversedBy: editData?.reversedBy,
    });
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{editData ? 'Editar Lançamento' : 'Novo Lançamento'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Descrição *</Label>
            <Input value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Ex: Boleto energia matriz" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Categoria *</Label>
              <Select value={categoria} onValueChange={value => setCategoria(value as ContaPagarCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(item => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Favorecido *</Label>
              <Input value={favorecido} onChange={event => setFavorecido(event.target.value)} placeholder="Ex: CPFL / João / Receita Federal" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" value={valor} onChange={event => setValor(event.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Vencimento *</Label>
              <Input type="date" value={vencimento} onChange={event => setVencimento(event.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Competência</Label>
              <Input type="month" value={competencia} onChange={event => setCompetencia(event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Centro de custo</Label>
              <Select value={centroCustoId || 'none'} onValueChange={value => setCentroCustoId(value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder={centrosAtivos.length === 0 ? 'Cadastre em Configurações' : 'Selecione'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem centro de custo</SelectItem>
                  {centrosAtivos.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Forma padrão de pagamento</Label>
              <Select value={formaPagamentoId || 'none'} onValueChange={value => setFormaPagamentoId(value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder={formasAtivas.length === 0 ? 'Cadastre em Configurações' : 'Selecione'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem forma padrão</SelectItem>
                  {formasAtivas.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={observacoes} onChange={event => setObservacoes(event.target.value)} rows={3} placeholder="Informações adicionais do lançamento" />
          </div>
          <Button type="submit" className="w-full">{editData ? 'Salvar alterações' : 'Adicionar lançamento'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}