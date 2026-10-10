import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { gerarParcelas } from '@/lib/parcelamento';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useContasPagar } from '@/hooks/useContasPagar';
import { formatCurrency } from '@/lib/calculos';

export interface LancamentoTituloPayload {
  tipoTituloId: string;
  tipoTituloNome: string;
  credorId: string;
  credorNome: string;
  descricao: string;
  valor: number;
  valorTotal: number;
  numeroParcelas: number;
  vencimento: string;
  competencia: string;
  numeroCheque?: string;
  banco?: string;
  bandeiraCartao?: string;
  emissorCartao?: string;
}

interface LancamentoTituloProps {
  editingConta?: any;
  onSubmit: (payload: LancamentoTituloPayload | LancamentoTituloPayload[]) => void;
  onCancelEdit: () => void;
}

const TIPOS_TITULO = [
  { id: 'BOLETO', nome: 'Boleto' },
  { id: 'CHEQUE', nome: 'Cheque' },
  { id: 'CARTAO_CRED', nome: 'Cartão de Crédito' },
  { id: 'CARTAO_DEB', nome: 'Cartão de Débito' },
  { id: 'PIX', nome: 'PIX' },
  { id: 'PIX_PARCELADO', nome: 'PIX Parcelado' },
];

const BANCOS = [
  'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa Econômica Federal',
  'Nubank', 'Banco Inter', 'C6 Bank', 'Banco Pan', 'Safra', 'BTG Pactual', 'Outro'
];

const BANDEIRAS_CARTAO = [
  'Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners', 'Outra'
];

export function LancamentoTitulo({ editingConta, onSubmit, onCancelEdit }: LancamentoTituloProps) {
  const { catalog } = useContasPagar();
  
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [credorSelecionado, setCredorSelecionado] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [vencimento, setVencimento] = useState('');
  const [lancamentoParcelado, setLancamentoParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState<number>(2);
  
  const [numeroCheque, setNumeroCheque] = useState('');
  const [banco, setBanco] = useState('');
  const [bandeiraCartao, setBandeiraCartao] = useState('');
  const [emissorCartao, setEmissorCartao] = useState('');

  useEffect(() => {
    if (editingConta) {
      const tipo = TIPOS_TITULO.find(t => t.nome === editingConta.tipoTitulo || t.id === editingConta.tipoTitulo);
      if (tipo) setTipoSelecionado(tipo.id);
      setDescricao(editingConta.descricao || '');
      setValor(editingConta.valor || 0);
      setVencimento(editingConta.vencimento || '');
      setLancamentoParcelado(!!editingConta.numeroParcelas && editingConta.numeroParcelas > 1);
      setNumeroParcelas(editingConta.numeroParcelas || 2);
      setNumeroCheque(editingConta.numeroCheque || '');
      setBanco(editingConta.banco || '');
      setBandeiraCartao(editingConta.bandeiraCartao || '');
      setEmissorCartao(editingConta.emissorCartao || '');
      if (editingConta.credorId) setCredorSelecionado(editingConta.credorId);
    }
  }, [editingConta]);

  // ✅ Busca direto do catálogo SQLite (caminho correto!)
  const listaCredores = catalog?.credores || [];
  const credor = listaCredores.find((c: any) => c.id === credorSelecionado);
  
  const precisaDadosCheque = tipoSelecionado === 'CHEQUE';
  const precisaDadosCartao = tipoSelecionado === 'CARTAO_CRED' || tipoSelecionado === 'CARTAO_DEB';
  const podeParcelar = ['BOLETO', 'CARTAO_CRED', 'PIX_PARCELADO', 'CHEQUE'].includes(tipoSelecionado);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoSelecionado) return toast.error('Selecione o tipo de título');
    if (!credorSelecionado) return toast.error('Selecione o credor/fornecedor');
    if (!valor || valor <= 0) return toast.error('Informe o valor');
    if (!vencimento) return toast.error('Informe a data de vencimento');
    
    const competencia = vencimento.slice(0, 7);

    if (lancamentoParcelado && podeParcelar && numeroParcelas > 1) {
      const parcelas = gerarParcelas(valor, numeroParcelas, vencimento);
      const payload: LancamentoTituloPayload[] = parcelas.map(p => ({
        tipoTituloId: tipoSelecionado,
        tipoTituloNome: TIPOS_TITULO.find(t => t.id === tipoSelecionado)?.nome || '',
        credorId: credorSelecionado,
        credorNome: credor?.nomeEmpresa || '',
        descricao,
        valor: p.valorParcela,
        valorTotal: valor,
        numeroParcelas,
        vencimento: p.dataVencimento,
        competencia: p.dataVencimento.slice(0, 7),
        ...(precisaDadosCheque && { numeroCheque, banco }),
        ...(precisaDadosCartao && { bandeiraCartao, emissorCartao }),
      }));
      onSubmit(payload);
    } else {
      const payload: LancamentoTituloPayload = {
        tipoTituloId: tipoSelecionado,
        tipoTituloNome: TIPOS_TITULO.find(t => t.id === tipoSelecionado)?.nome || '',
        credorId: credorSelecionado,
        credorNome: credor?.nomeEmpresa || '',
        descricao,
        valor,
        valorTotal: valor,
        numeroParcelas: 1,
        vencimento,
        competencia,
        ...(precisaDadosCheque && { numeroCheque, banco }),
        ...(precisaDadosCartao && { bandeiraCartao, emissorCartao }),
      };
      onSubmit(payload);
    }
  };

  if (editingConta) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Editar Lançamento</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Edição em andamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lançamento de Título</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Título *</Label>
              <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TITULO.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Credor / Fornecedor *</Label>
              <Select value={credorSelecionado} onValueChange={setCredorSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    listaCredores.length === 0 
                      ? 'Nenhum credor cadastrado' 
                      : 'Selecione o credor'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {listaCredores.length === 0 ? (
                    <div className="p-3 text-sm text-center text-muted-foreground">
                      ⚠️ Cadastre em: Configurações → Contas a Pagar → Credores
                    </div>
                  ) : (
                    listaCredores.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nomeEmpresa}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do título/despesa"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                value={valor || ''}
                onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </div>
          </div>

          {podeParcelar && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parcelado"
                  checked={lancamentoParcelado}
                  onCheckedChange={(checked) => setLancamentoParcelado(checked as boolean)}
                />
                <label htmlFor="parcelado" className="text-sm font-medium">
                  Lançamento Parcelado
                </label>
              </div>

              {lancamentoParcelado && numeroParcelas > 1 && (
                <div className="space-y-3 ml-6">
                  <div className="space-y-2">
                    <Label>Quantidade de Parcelas</Label>
                    <Input
                      type="number"
                      min="2"
                      max="60"
                      value={numeroParcelas}
                      onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 2)}
                      className="max-w-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor de Cada Parcela</Label>
                    <Input
                      value={numeroParcelas > 0 ? formatCurrency(valor / numeroParcelas) : '—'}
                      disabled
                      className="bg-muted text-emerald-600 font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {precisaDadosCheque && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Número do Cheque</Label>
                <Input
                  value={numeroCheque}
                  onChange={(e) => setNumeroCheque(e.target.value)}
                  placeholder="00000"
                />
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {precisaDadosCartao && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Bandeira do Cartão</Label>
                <Select value={bandeiraCartao} onValueChange={setBandeiraCartao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a bandeira" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANDEIRAS_CARTAO.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Banco Emissor</Label>
                <Select value={emissorCartao} onValueChange={setEmissorCartao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Salvar Lançamento
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}