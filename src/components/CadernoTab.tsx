import { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, Cliente, Titulo, Desconto } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Printer, Percent, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '@/lib/promissoria';
import { gerarCadernoPDF } from '@/lib/caderno';
import { savePdf } from '@/lib/savePdf';
import { aplicarDesconto, formatarDesconto } from '@/lib/descontos';

interface Props {
  config: AppConfig;
  onAddTitulos?: (titulos: Omit<Titulo, 'id' | 'numero'>[]) => void;
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toISOString().split('T')[0];
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return dt.toISOString().split('T')[0];
}

export function CadernoTab({ config, onAddTitulos }: Props) {
  const hoje = new Date().toISOString().split('T')[0];
  const [proprietario, setProprietario] = useState(config.proprietarios[0]?.id || '');
  const [clienteId, setClienteId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [dataEmissao, setDataEmissao] = useState(hoje);
  const [primeiroVenc, setPrimeiroVenc] = useState(addDays(hoje, 30));
  const [vencTocado, setVencTocado] = useState(false);
  const [valorTotal, setValorTotal] = useState('');

  // Discount state
  const [descontoId, setDescontoId] = useState<string>('');
  const [descontoManual, setDescontoManual] = useState<string>('');

  // Deduplication signature (same pattern as PromissoriaTab)
  const savedSignatureRef = useRef<string>('');

  const descontos = config.descontos || [];

  useEffect(() => {
    if (!vencTocado && dataEmissao) setPrimeiroVenc(addDays(dataEmissao, 30));
  }, [dataEmissao, vencTocado]);

  const cliente: Cliente | undefined = useMemo(
    () => config.clientes.find(c => c.id === clienteId),
    [config.clientes, clienteId]
  );

  const qtd = parseInt(quantidade) || 0;
  const valorBruto = parseFloat(valorTotal.replace(',', '.')) || 0;

  const descontoSelecionado: Desconto | null = descontos.find(d => d.id === descontoId) || null;
  const descontoManualNum = parseFloat(descontoManual.replace(',', '.')) || 0;

  const valorComDesconto = useMemo(() => {
    if (valorBruto <= 0) return 0;
    if (descontoSelecionado) return aplicarDesconto(valorBruto, descontoSelecionado);
    if (descontoManualNum > 0) return Math.max(0, valorBruto - descontoManualNum);
    return valorBruto;
  }, [valorBruto, descontoSelecionado, descontoManualNum]);

  const valorParcela = qtd > 0 ? valorComDesconto / qtd : 0;

  // Reset dedup signature when relevant inputs change
  useEffect(() => {
    savedSignatureRef.current = '';
  }, [clienteId, primeiroVenc, valorComDesconto, qtd]);

  const validar = (): boolean => {
    if (!proprietario) { toast.error('Selecione o proprietário'); return false; }
    if (!cliente) { toast.error('Selecione o cliente'); return false; }
    if (qtd < 1) { toast.error('Quantidade inválida'); return false; }
    if (valorComDesconto <= 0) { toast.error('Informe o valor total'); return false; }
    if (!primeiroVenc) { toast.error('Informe a data do 1º vencimento'); return false; }
    return true;
  };

  /**
   * Auto-save to DB — only once per unique combination of inputs (deduplication).
   */
  const salvarComoTitulos = () => {
    if (!cliente || !onAddTitulos) return;
    const signature = `${clienteId}|${primeiroVenc}|${valorComDesconto}|${qtd}|${dataEmissao}`;
    if (savedSignatureRef.current === signature) return; // already saved
    const novos: Omit<Titulo, 'id' | 'numero'>[] = Array.from({ length: qtd }, (_, i) => ({
      tipo: qtd > 1 ? `Caderno ${i + 1}/${qtd}` : 'Caderno',
      cliente: cliente.nome,
      clienteId: cliente.id,
      telefone: cliente.telefone || '',
      dataEmissao,
      vencimento: addMonths(primeiroVenc, i),
      valor: Number(valorParcela.toFixed(2)),
      proprietario,
    }));
    onAddTitulos(novos);
    savedSignatureRef.current = signature;
    toast.success('Titulo salvo automaticamente');
  };

  const buildPDFData = () => ({
    clienteNome: cliente!.nome,
    dataEmissao,
    valorTotal: valorComDesconto,
    parcelas: Array.from({ length: qtd }, (_, i) => ({
      numeroParcela: i + 1,
      dataVencimento: addMonths(primeiroVenc, i),
      valorParcela: Number(valorParcela.toFixed(2)),
    })),
    ...(descontoSelecionado
      ? { desconto: { apelido: descontoSelecionado.apelido, valorOriginal: valorBruto } }
      : descontoManualNum > 0
        ? { desconto: { apelido: `R$ ${formatBRL(descontoManualNum)}`, valorOriginal: valorBruto } }
        : {}),
  });

  const handlePDF = async () => {
    if (!validar() || !cliente) return;
    const pdf = gerarCadernoPDF(buildPDFData());
    const filename = `caderno-${cliente.nome.replace(/\s+/g, '_')}-${dataEmissao}.pdf`;
    await savePdf(pdf, filename, config.caminhoSalvarDados);
    salvarComoTitulos();
  };

  const handleImprimir = () => {
    if (!validar() || !cliente) return;
    const pdf = gerarCadernoPDF(buildPDFData());
    const blobUrl = pdf.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow?.print(); } catch { toast.error('Não foi possível abrir o diálogo de impressão.'); }
        setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(blobUrl); }, 120_000);
      }, 500);
    };
    salvarComoTitulos();
  };

  const hasDesconto = descontoSelecionado || descontoManualNum > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lançamento de Venda em Caderno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Proprietário</Label>
            <Select value={proprietario} onValueChange={setProprietario}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {config.proprietarios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tipo</Label>
            <Input value="Caderno" disabled />
          </div>

          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {config.clientes.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">Nenhum cliente cadastrado</div>
                ) : (
                  config.clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {cliente && (
              <p className="text-[11px] text-muted-foreground mt-1">📱 {cliente.telefone || '—'}</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Quantidade de Parcelas</Label>
            <Input
              type="number"
              min={1}
              value={quantidade}
              onChange={e => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data de Emissão</Label>
              <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">1º Vencimento</Label>
              <Input
                type="date"
                value={primeiroVenc}
                onChange={e => { setPrimeiroVenc(e.target.value); setVencTocado(true); }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Valor Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valorTotal}
              onChange={e => setValorTotal(e.target.value)}
              placeholder="0,00"
            />
            {qtd > 0 && valorBruto > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {qtd}x de {formatBRL(valorParcela)}
              </p>
            )}
          </div>

          {/* Desconto */}
          <div className="space-y-2 pt-1 border-t">
            <Label className="text-xs flex items-center gap-1">
              <Percent className="h-3 w-3 text-primary" /> Desconto (opcional)
            </Label>
            {descontos.length > 0 && (
              <div className="flex gap-2">
                <Select
                  value={descontoId}
                  onValueChange={(v) => { setDescontoId(v); setDescontoManual(''); }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Desconto pré-definido..." />
                  </SelectTrigger>
                  <SelectContent>
                    {descontos.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.apelido} — {formatarDesconto(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {descontoId && (
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => setDescontoId('')} title="Remover desconto">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {!descontoId && (
              <div>
                <Label className="text-xs text-muted-foreground">Ou desconto manual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 50.00"
                  value={descontoManual}
                  onChange={e => setDescontoManual(e.target.value)}
                />
              </div>
            )}
            {hasDesconto && valorBruto > 0 && (
              <div className="p-2 rounded bg-green-500/10 text-xs">
                <p className="text-green-700 dark:text-green-400 font-semibold">
                  Total com desconto: <strong>{formatBRL(valorComDesconto)}</strong>
                  {descontoSelecionado && (
                    <span className="ml-2 font-normal text-muted-foreground">(desconto de {formatarDesconto(descontoSelecionado)})</span>
                  )}
                  {!descontoSelecionado && descontoManualNum > 0 && (
                    <span className="ml-2 font-normal text-muted-foreground">(desconto de {formatBRL(descontoManualNum)})</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Ao clicar em "Criar PDF" ou "Imprimir", os títulos são salvos automaticamente no banco (apenas uma vez por lote).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePDF}
              disabled={!clienteId || qtd < 1 || valorComDesconto <= 0}
              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-sm"
            >
              <FileDown className="h-4 w-4 mr-1" /> Criar PDF
            </Button>
            <Button
              onClick={handleImprimir}
              disabled={!clienteId || qtd < 1 || valorComDesconto <= 0}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm"
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
