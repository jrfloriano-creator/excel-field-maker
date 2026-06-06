import { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, Cliente, Titulo, Desconto } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Printer, FolderOpen, Percent, X } from 'lucide-react';
import { toast } from 'sonner';
import { calcularNotas, formatBRL, gerarPromissoriaPDF, dateToLong } from '@/lib/promissoria';
import { savePdf, openFolder } from '@/lib/savePdf';
import { aplicarDesconto, formatarDesconto } from '@/lib/descontos';

interface Props {
  config: AppConfig;
  onAddTitulos?: (titulos: Omit<Titulo, 'id' | 'numero'>[]) => void;
}

export function PromissoriaTab({ config, onAddTitulos }: Props) {
  const [quantidade, setQuantidade] = useState<string>('');
  const [cidadeEstado, setCidadeEstado] = useState('');
  const [primeiroVencimento, setPrimeiroVencimento] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [proprietarioId, setProprietarioId] = useState<string>('');

  // Discount state
  const [descontoId, setDescontoId] = useState<string>('');        // selected pre-defined discount id
  const [descontoManual, setDescontoManual] = useState<string>(''); // manual discount value typed by user

  // Rastrea a assinatura dos últimos títulos salvos para evitar duplicatas
  const savedSignatureRef = useRef<string>('');

  const credor = config.credor || { nome: '', cpfCnpj: '', cidadeEstado: '' };
  const descontos = config.descontos || [];
  const proprietarios = config.proprietarios || [];

  // Preenche cidade/estado a partir do credor (uma vez)
  useEffect(() => {
    if (!cidadeEstado && credor.cidadeEstado) setCidadeEstado(credor.cidadeEstado);
  }, [credor.cidadeEstado, cidadeEstado]);

  // Inicializa proprietário padrão
  useEffect(() => {
    if (!proprietarioId && proprietarios.length > 0) {
      setProprietarioId(proprietarios[0].id);
    }
  }, [proprietarios, proprietarioId]);

  // Auto-preenche data do 1º vencimento com hoje + 30 dias
  useEffect(() => {
    if (!primeiroVencimento) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setPrimeiroVencimento(d.toISOString().split('T')[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const devedor: Cliente | undefined = useMemo(
    () => config.clientes.find(c => c.id === clienteId),
    [config.clientes, clienteId]
  );

  const valorNum = parseFloat(valorTotal.replace(',', '.')) || 0;
  const qtdNum = parseInt(quantidade) || 0;

  // Compute effective discount and final value
  const descontoSelecionado: Desconto | null = descontos.find(d => d.id === descontoId) || null;
  const descontoManualNum = parseFloat(descontoManual.replace(',', '.')) || 0;

  // Effective value after discount
  const valorComDesconto = useMemo(() => {
    if (valorNum <= 0) return 0;
    if (descontoSelecionado) {
      return aplicarDesconto(valorNum, descontoSelecionado);
    }
    if (descontoManualNum > 0) {
      // manual discount is always a fixed value subtraction
      return Math.max(0, valorNum - descontoManualNum);
    }
    return valorNum;
  }, [valorNum, descontoSelecionado, descontoManualNum]);

  const notas = useMemo(() => {
    if (!devedor || !primeiroVencimento || valorComDesconto <= 0 || qtdNum < 1) return [];
    return calcularNotas({
      quantidade: qtdNum,
      cidadeEstado,
      primeiroVencimento,
      valorTotal: valorComDesconto,
      credor,
      devedor,
    });
  }, [qtdNum, cidadeEstado, primeiroVencimento, valorComDesconto, credor, devedor]);

  // Reseta a assinatura quando os inputs mudam (permite nova impressão = novo save)
  useEffect(() => {
    savedSignatureRef.current = '';
  }, [clienteId, primeiroVencimento, valorComDesconto, qtdNum, proprietarioId]);

  const camposFaltandoDevedor = (c?: Cliente): string[] => {
    if (!c) return [];
    const f: string[] = [];
    if (!c.cpfCnpj) f.push('CPF/CNPJ');
    if (!c.cep) f.push('CEP');
    if (!c.logradouro) f.push('endereço');
    if (!c.cidade || !c.estado) f.push('cidade/UF');
    return f;
  };

  const validar = (): boolean => {
    if (!devedor) { toast.error('Selecione o devedor (cliente)'); return false; }
    const faltando = camposFaltandoDevedor(devedor);
    if (faltando.length > 0) {
      toast.error(`Cliente com dados faltando: ${faltando.join(', ')}. Complete o cadastro antes.`);
      return false;
    }
    if (!credor.nome || !credor.cpfCnpj) { toast.error('Cadastre o credor em Configurações'); return false; }
    if (!cidadeEstado) { toast.error('Informe Cidade/Estado'); return false; }
    if (!primeiroVencimento) { toast.error('Informe a data do 1º vencimento'); return false; }
    if (valorNum <= 0) { toast.error('Informe o valor total'); return false; }
    if (qtdNum < 1) { toast.error('Quantidade inválida'); return false; }
    return true;
  };

  /**
   * Salva os títulos no banco UMA ÚNICA VEZ por combinação de inputs.
   * Impressões subsequentes com os mesmos dados não geram duplicatas.
   */
  const salvarComoTitulos = () => {
    if (!devedor || !onAddTitulos) return;
    const signature = `${clienteId}|${primeiroVencimento}|${valorComDesconto}|${qtdNum}|${proprietarioId}`;
    if (savedSignatureRef.current === signature) return;
    const hoje = new Date().toISOString().split('T')[0];
    const proprietarioEfetivo = proprietarioId || config.proprietarios[0]?.id || '';
    const novos: Omit<Titulo, 'id' | 'numero'>[] = notas.map(n => ({
      tipo: `Promissória ${n.numero}`,
      cliente: devedor.nome,
      clienteId: devedor.id,
      telefone: devedor.telefone || '',
      dataEmissao: hoje,
      vencimento: n.vencimento.toISOString().split('T')[0],
      valor: n.valor,
      proprietario: proprietarioEfetivo,
    }));
    onAddTitulos(novos);
    savedSignatureRef.current = signature;
    toast.success(`${novos.length} título(s) salvo(s) no banco`);
  };

  const handlePDF = async () => {
    if (!validar() || !devedor) return;
    const pdf = gerarPromissoriaPDF(
      { quantidade: qtdNum, cidadeEstado, primeiroVencimento, valorTotal: valorComDesconto, credor, devedor },
      notas
    );
    const filename = `promissorias-${devedor.nome.replace(/\s+/g, '_')}.pdf`;
    await savePdf(pdf, filename, config.caminhoSalvarDados);
    salvarComoTitulos();
  };

  const handleImprimir = () => {
    if (!validar() || !devedor) return;
    const pdf = gerarPromissoriaPDF(
      { quantidade: qtdNum, cidadeEstado, primeiroVencimento, valorTotal: valorComDesconto, credor, devedor },
      notas
    );
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

  const handleAbrirPasta = () => { openFolder(config.caminhoSalvarDados); };

  const hasDesconto = descontoSelecionado || descontoManualNum > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📄 Notas Promissórias</h2>
        <Button variant="outline" size="sm" onClick={handleAbrirPasta} className="gap-1 text-xs">
          <FolderOpen className="h-3.5 w-3.5" /> Títulos Salvos
        </Button>
      </div>

      {(!credor.nome || !credor.cpfCnpj) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 text-xs text-foreground">
            ⚠️ Cadastre os dados do <strong>Credor</strong> em Configurações antes de emitir.
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md border border-border/60">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-600/10 to-violet-600/10 rounded-t-lg">
          <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">Dados da Emissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Quantidade de Notas Promissórias</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={quantidade}
              placeholder="Digite a quantidade"
              onChange={e => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div>
            <Label className="text-xs">Pagável em (Cidade/Estado)</Label>
            <Input value={cidadeEstado} onChange={e => setCidadeEstado(e.target.value)} placeholder="Ex: São Paulo/SP" />
          </div>
          <div>
            <Label className="text-xs">Data do 1º Vencimento</Label>
            <Input type="date" value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Valor Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={e => setValorTotal(e.target.value)}
              placeholder="0,00"
            />
            {qtdNum > 0 && valorNum > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {qtdNum}x de aprox. {formatBRL(valorNum / qtdNum)}
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
                  onValueChange={(v) => {
                    setDescontoId(v);
                    setDescontoManual(''); // clear manual when picking pre-defined
                  }}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setDescontoId('')}
                    title="Remover desconto"
                  >
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
            {hasDesconto && valorNum > 0 && (
              <div className="p-2 rounded bg-green-500/10 text-xs">
                <p className="text-green-700 dark:text-green-400 font-semibold">
                  Total com desconto: <strong>{formatBRL(valorComDesconto)}</strong>
                  {descontoSelecionado && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      (desconto de {formatarDesconto(descontoSelecionado)})
                    </span>
                  )}
                  {!descontoSelecionado && descontoManualNum > 0 && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      (desconto de {formatBRL(descontoManualNum)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Proprietário</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Proprietário do título</Label>
          {proprietarios.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum proprietário cadastrado em Configurações</p>
          ) : (
            <Select value={proprietarioId} onValueChange={setProprietarioId}>
              <SelectTrigger><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
              <SelectContent>
                {proprietarios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Devedor</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Selecionar Cliente</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Escolha um cliente cadastrado" /></SelectTrigger>
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
          {devedor && (
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1 p-2 bg-muted/30 rounded-lg">
              <p>📱 {devedor.telefone || '—'}</p>
              <p>🪪 CPF/CNPJ: {devedor.cpfCnpj || '— (cadastre no cliente)'}</p>
              <p>📍 {[devedor.logradouro, devedor.numero, devedor.bairro, devedor.cidade && `${devedor.cidade}/${devedor.estado}`, devedor.cep && `CEP ${devedor.cep}`].filter(Boolean).join(', ') || '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Credor</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1.5 p-3">
          <div className="flex gap-2"><span className="font-medium w-24">Nome:</span><span>{credor.nome || '— (configure)'}</span></div>
          <div className="flex gap-2"><span className="font-medium w-24">CPF/CNPJ:</span><span>{credor.cpfCnpj || '— (configure)'}</span></div>
          <div className="flex gap-2"><span className="font-medium w-24">Cidade/UF:</span><span>{credor.cidadeEstado || '— (configure)'}</span></div>
        </CardContent>
      </Card>

      {notas.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pré-visualização ({notas.length} nota{notas.length !== 1 ? 's' : ''})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {notas.map(n => (
              <div key={n.numero} className="text-xs border border-border rounded-lg p-2.5 bg-muted/20">
                <div className="flex justify-between font-semibold">
                  <span>Nota {n.numero}/{notas.length}</span>
                  <span className="text-purple-600 dark:text-purple-400">{formatBRL(n.valor)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">Vencimento: {dateToLong(n.vencimento)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Ao clicar em "Criar PDF" ou "Imprimir", as promissórias são salvas automaticamente no Banco de Títulos (apenas uma vez por lote).
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handlePDF}
          disabled={notas.length === 0}
          className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-sm"
        >
          <FileDown className="h-4 w-4 mr-1" /> Criar PDF
        </Button>
        <Button
          onClick={handleImprimir}
          disabled={notas.length === 0}
          className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm"
        >
          <Printer className="h-4 w-4 mr-1" /> Imprimir
        </Button>
      </div>
    </div>
  );
}
