import { useState } from 'react';
import { AppConfig, VendaVista } from '@/types/titulo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculos';
import { toast } from 'sonner';
import { UserPlus, Save, Calendar, FileText, Printer, MessageCircle, X } from 'lucide-react';
import { SessionUser, appendLog } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    };
    onUpdate({ vendas: [...(config.vendas || []), venda] });
    const descontoStr = descN > 0
      ? ` | Desconto: ${descontoTipo === 'porcento' ? `${descN}%` : formatCurrency(descN)} (${formatCurrency(valorN - valorFinal)})`
      : '';
    appendLog(config, onUpdate, user, 'venda.vista',
      `Venda à vista | Cliente: ${nome} | Valor compra: ${formatCurrency(valorN)}${descontoStr} | Valor final: ${formatCurrency(valorFinal)} | Pagamento: ${venda.formaPagamento}${venda.parcelas ? ` ${venda.parcelas}x` : ''}${venda.maquininha ? ` (${venda.maquininha})` : ''} | Por: ${venda.registradoPor}`,
      {
        vendaId: venda.id,
        clienteNome: nome,
        valorCompra: valorN,
        desconto: descN,
        descontoTipo,
        valorFinal,
        formaPagamento: venda.formaPagamento,
        parcelas: venda.parcelas,
        maquininha: venda.maquininha,
      });
    toast.success('Venda registrada');
    setValor(''); setDesconto(''); setParcelas('1');
  };

  const gerarPDF = () => {
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

    doc.save(`vendas-do-dia-${today}.pdf`);
    toast.success('PDF gerado!');
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nova Venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="p-2 bg-secondary rounded text-sm flex justify-between">
            <span>Valor Final:</span>
            <strong>{formatCurrency(valorFinal)}</strong>
          </div>
          <Button onClick={salvar} className="w-full">
            <Save className="h-4 w-4 mr-1" /> Registrar Venda
          </Button>
        </CardContent>
      </Card>

      {/* Botão Vendas do Dia */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowVendasDia(v => !v)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Vendas do Dia ({vendasDia.length})
      </Button>

      {showVendasDia && (
        <Card>
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
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {vendasDia.map((v, i) => (
                    <div key={v.id} className="border rounded p-2 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{i + 1}. {v.clienteNome}</span>
                        <strong className="text-green-600">{formatCurrency(v.valor)}</strong>
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
                    </div>
                  ))}
                </div>

                {/* Totalizador */}
                <div className="border-t pt-2 flex justify-between items-center font-semibold text-sm bg-secondary/50 rounded px-2 py-1">
                  <span>Total do Dia ({vendasDia.length} vendas):</span>
                  <span className="text-green-600">{formatCurrency(totalDia)}</span>
                </div>

                {/* Botões de ação */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={gerarPDF} className="text-xs">
                    <FileText className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={imprimir} className="text-xs">
                    <Printer className="h-3 w-3 mr-1" /> Imprimir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWhatsConfirm(true)} className="text-xs text-green-600 border-green-300">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                </div>

                {/* Confirmação WhatsApp */}
                {whatsConfirm && (
                  <div className="border rounded p-3 bg-green-50 dark:bg-green-950/20 space-y-2">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimas Vendas ({(config.vendas || []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-72 overflow-y-auto">
          {(config.vendas || []).slice().reverse().slice(0, 30).map(v => (
            <div key={v.id} className="border rounded p-2 text-xs">
              <div className="flex justify-between">
                <span>{v.clienteNome}</span>
                <strong>{formatCurrency(v.valor)}</strong>
              </div>
              <p className="text-muted-foreground">
                {v.data} • {v.formaPagamento}{v.parcelas ? ` ${v.parcelas}x` : ''}{v.maquininha ? ` • ${v.maquininha}` : ''}
                {v.hora ? ` • ${v.hora}` : ''}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
