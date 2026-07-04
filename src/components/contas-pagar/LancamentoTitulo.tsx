import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useContasPagarCatalog } from '@/hooks/useContasPagarCatalog';
import { ContaPagar } from '@/types/titulo';

export interface LancamentoTituloPayload {
  tipoTituloId: string;
  tipoTituloNome: string;
  credorId: string;
  credorNome: string;
  valor: number;
  vencimento: string;
  descricao?: string;
}

interface LancamentoTituloProps {
  editingConta: ContaPagar | null;
  onSubmit: (payload: LancamentoTituloPayload) => Promise<void> | void;
  onCancelEdit: () => void;
}

const initialForm = () => ({
  tipoTituloId: '',
  credorId: '',
  valor: '',
  vencimento: new Date().toISOString().split('T')[0],
  descricao: '',
});

export function LancamentoTitulo({ editingConta, onSubmit, onCancelEdit }: LancamentoTituloProps) {
  const { tituloConfigs, credores, loading } = useContasPagarCatalog();
  const [form, setForm] = useState(initialForm());
  const editing = !!editingConta;

  const tiposAtivos = tituloConfigs.filter(item => item.ativo);

  useEffect(() => {
    if (editingConta) {
      setForm({
        tipoTituloId: editingConta.tipoTitulo || '',
        credorId: editingConta.credorId || '',
        valor: String(editingConta.valor ?? ''),
        vencimento: editingConta.vencimento || new Date().toISOString().split('T')[0],
        descricao: editingConta.descricao || '',
      });
    } else {
      setForm(initialForm());
    }
  }, [editingConta]);

  const handleCancelar = () => {
    setForm(initialForm());
    onCancelEdit();
  };

  const handleSalvar = async () => {
    const valor = Number(form.valor.replace(',', '.'));
    const tituloSelecionado = tituloConfigs.find(item => item.id === form.tipoTituloId || item.nome === form.tipoTituloId);
    const credorSelecionado = credores.find(item => item.id === form.credorId);

    if (!tituloSelecionado || !credorSelecionado || !form.vencimento || !Number.isFinite(valor) || valor <= 0) {
      toast.error('Preencha tipo de título, credor, valor e vencimento.');
      return;
    }

    try {
      await onSubmit({
        tipoTituloId: tituloSelecionado.id,
        tipoTituloNome: tituloSelecionado.nome,
        credorId: credorSelecionado.id,
        credorNome: credorSelecionado.nomeEmpresa,
        valor,
        vencimento: form.vencimento,
        descricao: form.descricao.trim() || undefined,
      });
      setForm(initialForm());
      toast.success('Lançamento salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar lançamento.');
    }
  };

  const fieldClass = editing ? 'text-red-600' : '';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lançamento de Títulos</CardTitle>
        {editing && (
          <Button size="sm" variant="ghost" onClick={handleCancelar}><X className="h-4 w-4 mr-1" />Cancelar edição</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className={fieldClass}>Tipo de Título</Label>
                <Select value={form.tipoTituloId || 'none'} onValueChange={(value) => setForm(prev => ({ ...prev, tipoTituloId: value === 'none' ? '' : value }))}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tiposAtivos.map(item => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={fieldClass}>Credor</Label>
                <Select value={form.credorId || 'none'} onValueChange={(value) => setForm(prev => ({ ...prev, credorId: value === 'none' ? '' : value }))}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {credores.map(item => <SelectItem key={item.id} value={item.id}>{item.nomeEmpresa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={fieldClass}>Valor</Label>
                <Input value={form.valor} onChange={(event) => setForm(prev => ({ ...prev, valor: event.target.value }))} className={fieldClass} />
              </div>
              <div>
                <Label className={fieldClass}>Data de Vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={(event) => setForm(prev => ({ ...prev, vencimento: event.target.value }))} className={fieldClass} />
              </div>
            </div>
            <div>
              <Label className={fieldClass}>Descrição (opcional)</Label>
              <Textarea value={form.descricao} onChange={(event) => setForm(prev => ({ ...prev, descricao: event.target.value }))} className={fieldClass} rows={2} />
            </div>
            {tiposAtivos.length === 0 || credores.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Cadastre tipos de título e credores em Configurações → Contas a Pagar.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={handleSalvar}>{editing ? 'Atualizar' : 'Salvar'}</Button>
              {editing && <Button variant="outline" onClick={handleCancelar}>Cancelar</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
