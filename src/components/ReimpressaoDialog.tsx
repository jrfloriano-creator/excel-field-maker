/**
 * ReimpressaoDialog — mostra os últimos 5 clientes com títulos impressos,
 * permite selecionar um lote e reimprimir via PDF.
 */
import { useMemo, useState } from 'react';
import { AppConfig, Titulo, Cliente } from '@/types/titulo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Printer, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { gerarPromissoriaPDF, calcularNotas, PromissoriaData } from '@/lib/promissoria';
import { gerarCadernoPDF } from '@/lib/caderno';
import { savePdf } from '@/lib/savePdf';
import { formatDate, formatCurrency } from '@/lib/calculos';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
  /** 'promissoria' | 'caderno' — filtra qual tipo de título mostrar */
  tipo: 'promissoria' | 'caderno';
}

interface ClienteResumo {
  clienteId: string;
  clienteNome: string;
  dataInsercao: string;  // dataEmissao mais recente
  quantidade: number;
  titulos: Titulo[];
}

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

async function printSavedPdf(fullPath: string) {
  const winPath = fullPath.replace(/\//g, '\\');
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('print_pdf_file', { path: winPath });
      toast.success('Enviado para impressora.');
      return;
    } catch (e) {
      console.warn('[ReimpressaoDialog] print_pdf_file falhou, abrindo arquivo...', e);
    }
  }
  // fallback: open file
  if (isTauriEnv()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_external_url', { url: winPath }).catch(() => {});
  }
}

