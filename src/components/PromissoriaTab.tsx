import { useEffect, useMemo, useState } from 'react';
import { AppConfig, Cliente, Titulo } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { calcularNotas, formatBRL, gerarPromissoriaPDF, dateToLong } from '@/lib/promissoria';

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

  const credor = config.credor || { nome: '', cpfCnpj: '', cidadeEstado: '' };

  // Preenche cidade/estado a partir do credor (uma vez)
  useEffect(() => {
    if (!cidadeEstado && credor.cidadeEstado) setCidadeEstado(credor.cidadeEstado);
  }, [credor.cidadeEstado, cidadeEstado]);

  const devedor: Cliente | undefined = useMemo(
    () => config.clientes.find(c => c.id === clienteId),
    [config.clientes, clienteId]
  );

  const valorNum = parseFloat(valorTotal.replace(',', '.')) || 0;
  const qtdNum = parseInt(quantidade) || 0;

  const notas = useMemo(() => {
    if (!devedor || !primeiroVencimento || valorNum <= 0 || qtdNum < 1) return [];
    return calcularNotas({
      quantidade: qtdNum,
      cidadeEstado,
      primeiroVencimento,
      valorTotal: valorNum,
      credor,
      devedor,
    });
  }, [qtdNum, cidadeEstado, primeiroVencimento, valorNum, credor, devedor]);

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

  const salvarComoTitulos = () => {
    if (!devedor || !onAddTitulos) return;
    const hoje = new Date().toISOString().split('T')[0];
    const proprietarioPadrao = config.proprietarios[0]?.id || '';
    const novos: Omit<Titulo, 'id' | 'numero'>[] = notas.map(n => ({
      tipo: `Promissória ${n.numero}`,
      cliente: devedor.nome,
      clienteId: devedor.id,
      telefone: devedor.telefone || '',
      dataEmissao: hoje,
      vencimento: n.vencimento.toISOString().split('T')[0],
      valor: n.valor,
      proprietario: proprietarioPadrao,
    }));
    onAddTitulos(novos);
    toast.success(`${novos.length} título(s) salvo(s) no banco`);
  };

  const handlePDF = () => {
    if (!validar() || !devedor) return;
    const pdf = gerarPromissoriaPDF(
      { quantidade: qtdNum, cidadeEstado, primeiroVencimento, valorTotal: valorNum, credor, devedor },
      notas
    );
    pdf.save(`promissorias-${devedor.nome.replace(/\s+/g, '_')}.pdf`);
    salvarComoTitulos();
    toast.success('PDF gerado!');
  };

  const handleImprimir = () => {
    if (!validar() || !devedor) return;
    const pdf = gerarPromissoriaPDF(
      { quantidade: qtdNum, cidadeEstado, primeiroVencimento, valorTotal: valorNum, credor, devedor },
      notas
    );
    const blobUrl = pdf.output('bloburl');
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.onload = () => setTimeout(() => win.print(), 300);
    } else {
      toast.error('Bloqueado pelo navegador. Permita popups.');
    }
    salvarComoTitulos();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">📄 Notas Promissórias</h2>

      {(!credor.nome || !credor.cpfCnpj) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 text-xs">
            ⚠️ Cadastre os dados do <strong>Credor</strong> em Configurações antes de emitir.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dados da Emissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <Input
              value={cidadeEstado}
              onChange={e => setCidadeEstado(e.target.value)}
              placeholder="Ex: São Paulo/SP"
            />
          </div>
          <div>
            <Label className="text-xs">Data do 1º Vencimento</Label>
            <Input
              type="date"
              value={primeiroVencimento}
              onChange={e => setPrimeiroVencimento(e.target.value)}
            />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Devedor</CardTitle>
        </CardHeader>
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
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              <p>📱 {devedor.telefone || '—'}</p>
              <p>🪪 CPF/CNPJ: {devedor.cpfCnpj || '— (cadastre no cliente)'}</p>
              <p>📍 {[devedor.logradouro, devedor.numero, devedor.bairro, devedor.cidade && `${devedor.cidade}/${devedor.estado}`, devedor.cep && `CEP ${devedor.cep}`].filter(Boolean).join(', ') || '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Credor</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p><strong>Nome:</strong> {credor.nome || '— (configure)'}</p>
          <p><strong>CPF/CNPJ:</strong> {credor.cpfCnpj || '— (configure)'}</p>
          <p><strong>Cidade/Estado:</strong> {credor.cidadeEstado || '— (configure)'}</p>
        </CardContent>
      </Card>

      {notas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pré-visualização ({notas.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {notas.map(n => (
              <div key={n.numero} className="text-xs border border-border rounded-md p-2">
                <div className="flex justify-between font-medium">
                  <span>Nota {n.numero}</span>
                  <span>{formatBRL(n.valor)}</span>
                </div>
                <p className="text-muted-foreground">Vencimento: {dateToLong(n.vencimento)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Ao clicar em "Criar PDF" ou "Imprimir", as promissórias são salvas automaticamente no Banco de Títulos.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handlePDF} disabled={notas.length === 0}>
          <FileDown className="h-4 w-4 mr-1" /> Criar PDF
        </Button>
        <Button onClick={handleImprimir} disabled={notas.length === 0}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir
        </Button>
      </div>
    </div>
  );
}
