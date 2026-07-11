/**
 * ReimprimirTitulosDialog — mostra os títulos do cliente selecionado com
 * checkboxes e permite reimprimir (via PrintService) os selecionados.
 */
import { useMemo, useState } from 'react';
import { Cliente, Titulo, AppConfig } from '@/types/titulo';
import { formatCurrency, formatDate } from '@/lib/calculos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Square, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { printService } from '@/lib/printing/printService';

interface Props {
  cliente: Cliente | null;
  titulos: Titulo[];
  config: AppConfig;
  onClose: () => void;
}

export function ReimprimirTitulosDialog({ cliente, titulos, config, onClose }: Props) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [imprimindo, setImprimindo] = useState(false);

  const titulosDoCliente = useMemo(() => {
    if (!cliente) return [];
    return [...titulos]
      .filter(t => t.clienteId === cliente.id)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  }, [cliente, titulos]);

  const titulosSelecionados = useMemo(
    () => titulosDoCliente.filter(t => selecionados.has(t.id)),
    [titulosDoCliente, selecionados]
  );

  const totalSelecionado = useMemo(
    () => titulosSelecionados.reduce((s, t) => s + t.valor, 0),
    [titulosSelecionados]
  );

  const todosSelecionados = titulosDoCliente.length > 0 && selecionados.size === titulosDoCliente.length;

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => setSelecionados(new Set(titulosDoCliente.map(t => t.id)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const handleClose = () => {
    setSelecionados(new Set());
    onClose();
  };

  const handleReimprimir = async () => {
    if (imprimindo || titulosSelecionados.length === 0) return;
    setImprimindo(true);
    try {
      let sucesso = 0;
      for (const t of titulosSelecionados) {
        const ok = await printService.imprimirDireto({
          tipo: t.tipo?.toLowerCase().startsWith('caderno') ? 'RECIBO' : 'PROMISSORIA',
          titulo: `${t.tipo} Nº ${t.numero}`,
          cliente: cliente?.nome || t.cliente,
          cpfCnpj: cliente?.cpfCnpj,
          endereco: cliente
            ? [cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : '', cliente.cep ? `CEP ${cliente.cep}` : ''].filter(Boolean).join(', ')
            : undefined,
          telefone: t.telefone,
          credor: config.credor,
          valor: t.valor,
          vencimento: t.vencimento,
          dataEmissao: t.dataEmissao,
        });
        if (ok) sucesso++;
      }
      toast.success(`${sucesso}/${titulosSelecionados.length} título(s) enviado(s) para impressora.`);
      handleClose();
    } catch (err) {
      console.error('[ReimprimirTitulosDialog] erro', err);
      toast.error('Erro ao reimprimir títulos selecionados.');
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Reimprimir Títulos — {cliente?.nome}
          </DialogTitle>
        </DialogHeader>

        {titulosDoCliente.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum título cadastrado para este cliente.
          </p>
        ) : (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={todosSelecionados ? desmarcarTodos : selecionarTodos}
            >
              {todosSelecionados ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
              {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {titulosDoCliente.map(t => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-xs border border-border rounded px-2.5 py-1.5 cursor-pointer hover:bg-accent/30"
                >
                  <Checkbox
                    checked={selecionados.has(t.id)}
                    onCheckedChange={() => toggleSelecionado(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.tipo} • Nº {t.numero}</span>
                      <span className="text-muted-foreground shrink-0">{t.dataPagamento ? '✅ PAGO' : 'EM ABERTO'}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Venc.: {formatDate(t.vencimento)} • {formatCurrency(t.valor)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selecionados.size > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <span className="text-sm font-semibold">
                  {selecionados.size} título{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  Total: <strong>{formatCurrency(totalSelecionado)}</strong>
                </span>
              </div>
            )}

            <Button
              onClick={handleReimprimir}
              disabled={imprimindo || titulosSelecionados.length === 0}
              className="w-full gap-2"
            >
              {imprimindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {imprimindo ? 'Imprimindo...' : 'Reimprimir'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