export function ReimpressaoDialog({ titulos, config, tipo }: Props) {
  const [open, setOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteResumo | null>(null);
  const [imprimindo, setImprimindo] = useState(false);

  const prefixo = tipo === 'promissoria' ? 'promissória' : 'caderno';

  // Filtra títulos pelo tipo
  const titulosFiltrados = useMemo(() => {
    return titulos.filter(t => t.tipo?.toLowerCase().startsWith(tipo === 'promissoria' ? 'promiss' : 'caderno'));
  }, [titulos, tipo]);

  // Agrupa por clienteId, ordena por dataEmissao mais recente, pega 5 únicos
  const ultimosClientes = useMemo((): ClienteResumo[] => {
    const map = new Map<string, ClienteResumo>();
    for (const t of titulosFiltrados) {
      const key = t.clienteId || t.cliente;
      if (!map.has(key)) {
        map.set(key, {
          clienteId: key,
          clienteNome: t.cliente,
          dataInsercao: t.dataEmissao,
          quantidade: 1,
          titulos: [t],
        });
      } else {
        const entry = map.get(key)!;
        entry.quantidade++;
        entry.titulos.push(t);
        if (t.dataEmissao > entry.dataInsercao) entry.dataInsercao = t.dataEmissao;
      }
    }
    return [...map.values()]
      .sort((a, b) => b.dataInsercao.localeCompare(a.dataInsercao))
      .slice(0, 5);
  }, [titulosFiltrados]);

  // Para o cliente selecionado, pega o lote mais recente:
  // mesmo cliente + mesma dataEmissao = mesmo lote
  const loteAtual = useMemo((): Titulo[] => {
    if (!clienteSelecionado) return [];
    const dataMax = clienteSelecionado.titulos.reduce(
      (mx, t) => t.dataEmissao > mx ? t.dataEmissao : mx,
      ''
    );
    return clienteSelecionado.titulos
      .filter(t => t.dataEmissao === dataMax)
      .sort((a, b) => a.numero - b.numero);
  }, [clienteSelecionado]);

  const handleReimprimir = async () => {
    if (!clienteSelecionado || loteAtual.length === 0) return;
    setImprimindo(true);
    try {
      const caminho = config.caminhoSalvarDados;
      const nomeCliente = clienteSelecionado.clienteNome.replace(/\s+/g, '-');

      if (tipo === 'caderno') {
        // Reconstrói CadernoData do lote
        const primeiroTitulo = loteAtual[0];
        const cadernoData = {
          clienteNome: clienteSelecionado.clienteNome,
          dataEmissao: primeiroTitulo.dataEmissao,
          valorTotal: loteAtual.reduce((s, t) => s + t.valor, 0),
          parcelas: loteAtual.map((t, i) => ({
            numeroParcela: i + 1,
            dataVencimento: t.vencimento,
            valorParcela: t.valor,
          })),
        };
        const pdf = gerarCadernoPDF(cadernoData);
        const nomeArquivo = `caderno-reimp-${nomeCliente}.pdf`;
        if (caminho) {
          await savePdf(pdf, nomeArquivo, caminho);
          const sep = caminho.includes('\\') ? '\\' : '/';
          const fullPath = caminho.replace(/[\\/]$/, '') + sep + nomeArquivo;
          await printSavedPdf(fullPath);
        } else {
          pdf.save(nomeArquivo);
          toast.success('PDF baixado.');
        }
      } else {
        // Promissória — reconstrói dados do credor/devedor
        const clienteRef: Cliente | undefined = config.clientes.find(
          c => c.id === clienteSelecionado.clienteId
        );
        const primeiroTitulo = loteAtual[0];
        const devedor: Cliente = clienteRef || {
          id: clienteSelecionado.clienteId,
          nome: clienteSelecionado.clienteNome,
          telefone: primeiroTitulo.telefone || '',
          cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '',
        };
        const credor = config.credor || { nome: '', cpfCnpj: '' };
        const promissoriaData: PromissoriaData = {
          quantidade: loteAtual.length,
          cidadeEstado: credor.cidadeEstado || '',
          primeiroVencimento: primeiroTitulo.vencimento,
          valorTotal: loteAtual.reduce((s, t) => s + t.valor, 0),
          credor,
          devedor,
        };
        const notas = calcularNotas(promissoriaData);
        const pdf = gerarPromissoriaPDF(promissoriaData, notas);
        const nomeArquivo = `promissoria-reimp-${nomeCliente}.pdf`;
        if (caminho) {
          await savePdf(pdf, nomeArquivo, caminho);
          const sep = caminho.includes('\\') ? '\\' : '/';
          const fullPath = caminho.replace(/[\\/]$/, '') + sep + nomeArquivo;
          await printSavedPdf(fullPath);
        } else {
          pdf.save(nomeArquivo);
          toast.success('PDF baixado.');
        }
      }
      setOpen(false);
      setClienteSelecionado(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reimprimir.');
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setClienteSelecionado(null); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          title="Reimpressão"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reimpressão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reimpressão
          </DialogTitle>
        </DialogHeader>

        {ultimosClientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum título de {prefixo} encontrado.
          </p>
        ) : !clienteSelecionado ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Últimos 5 clientes com {prefixo}s cadastrados. Selecione para reimprimir o lote mais recente.
            </p>
            {ultimosClientes.map(c => (
              <button
                key={c.clienteId}
                onClick={() => setClienteSelecionado(c)}
                className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-accent transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{c.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">
                    Inserção: {formatDate(c.dataInsercao)} &bull; {c.quantidade} título{c.quantidade !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClienteSelecionado(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                ← Voltar
              </button>
              <span className="text-sm font-semibold">{clienteSelecionado.clienteNome}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lote mais recente ({loteAtual.length} título{loteAtual.length !== 1 ? 's' : ''} — emissão {formatDate(loteAtual[0]?.dataEmissao)}):
            </p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {loteAtual.map(t => (
                <div key={t.id} className="flex justify-between items-center text-xs border border-border rounded px-2.5 py-1.5 bg-muted/20">
                  <span className="font-medium">{t.tipo}</span>
                  <span className="text-muted-foreground">{formatCurrency(t.valor)} • venc. {formatDate(t.vencimento)}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleReimprimir}
              disabled={imprimindo}
              className="w-full gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
            >
              <Printer className="h-4 w-4" />
              {imprimindo ? 'Imprimindo...' : 'Reimprimir'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
