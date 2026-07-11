import { useMemo, useState } from 'react';
import { TituloCard } from '@/components/TituloCard';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Printer, CheckSquare, Square, X, MessageCircle } from 'lucide-react';
import { TituloComCalculo, AppConfig } from '@/types/titulo';
import { formatCurrency } from '@/lib/calculos';
import { EnviarWhatsApp } from '@/components/whatsapp/EnviarWhatsApp';
import { EnviarWhatsAppButton } from '@/components/whatsapp/EnviarWhatsAppButton';
import { toast } from 'sonner';

interface TitulosTableProps {
  titulosFiltrados: TituloComCalculo[];
  config: AppConfig;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPagar: (id: string) => void;
  onAddNew: () => void;
}

export function TitulosTable({ titulosFiltrados, config, onEdit, onDelete, onPagar, onAddNew }: TitulosTableProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => setSelecionados(new Set(titulosFiltrados.map(t => t.id)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const titulosSelecionados = useMemo(
    () => titulosFiltrados.filter(t => selecionados.has(t.id)),
    [titulosFiltrados, selecionados]
  );

  const totalSelecionado = useMemo(
    () => titulosSelecionados.reduce((s, t) => s + t.valor, 0),
    [titulosSelecionados]
  );

  const todosSelecionados = titulosFiltrados.length > 0 && selecionados.size === titulosFiltrados.length;

  const handleReceberSelecionado = () => {
    if (titulosSelecionados.length !== 1) {
      toast.info('Selecione apenas 1 título para receber por vez.');
      return;
    }
    onPagar(titulosSelecionados[0].id);
  };

  if (titulosFiltrados.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-2">📋</p>
        <p>Nenhum título encontrado</p>
        <Button className="mt-4" onClick={onAddNew}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={todosSelecionados ? desmarcarTodos : selecionarTodos}
        >
          {todosSelecionados ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
          {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
        </Button>
      </div>

      {selecionados.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between flex-wrap gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              {selecionados.size} título{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-muted-foreground">Total: <strong>{formatCurrency(totalSelecionado)}</strong></span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs bg-card"
              onClick={handleReceberSelecionado}
              disabled={titulosSelecionados.length !== 1 || titulosSelecionados[0]?.situacao === 'PAGO'}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Receber
            </Button>
            <ImprimirSelecionadosButton titulos={titulosSelecionados} config={config} />
            <EnviarWhatsAppButton
              titulos={titulosSelecionados}
              clientes={config.clientes}
              onSuccess={desmarcarTodos}
            />
            <EnviarWhatsApp
              titulosSelecionados={titulosSelecionados}
              clientes={config.clientes}
              empresa={config.nomeEmpresa || config.empresa}
              pix={config.chavesPix?.[0] ? { nome: config.chavesPix[0].nome, chave: config.chavesPix[0].chave } : undefined}
              onSuccess={desmarcarTodos}
              trigger={
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" title="Enviar via link wa.me (sem backend)">
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={desmarcarTodos}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        </div>
      )}

      {titulosFiltrados.map(t => (
        <TituloCard
          key={t.id}
          titulo={t}
          onDelete={onDelete}
          onPagar={onPagar}
          onEdit={onEdit}
          chavesPix={config.chavesPix}
          proprietarios={config.proprietarios}
          clientes={config.clientes}
          config={config}
          selecionavel
          selecionado={selecionados.has(t.id)}
          onToggleSelecionado={toggleSelecionado}
        />
      ))}
    </div>
  );
}

/** Reimprime cada título selecionado, um após o outro. */
function ImprimirSelecionadosButton({ titulos, config }: { titulos: TituloComCalculo[]; config: AppConfig }) {
  const [imprimindo, setImprimindo] = useState(false);

  const handleClick = async () => {
    if (imprimindo || titulos.length === 0) return;
    setImprimindo(true);
    try {
      const { printService } = await import('@/lib/printing/printService');
      let sucesso = 0;
      for (const t of titulos) {
        const clienteRef = config.clientes.find(c => c.id === t.clienteId);
        const ok = await printService.imprimirDireto({
          tipo: t.tipo?.toLowerCase().startsWith('caderno') ? 'RECIBO' : 'PROMISSORIA',
          titulo: `${t.tipo} Nº ${t.numero}`,
          cliente: t.cliente,
          cpfCnpj: clienteRef?.cpfCnpj,
          telefone: t.telefone,
          credor: config.credor,
          valor: t.valor,
          vencimento: t.vencimento,
          dataEmissao: t.dataEmissao,
        });
        if (ok) sucesso++;
      }
      toast.success(`${sucesso}/${titulos.length} título(s) enviado(s) para impressora.`);
    } catch (err) {
      console.error('[ImprimirSelecionadosButton] erro', err);
      toast.error('Erro ao reimprimir títulos selecionados.');
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1 text-xs bg-card"
      onClick={handleClick}
      disabled={imprimindo || titulos.length === 0}
    >
      <Printer className="h-3.5 w-3.5" />
      {imprimindo ? 'Imprimindo...' : 'Reimprimir'}
    </Button>
  );
}
