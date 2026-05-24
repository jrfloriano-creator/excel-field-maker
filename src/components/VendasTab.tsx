import { useState } from 'react';
import { AppConfig, VendaVista } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateId } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculos';
import { toast } from 'sonner';
import { UserPlus, Save, Calendar, FileText, Printer, MessageCircle, X } from 'lucide-react';
import { SessionUser } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePdf } from '@/lib/savePdf';

interface Props {
  config: AppConfig;
  onUpdate: (patch: Partial<AppConfig>) => void;
  user: SessionUser | null;
  onNewCliente: () => void;
}

export function VendasTab({ config, onUpdate, user, onNewCliente }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNovo, setClienteNovo] = useState(false);
  const [valor, setValor] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcento'>('valor');
  const [desconto, setDesconto] = useState('');
  const [formaPagId, setFormaPagId] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [maquininhaId, setMaquininhaId] = useState('');
  const [obs, setObs] = useState('');
  const [showVendasDia, setShowVendasDia] = useState(false);
  const [whatsConfirm, setWhatsConfirm] = useState(false);

  const formas = config.formasPagamento || [];
  const maquininhas = config.maquininhas || [];
  const formaSel = formas.find(f => f.id === formaPagId);
  const isCartao = formaSel?.nome.toLowerCase().includes('cart');

  const valorN = parseFloat(valor) || 0;
  const descN = parseFloat(desconto) || 0;
  const valorFinal = descontoTipo === 'valor'
    ? Math.max(0, valorN - descN)
    : Math.max(0, valorN * (1 - descN / 100));

  // Vendas do dia atual
  const vendasDia = (config.vendas || []).filter(v => v.data === today);
  const totalDia = vendasDia.reduce((acc, v) => acc + v.valor, 0);

  const salvar = () => {
    if (!formaSel) { toast.error('Selecione a forma de pagamento'); return; }
    if (valorN <= 0) { toast.error('Informe o valor'); return; }
    let nome = '';
    let cId: string | undefined;
    if (clienteNovo) {
      nome = 'CLIENTE NOVO';
    } else {
      const c = config.clientes.find(c => c.id === clienteId);
      if (!c) { toast.error('Selecione o cliente'); return; }
      nome = c.nome;
      cId = c.id;
    }
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const venda: VendaVista = {
      id: generateId(),
      data: today,
      hora,
      clienteId: cId,
      clienteNome: nome,
      valor: valorFinal,
      desconto: descN,
      descontoTipo,
      formaPagamento: formaSel.nome,
      parcelas: isCartao ? parseInt(parcelas) || 1 : undefined,
      maquininha: isCartao ? maquininhas.find(m => m.id === maquininhaId)?.nome : undefined,
      registradoPor: user?.nome || '—',
      obs: obs.trim() || undefined,
    };
    const descontoStr = descN > 0
      ? ` | Desconto: ${descontoTipo === 'porcento' ? `${descN}%` : formatCurrency(descN)} (${formatCurrency(valorN - valorFinal)})`
      : '';
    const descricaoLog = `Venda à vista | Cliente: ${nome} | Valor compra: ${formatCurrency(valorN)}${descontoStr} | Valor final: ${formatCurrency(valorFinal)} | Pagamento: ${venda.formaPagamento}${venda.parcelas ? ` ${venda.parcelas}x` : ''}${venda.maquininha ? ` (${venda.maquininha})` : ''} | Por: ${venda.registradoPor}`;
    const metaLog = {
      vendaId: venda.id,
      clienteNome: nome,
      valorCompra: valorN,
      desconto: descN,
      descontoTipo,
      valorFinal,
      formaPagamento: venda.formaPagamento,
      parcelas: venda.parcelas,
      maquininha: venda.maquininha,
    };

    // FEAT 5 FIX: combina vendas + log em uma única chamada para evitar closure stale
    const novasVendas = [...(config.vendas || []), venda];
    const novoLog = {
      id: generateId(),
      data: new Date().toISOString(),
      usuario: user?.nome || 'desconhecido',
      tipo: 'venda.vista' as const,
      descricao: descricaoLog,
      metadata: metaLog,
    };
    const novosLogs = [...(config.logs || []), novoLog].slice(-5000);
    onUpdate({ vendas: novasVendas, logs: novosLogs });

    toast.success('Venda registrada');
    setValor(''); setDesconto(''); setParcelas('1'); setObs('');
  };

  const gerarPDF = async () => {
    const doc = new jsPDF();
    const dataFormatada = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR');
    doc.setFontSize(16);
    doc.text('Vendas do Dia', 14, 16);
    doc.setFontSize(10);
    doc.text(`Data: ${dataFormatada}`, 14, 24);

    const rows = vendasDia.map((v, i) => [
      String(i + 1),
      v.clienteNome,
      formatCurrency(v.valor),
      v.desconto > 0
        ? (v.descontoTipo === 'valor' ? formatCurrency(v.desconto) : `${v.desconto}%`)
        : '—',
      v.formaPagamento + (v.parcelas ? ` ${v.parcelas}x` : '') + (v.maquininha ? ` • ${v.maquininha}` : ''),
      v.hora || '—',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['#', 'Cliente', 'Valor', 'Desconto', 'Pagamento', 'Horário']],
      body: rows,
      foot: [['', 'TOTAL', formatCurrency(totalDia), '', '', '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230] },
    });

    await savePdf(doc, `vendas-do-dia-${today}.pdf`, config.caminhoSalvarDados);
  };

  const imprimir = () => {
    const dataFormatada = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR');
    const linhas = vendasDia.map((v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${v.clienteNome}</td>
        <td>${formatCurrency(v.valor)}</td>
        <td>${v.desconto > 0 ? (v.descontoTipo === 'valor' ? formatCurrency(v.desconto) : `${v.desconto}%`) : '—'}</td>
        <td>${v.formaPagamento}${v.parcelas ? ` ${v.parcelas}x` : ''}${v.maquininha ? ` • ${v.maquininha}` : ''}</td>
        <td>${v.hora || '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vendas do Dia</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px}th{background:#1a73e8;color:#fff}tfoot td{font-weight:bold;background:#eee}@media print{button{display:none}}</style>
      </head><body>
      <h2>Vendas do Dia — ${dataFormatada}</h2>
      <table><thead><tr><th>#</th><th>Cliente</th><th>Valor</th><th>Desconto</th><th>Pagamento</th><th>Horário</th></tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr><td colspan="2">TOTAL</td><td>${formatCurrency(totalDia)}</td><td colspan="3"></td></tr></tfoot>
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // FEAT 6: gerar PDF do comprovante individual de uma venda
  const gerarComprovanteVendaPDF = async (venda: VendaVista) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const dataFormatada = new Date(venda.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const empresa = (config as any).nomeEmpresa || 'Controle Financeiro ZOOM';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(empresa, 105, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPROVANTE DE VENDA', 105, 22, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(14, 26, 196, 26);

    doc.setFontSize(10);
    let y = 34;
    const row = (label: string, val: string) => {
      doc.setFont('helvetica', 'bold'); doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal'); doc.text(val, 60, y);
      y += 8;
    };
    row('Data:', `${dataFormatada}${venda.hora ? ' — ' + venda.hora : ''}`);
    row('Cliente:', venda.clienteNome);
    row('Valor da compra:', formatCurrency(venda.valor + (venda.descontoTipo === 'valor' ? venda.desconto : venda.valor * venda.desconto / (100 - venda.desconto))));
    if (venda.desconto > 0) {
      row('Desconto:', venda.descontoTipo === 'valor' ? formatCurrency(venda.desconto) : `${venda.desconto}%`);
    }
    row('Valor pago:', formatCurrency(venda.valor));
    row('Pagamento:', `${venda.formaPagamento}${venda.parcelas ? ` — ${venda.parcelas}x` : ''}${venda.maquininha ? ` (${venda.maquininha})` : ''}`);
    row('Registrado por:', venda.registradoPor);

    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Obrigado pela preferência!', 105, y, { align: 'center' });

    const filename = `comprovante-venda-${venda.id.slice(0, 8)}.pdf`;
    await savePdf(doc, filename, config.caminhoSalvarDados);
  };

  // FEAT 6: imprimir comprovante individual de uma venda
  const imprimirComprovanteVenda = (venda: VendaVista) => {
    const dataFormatada = new Date(venda.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const descontoLinha = venda.desconto > 0
      ? `<tr><td>Desconto</td><td>${venda.descontoTipo === 'valor' ? formatCurrency(venda.desconto) : `${venda.desconto}%`}</td></tr>`
      : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante</title>
      <style>body{font-family:sans-serif;font-size:13px;max-width:400px;margin:0 auto;padding:16px}
      h2,h3{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:5px 8px;border-bottom:1px solid #eee}td:first-child{font-weight:bold;width:45%}
      .total{font-size:16px;font-weight:bold;color:#1a73e8}.footer{text-align:center;margin-top:16px;font-style:italic;font-size:12px}
      @media print{button{display:none}}</style></head>
      <body>
      <h2>Comprovante de Venda</h2>
      <h3 style="font-weight:normal;color:#555">${dataFormatada}${venda.hora ? ' — ' + venda.hora : ''}</h3>
      <table>
        <tr><td>Cliente</td><td>${venda.clienteNome}</td></tr>
        ${descontoLinha}
        <tr><td class="total">Valor pago</td><td class="total">${formatCurrency(venda.valor)}</td></tr>
        <tr><td>Pagamento</td><td>${venda.formaPagamento}${venda.parcelas ? ` ${venda.parcelas}x` : ''}${venda.maquininha ? ` (${venda.maquininha})` : ''}</td></tr>
        <tr><td>Registrado por</td><td>${venda.registradoPor}</td></tr>
      </table>
      <div class="footer">Obrigado pela preferência!</div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const enviarWhatsApp = () => {
    const ativos = (config.telefonesAlerta || []).filter(t => t.ativo && t.numero);
    if (ativos.length === 0) {
      toast.error('Nenhum telefone de alerta ativo em Configurações > Alertas');
      return;
    }
    const dataFormatada = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR');
    const linhas = vendasDia.map((v, i) =>
      `${i + 1}. ${v.clienteNome} - ${formatCurrency(v.valor)} - ${v.formaPagamento}${v.parcelas ? ` ${v.parcelas}x` : ''} - ${v.hora || '—'}`
    ).join('\n');
    const msg = `📊 *Vendas do Dia — ${dataFormatada}*\n\n${linhas}\n\n*Total: ${formatCurrency(totalDia)}*`;
    ativos.forEach(tel => {
      window.open(`https://wa.me/55${tel.numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    });
    toast.success('WhatsApp aberto!');
    setWhatsConfirm(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🛒 Vendas à Vista</h2>
      <Card className="shadow-md border border-border/60">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-t-lg">
          <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">+ Nova Venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cnovo" checked={clienteNovo} onChange={e => setClienteNovo(e.target.checked)} />
            <Label htmlFor="cnovo" className="text-xs cursor-pointer">Cliente Novo (não cadastrar)</Label>
          </div>
          {!clienteNovo && (
            <div>
              <Label className="text-xs">Cliente</Label>
              <div className="flex gap-2">
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {config.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={onNewCliente} title="Cadastrar novo">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Valor da Compra (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Desconto</Label>
              <Input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={descontoTipo} onValueChange={(v) => setDescontoTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">R$</SelectItem>
                  <SelectItem value="porcento">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
            <Select value={formaPagId} onValueChange={setFormaPagId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isCartao && (
            <>
              <div>
                <Label className="text-xs">Parcelas</Label>
                <Input type="number" min={1} value={parcelas} onChange={e => setParcelas(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Maquininha</Label>
                <Select value={maquininhaId} onValueChange={setMaquininhaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Observações opcionais sobre a venda..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 flex justify-between items-center">
            <span className="text-sm font-medium">Valor Final:</span>
            <strong className="text-lg text-blue-600 dark:text-blue-400">{formatCurrency(valorFinal)}</strong>
          </div>
          <Button onClick={salvar} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
            <Save className="h-4 w-4 mr-2" /> Registrar Venda
          </Button>
        </CardContent>
      </Card>

      {/* Botão Vendas do Dia */}
      <Button
        variant="outline"
        className="w-full border-2 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-semibold"
        onClick={() => setShowVendasDia(v => !v)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Vendas do Dia ({vendasDia.length}) — Total: {formatCurrency(totalDia)}
      </Button>

      {showVendasDia && (
        <Card className="shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">📅 Vendas do Dia — {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowVendasDia(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendasDia.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma venda registrada hoje.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {vendasDia.map((v, i) => (
                    <div key={v.id} className="border rounded-lg p-3 text-xs shadow-sm bg-card">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{i + 1}. {v.clienteNome}</span>
                        <strong className="text-green-600 text-sm">{formatCurrency(v.valor)}</strong>
                      </div>
                      {v.desconto > 0 && (
                        <p className="text-muted-foreground">
                          Desconto: {v.descontoTipo === 'valor' ? formatCurrency(v.desconto) : `${v.desconto}%`}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {v.formaPagamento}{v.parcelas ? ` ${v.parcelas}x` : ''}{v.maquininha ? ` • ${v.maquininha}` : ''}
                        {v.hora ? ` • ${v.hora}` : ''}
                      </p>
                      {v.obs && <p className="text-muted-foreground italic mt-1">Obs: {v.obs}</p>}
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 flex-1"
                          onClick={() => gerarComprovanteVendaPDF(v)}>
                          <FileText className="h-3 w-3 mr-1" /> PDF
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 flex-1"
                          onClick={() => imprimirComprovanteVenda(v)}>
                          <Printer className="h-3 w-3 mr-1" /> Imprimir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 flex justify-between items-center font-semibold text-sm bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
                  <span>Total do Dia ({vendasDia.length} vendas):</span>
                  <span className="text-green-600 text-base">{formatCurrency(totalDia)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button size="sm" onClick={gerarPDF}
                    className="text-xs bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-sm">
                    <FileText className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" onClick={imprimir}
                    className="text-xs bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm">
                    <Printer className="h-3 w-3 mr-1" /> Imprimir
                  </Button>
                  <Button size="sm" onClick={() => setWhatsConfirm(true)}
                    className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                </div>

                {whatsConfirm && (
                  <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20 space-y-2">
                    <p className="text-xs font-medium">Enviar resumo das vendas do dia por WhatsApp?</p>
                    <p className="text-[11px] text-muted-foreground">
                      Será enviado para os telefones ativos em Configurações &gt; Alertas.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={enviarWhatsApp}>
                        Confirmar e Enviar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setWhatsConfirm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimas Vendas ({(config.vendas || []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
          {(config.vendas || []).slice().reverse().slice(0, 30).map(v => (
            <div key={v.id} className="border rounded-lg p-2.5 text-xs shadow-sm">
              <div className="flex justify-between">
                <span className="font-medium">{v.clienteNome}</span>
                <strong className="text-green-600">{formatCurrency(v.valor)}</strong>
              </div>
              <p className="text-muted-foreground">
                {v.data} • {v.formaPagamento}{v.parcelas ? ` ${v.parcelas}x` : ''}{v.maquininha ? ` • ${v.maquininha}` : ''}
                {v.hora ? ` • ${v.hora}` : ''}
              </p>
              {v.obs && <p className="text-muted-foreground italic">Obs: {v.obs}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
