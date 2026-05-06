import { useMemo, useState, useEffect } from 'react';
import { Titulo, AppConfig } from '@/types/titulo';
import { calcularTitulo, formatCurrency, formatDate, getMonthKey, formatMonthLabel } from '@/lib/calculos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
}

const TODOS = '__TODOS__';

export function Relatorios({ titulos, config }: Props) {
  const calculados = useMemo(
    () => titulos.map(t => calcularTitulo(t, config.taxa)),
    [titulos, config.taxa]
  );

  // Coletar opções
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    calculados.forEach(t => {
      if (t.situacao === 'PAGO' && t.dataPagamento) keys.add(getMonthKey(t.dataPagamento));
      else keys.add(getMonthKey(t.vencimento));
    });
    return Array.from(keys).sort();
  }, [calculados]);

  const tipos = useMemo(() => Array.from(new Set(calculados.map(t => t.tipo))).sort(), [calculados]);
  const clientes = useMemo(() => Array.from(new Set(calculados.map(t => t.cliente))).sort(), [calculados]);

  // Filtros
  const [fProprietario, setFProprietario] = useState<string>(TODOS);
  const [fTipo, setFTipo] = useState<string>(TODOS);
  const [fMes, setFMes] = useState<string>(TODOS);
  const [fCliente, setFCliente] = useState<string>(TODOS);

  // Default: mês atual se houver dados
  useEffect(() => {
    if (fMes !== TODOS) return;
    if (monthKeys.length === 0) return;
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthKeys.includes(currentKey)) setFMes(currentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKeys.length]);

  // Quando filtra por cliente, ignora tipo e mês (conforme requisito)
  const clienteAtivo = fCliente !== TODOS;

  const aplicaFiltros = (t: typeof calculados[number], dateForMonth: string) => {
    if (fProprietario !== TODOS && t.proprietario !== fProprietario) return false;
    if (clienteAtivo) return t.cliente === fCliente;
    if (fTipo !== TODOS && t.tipo !== fTipo) return false;
    if (fMes !== TODOS && getMonthKey(dateForMonth) !== fMes) return false;
    return true;
  };

  const recebidos = calculados
    .filter(t => t.situacao === 'PAGO' && t.dataPagamento && aplicaFiltros(t, t.dataPagamento!))
    .sort((a, b) => (b.dataPagamento || '').localeCompare(a.dataPagamento || ''));

  const atrasados = calculados
    .filter(t => t.situacao === 'VENCIDO' && aplicaFiltros(t, t.vencimento))
    .sort((a, b) => a.diasAVencer - b.diasAVencer);

  const noPrazo = calculados
    .filter(t => t.situacao === 'NO PRAZO' && aplicaFiltros(t, t.vencimento))
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  const totalRecebido = recebidos.reduce((s, t) => s + (t.valorPago || 0), 0);
  const totalAtrasadoOrig = atrasados.reduce((s, t) => s + t.valor, 0);
  const totalAtrasadoJuros = atrasados.reduce((s, t) => s + t.valorJuros, 0);
  const totalAtrasadoCorrigido = atrasados.reduce((s, t) => s + t.valorCorrigido, 0);
  const totalNoPrazo = noPrazo.reduce((s, t) => s + t.valor, 0);

  const ownerName = (id: string) => config.proprietarios.find(p => p.id === id)?.nome || '—';

  const limparFiltros = () => {
    setFProprietario(TODOS);
    setFTipo(TODOS);
    setFMes(TODOS);
    setFCliente(TODOS);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(16);
    doc.text('Relatório Financeiro', 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${dataHoje}`, 14, 24);

    // Filtros aplicados
    const filtrosTxt: string[] = [];
    if (fProprietario !== TODOS) filtrosTxt.push(`Proprietário: ${ownerName(fProprietario)}`);
    if (!clienteAtivo && fTipo !== TODOS) filtrosTxt.push(`Tipo: ${fTipo}`);
    if (!clienteAtivo && fMes !== TODOS) filtrosTxt.push(`Mês: ${formatMonthLabel(fMes)}`);
    if (clienteAtivo) filtrosTxt.push(`Cliente: ${fCliente}`);
    if (filtrosTxt.length === 0) filtrosTxt.push('Sem filtros');
    doc.text(`Filtros: ${filtrosTxt.join(' | ')}`, 14, 30);

    let cursorY = 38;

    // Recebidos
    doc.setFontSize(12);
    doc.text(`Títulos Recebidos (${recebidos.length}) — Total: ${formatCurrency(totalRecebido)}`, 14, cursorY);
    cursorY += 4;
    autoTable(doc, {
      startY: cursorY,
      head: [['Nº', 'Cliente', 'Tipo', 'Proprietário', 'Pagto', 'Recebido por', 'Valor']],
      body: recebidos.map(t => [
        String(t.numero),
        t.cliente,
        t.tipo,
        ownerName(t.proprietario),
        t.dataPagamento ? formatDate(t.dataPagamento) : '-',
        t.recebidoPor || '—',
        formatCurrency(t.valorPago || 0),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
      margin: { left: 14, right: 14 },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 10;
    if (cursorY > 250) { doc.addPage(); cursorY = 20; }

    // Atrasados
    doc.setFontSize(12);
    doc.text(`Títulos Atrasados (${atrasados.length})`, 14, cursorY);
    cursorY += 5;
    doc.setFontSize(9);
    doc.text(`Original: ${formatCurrency(totalAtrasadoOrig)}  |  Juros: ${formatCurrency(totalAtrasadoJuros)}  |  Total: ${formatCurrency(totalAtrasadoCorrigido)}`, 14, cursorY);
    cursorY += 3;
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['Nº', 'Cliente', 'Tipo', 'Proprietário', 'Vencimento', 'Dias', 'Valor', 'Juros', 'Total']],
      body: atrasados.map(t => [
        String(t.numero),
        t.cliente,
        t.tipo,
        ownerName(t.proprietario),
        formatDate(t.vencimento),
        `${Math.abs(t.diasAVencer)}d`,
        formatCurrency(t.valor),
        formatCurrency(t.valorJuros),
        formatCurrency(t.valorCorrigido),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relatórios</h2>
        <Button size="sm" onClick={exportarPDF} className="gap-1">
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Filtros</CardTitle>
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Proprietário</Label>
            <Select value={fProprietario} onValueChange={setFProprietario}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {config.proprietarios.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: p.cor }} />
                      {p.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={fTipo} onValueChange={setFTipo} disabled={clienteAtivo}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {tipos.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Mês</Label>
            <Select value={fMes} onValueChange={setFMes} disabled={clienteAtivo}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {monthKeys.map(mk => (
                  <SelectItem key={mk} value={mk}>{formatMonthLabel(mk)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={fCliente} onValueChange={setFCliente}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {clientes.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clienteAtivo && (
            <p className="col-span-2 text-[11px] text-muted-foreground">
              Filtro por cliente ativo: ignorando Tipo e Mês.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✅ Títulos Recebidos ({recebidos.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Total recebido: <strong className="text-paid">{formatCurrency(totalRecebido)}</strong></p>
        </CardHeader>
        <CardContent className="space-y-2">
          {recebidos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum título recebido</p>
          ) : (
            recebidos.map(t => (
              <div key={t.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold truncate">{t.cliente}</p>
                  <p className="text-paid font-semibold whitespace-nowrap">{formatCurrency(t.valorPago || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <p>📅 {t.dataPagamento ? formatDate(t.dataPagamento) : '-'}</p>
                  <p>👤 {t.recebidoPor || '—'}</p>
                  <p className="col-span-2">{ownerName(t.proprietario)} • {t.tipo} • Nº {t.numero}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚠️ Títulos Atrasados ({atrasados.length})</CardTitle>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Valor original: <strong>{formatCurrency(totalAtrasadoOrig)}</strong></p>
            <p>Juros acumulados: <strong className="text-overdue">{formatCurrency(totalAtrasadoJuros)}</strong></p>
            <p>Total com juros: <strong className="text-overdue">{formatCurrency(totalAtrasadoCorrigido)}</strong></p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {atrasados.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum título atrasado 🎉</p>
          ) : (
            atrasados.map(t => (
              <div key={t.id} className="border border-overdue/30 rounded-md p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold truncate">{t.cliente}</p>
                  <span className="text-xs bg-overdue/10 text-overdue px-2 py-0.5 rounded-full whitespace-nowrap">
                    {Math.abs(t.diasAVencer)}d atraso
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-2">
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatCurrency(t.valor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Juros</p>
                    <p className="font-medium text-overdue">{formatCurrency(t.valorJuros)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Total com juros</p>
                    <p className="font-semibold text-overdue">{formatCurrency(t.valorCorrigido)}</p>
                  </div>
                  <p className="col-span-2 text-muted-foreground">
                    {ownerName(t.proprietario)} • {t.tipo} • Venc: {formatDate(t.vencimento)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
