import { TituloComCalculo, ChavePix, ProprietarioConfig, Cliente, AppConfig } from '@/types/titulo';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate, formatPhone, buildCobrancaMsg } from '@/lib/calculos';
import { enviarWhatsAppUnico } from '@/lib/whatsapp/whatsappService';
import { MessageCircle, Trash2, CreditCard, Pencil, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { getContrastColor, darkenColor } from '@/lib/colors';
import { openExternalUrl } from '@/lib/openUrl';
import { gerarCadernoPDF } from '@/lib/caderno';
import { gerarPromissoriaPDF, calcularNotas, PromissoriaData } from '@/lib/promissoria';
import { savePdf } from '@/lib/savePdf';
import { toast } from 'sonner';
import { getPrinters, printPdf } from 'tauri-plugin-printer-v2';
import { obterNomeCliente } from '@/lib/whatsapp/message';
import { BotaoImprimirDireto } from '@/components/impressao/BotaoImprimirDireto';
import { Checkbox } from '@/components/ui/checkbox';

interface TituloCardProps {
  titulo: TituloComCalculo;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onEdit: (id: string) => void;
  chavesPix: ChavePix[];
  proprietarios: ProprietarioConfig[];
  clientes?: Cliente[];
  config?: AppConfig;
  /** Seleção múltipla (opcional) */
  selecionavel?: boolean;
  selecionado?: boolean;
  onToggleSelecionado?: (id: string) => void;
}

export function TituloCard({ titulo, onDelete, onPagar, onEdit, chavesPix, proprietarios, clientes, config, selecionavel, selecionado, onToggleSelecionado }: TituloCardProps) {
  const [selectedPixId, setSelectedPixId] = useState<string>('');
  const selectedPix = chavesPix.find(p => p.id === selectedPixId);
  const clienteRef = clientes?.find(c => c.id === titulo.clienteId);
  const nomeWhats = obterNomeCliente(clienteRef || { nome: titulo.cliente });

  const propConfig = proprietarios.find(p => p.id === titulo.proprietario);
  const bgColor = propConfig?.cor || '#e5e7eb';
  const fgColor = getContrastColor(bgColor);
  const borderColor = darkenColor(bgColor, 40);

  const isCaderno = titulo.tipo?.toLowerCase().startsWith('caderno');

  const handleReimprimir = async () => {
    if (!clienteRef && !titulo.cliente) {
      toast.error('Dados do cliente não encontrados para reimprimir.');
      return;
    }

    toast.info('Gerando impressão...');

    try {
      const caminho = config?.caminhoSalvarDados;

      if (isCaderno) {
        const cadernoData = {
          clienteNome: titulo.cliente,
          dataEmissao: titulo.dataEmissao,
          valorTotal: titulo.valor,
          parcelas: [
            {
              numeroParcela: 1,
              dataVencimento: titulo.vencimento,
              valorParcela: titulo.valor,
            },
          ],
        };
        const pdf = gerarCadernoPDF(cadernoData);
        const nomeArquivo = `caderno-${titulo.cliente.replace(/\s+/g, '-')}.pdf`;
        await savePdf(pdf, nomeArquivo, caminho);
        if (caminho) {
          const sep = caminho.includes('\\') ? '\\' : '/';
          const fullPath = caminho.replace(/[\\/]$/, '') + sep + nomeArquivo;
          await _printSavedPdf(fullPath);
        }
      } else {
        // Promissória reprint
        const devedor: Cliente = clienteRef || {
          id: titulo.clienteId || '',
          nome: titulo.cliente,
          telefone: titulo.telefone || '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
        };
        const credor = config?.credor || { nome: '', cpfCnpj: '' };
        const promissoriaData: PromissoriaData = {
          quantidade: 1,
          cidadeEstado: credor.cidadeEstado || '',
          primeiroVencimento: titulo.vencimento,
          valorTotal: titulo.valor,
          credor,
          devedor,
        };
        const notas = calcularNotas(promissoriaData);
        const pdf = gerarPromissoriaPDF(promissoriaData, notas);
        const nomeArquivo = `titulo-${titulo.cliente.replace(/\s+/g, '-')}.pdf`;
        await savePdf(pdf, nomeArquivo, caminho);
        if (caminho) {
          const sep = caminho.includes('\\') ? '\\' : '/';
          const fullPath = caminho.replace(/[\\/]$/, '') + sep + nomeArquivo;
          await _printSavedPdf(fullPath);
        }
      }
    } catch {
      toast.error('Erro ao gerar PDF para reimpressão.');
    }
  };

  const _printSavedPdf = async (fullPath: string) => {
    // Normalize to Windows backslash path (required by the plugin and PowerShell)
    const winPath = fullPath.replace(/\//g, '\\');

    // 1st attempt: Rust command via PowerShell Start-Process -Verb Print (most reliable on Windows)
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('print_pdf_file', { path: winPath });
      toast.success('Enviado para impressora.');
      return;
    } catch (e) {
      console.warn('[print] print_pdf_file falhou, tentando plugin...', e);
    }

    // 2nd attempt: tauri-plugin-printer-v2 printPdf
    try {
      const printersJson = await getPrinters();
      const printersList: Array<{ name: string; is_default?: boolean }> = JSON.parse(printersJson);
      const defaultPrinter = printersList.find(p => p.is_default)?.name || printersList[0]?.name;
      if (defaultPrinter) {
        await printPdf({
          id: `print-${Date.now()}`,
          path: winPath,
          printer: defaultPrinter,
          print_settings: '',
          remove_after_print: false,
        });
        toast.success('Enviado para impressora.');
        return;
      }
    } catch (e) {
      console.warn('[print] printPdf plugin falhou, abrindo arquivo...', e);
    }

    // 3rd fallback: open file (user prints manually)
    await openExternalUrl(winPath);
  };

  return (
    <Card className="overflow-hidden border-2" style={{ backgroundColor: bgColor, color: fgColor, borderColor }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {selecionavel && (
              <Checkbox
                className="mt-1 bg-card"
                checked={!!selecionado}
                onCheckedChange={() => onToggleSelecionado?.(titulo.id)}
                aria-label="Selecionar título"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{titulo.cliente}</p>
              <p className="text-xs opacity-70">
                {titulo.tipo} • Nº {titulo.numero} • {propConfig?.nome || '—'}
              </p>
            </div>
          </div>
          <StatusBadge situacao={titulo.situacao} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div>
            <p className="opacity-70 text-xs">Emissão</p>
            <p className="font-medium">{formatDate(titulo.dataEmissao)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Vencimento</p>
            <p className="text-xl font-bold" style={{ color: '#3b82f6' }}>{formatDate(titulo.vencimento)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Valor</p>
            <p className="font-medium">{formatCurrency(titulo.valor)}</p>
          </div>
          {titulo.situacao === 'VENCIDO' && (
            <>
              <div>
                <p className="opacity-70 text-xs">Juros ({Math.abs(titulo.diasAVencer)}d)</p>
                <p className="font-medium">{formatCurrency(titulo.valorJuros)}</p>
              </div>
              <div>
                <p className="opacity-70 text-xs">Multa</p>
                <p className="font-medium">{formatCurrency(titulo.valorMulta)}</p>
              </div>
              <div className="col-span-2">
                <p className="opacity-70 text-xs">Valor Corrigido</p>
                <p className="font-semibold">{formatCurrency(titulo.valorCorrigido)}</p>
              </div>
            </>
          )}
          {titulo.situacao === 'PAGO' && titulo.dataPagamento && (
            <div>
              <p className="opacity-70 text-xs">Pago em</p>
              <p className="font-medium">{formatDate(titulo.dataPagamento)}</p>
            </div>
          )}
          {titulo.situacao === 'PAGO' && titulo.valorPago && (
            <div>
              <p className="opacity-70 text-xs">Valor Pago</p>
              <p className="font-medium">{formatCurrency(titulo.valorPago)}</p>
            </div>
          )}
          {titulo.situacao === 'PAGO' && titulo.recebidoPor && (
            <div className="col-span-2">
              <p className="opacity-70 text-xs">Recebido por</p>
              <p className="font-medium">{titulo.recebidoPor}</p>
            </div>
          )}
        </div>

        {titulo.telefone && (
          <p className="text-xs opacity-70 mt-2">📱 {formatPhone(titulo.telefone)}</p>
        )}

        {titulo.situacao === 'VENCIDO' && titulo.telefone && chavesPix.length > 0 && (
          <div className="mt-2">
            <Select value={selectedPixId} onValueChange={setSelectedPixId}>
              <SelectTrigger className="h-8 text-xs bg-card text-foreground dark:text-white">
                <SelectValue placeholder="Selecionar Chave PIX (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem PIX</SelectItem>
                {chavesPix.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}: {p.chave}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {titulo.telefone && titulo.situacao === 'VENCIDO' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive"
              onClick={() => enviarWhatsAppUnico(titulo.telefone, buildCobrancaMsg(
                nomeWhats,
                titulo.valorCorrigido,
                titulo.vencimento,
                selectedPix && selectedPixId !== 'none' ? selectedPix : undefined
              ))}
            >
              <MessageCircle className="h-4 w-4" />
              Cobrar
            </Button>
          )}
          {titulo.situacao !== 'PAGO' && (
            <Button variant="outline" size="sm" className="flex-1 bg-card text-foreground" onClick={() => onPagar(titulo.id)}>
              <CreditCard className="h-4 w-4" />
              Receber
            </Button>
          )}
          <Button variant="ghost" size="sm" className="bg-card/60 text-foreground hover:bg-card" onClick={handleReimprimir} title="Reimprimir">
            <Printer className="h-4 w-4" />
            <span className="ml-1 text-xs">Reimprimir</span>
          </Button>
          <BotaoImprimirDireto
            variant="ghost"
            size="sm"
            className="bg-card/60 text-foreground hover:bg-card"
            titulo={`${titulo.tipo} Nº ${titulo.numero}`}
            tipo={isCaderno ? 'RECIBO' : 'PROMISSORIA'}
            dados={{
              cliente: titulo.cliente,
              cpfCnpj: clienteRef?.cpfCnpj,
              endereco: clienteRef
                ? [clienteRef.logradouro, clienteRef.numero, clienteRef.bairro, clienteRef.cidade && clienteRef.estado ? `${clienteRef.cidade}/${clienteRef.estado}` : '', clienteRef.cep ? `CEP ${clienteRef.cep}` : ''].filter(Boolean).join(', ')
                : undefined,
              telefone: titulo.telefone,
              credor: config?.credor,
              valor: titulo.valor,
              vencimento: titulo.vencimento,
              dataEmissao: titulo.dataEmissao,
            }}
          />
          <Button variant="ghost" size="sm" className="bg-card/60 text-foreground hover:bg-card" onClick={() => onEdit(titulo.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="bg-card/60 text-destructive hover:bg-card hover:text-destructive" onClick={() => onDelete(titulo.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
