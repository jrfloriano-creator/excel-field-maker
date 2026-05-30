import { useState } from 'react';
import { Titulo, AppConfig, TituloComCalculo } from '@/types/titulo';
import { SessionUser, appendLog, hasPerm } from '@/lib/auth';
import { buildPagamentoWhatsMsg, whatsLink } from '@/lib/calculos';
import { openExternalUrl } from '@/lib/openUrl';
import { toast } from 'sonner';

interface UseTituloActionsProps {
  titulos: Titulo[];
  titulosCalculados: TituloComCalculo[];
  config: AppConfig;
  updateConfig: (data: Partial<AppConfig>) => void;
  addTitulo: (data: Omit<Titulo, 'id' | 'numero'>) => void;
  updateTitulo: (id: string, data: Partial<Titulo>) => void;
  deleteTitulo: (id: string) => void;
  user: SessionUser | null;
}

export function useTituloActions({
  titulos,
  titulosCalculados,
  config,
  updateConfig,
  addTitulo,
  updateTitulo,
  deleteTitulo,
  user,
}: UseTituloActionsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<Titulo | null>(null);
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'titulo' | 'cliente'; id: string } | null>(null);

  const handleAdd = (data: any, motivo?: string) => {
    if (!user) return;
    if (editingTitulo) {
      const before = editingTitulo;
      updateTitulo(before.id, data);
      const propag: Partial<Titulo> = {};
      if (data.clienteId !== before.clienteId) { propag.clienteId = data.clienteId; propag.cliente = data.cliente; }
      if (data.dataEmissao !== before.dataEmissao) propag.dataEmissao = data.dataEmissao;
      if (data.vencimento !== before.vencimento) propag.vencimento = data.vencimento;
      if (Object.keys(propag).length > 0) {
        const irmaos = titulos.filter(t =>
          t.id !== before.id &&
          t.clienteId === before.clienteId &&
          t.dataEmissao === before.dataEmissao
        );
        irmaos.forEach(t => updateTitulo(t.id, propag));
        if (irmaos.length > 0) toast.message(`Replicado para ${irmaos.length} título(s) do mesmo lote.`);
      }
      appendLog(config, updateConfig, user, 'titulo.editar',
        `Editou título #${before.numero}${motivo ? `. Motivo: ${motivo}` : ''}`);
      setEditingTitulo(null);
      setShowForm(false);
      toast.success('Título atualizado!');
    } else {
      addTitulo(data);
      appendLog(config, updateConfig, user, 'titulo.criar', `Criou título ${data.tipo} ${data.cliente} ${data.valor}`);
      setShowForm(false);
      toast.success('Título adicionado!');
    }
  };

  const askDelete = (id: string) => setPendingDelete({ kind: 'titulo', id });

  const confirmDelete = (motivo: string) => {
    if (!pendingDelete || !user) return;
    if (pendingDelete.kind === 'titulo') {
      const t = titulos.find(x => x.id === pendingDelete.id);
      deleteTitulo(pendingDelete.id);
      appendLog(config, updateConfig, user, 'titulo.excluir',
        `Excluiu título #${t?.numero} (${t?.cliente}). Motivo: ${motivo}`);
      toast.success('Título removido');
    } else {
      const c = config.clientes.find(x => x.id === pendingDelete.id);
      updateConfig({ clientes: config.clientes.filter(cl => cl.id !== pendingDelete.id) });
      appendLog(config, updateConfig, user, 'cliente.excluir',
        `Excluiu cliente ${c?.nome}. Motivo: ${motivo}`);
      toast.success('Cliente removido');
    }
    setPendingDelete(null);
  };

  const handleEdit = (id: string) => {
    const t = titulos.find(x => x.id === id);
    if (t) { setEditingTitulo(t); setShowForm(true); }
  };

  const handlePagar = (id: string) => {
    if (!hasPerm(config, user, 'titulo.receber')) {
      toast.error('Sem permissão para receber títulos');
      return;
    }
    setPagarId(id);
  };

  const handleConfirmPagar = (data: any) => {
    if (!pagarId || !user) return;
    const t = titulosCalculados.find(x => x.id === pagarId);
    updateTitulo(pagarId, {
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago,
      recebidoPor: data.recebidoPor,
      formaPagamento: data.formaPagamento,
      maquininhaPagamento: data.maquininhaPagamento,
      creditoAplicado: data.creditoAplicado,
      creditoGerado: data.creditoGerado,
    });
    appendLog(config, updateConfig, user, 'titulo.pagar',
      `Recebeu título #${t?.numero} ${t?.cliente} ${data.formaPagamento} ${data.valorPago} por ${data.recebidoPor}${data.enviarWhats ? ' [WhatsApp enviado]' : ''}`);
    if (data.enviarWhats && t?.telefone) {
      const cli = config.clientes.find(c => c.id === t.clienteId);
      const apelido = (cli?.apelido && cli.apelido.trim()) || t.cliente;
      // Calcula posição no lote (mesmo cliente + tipo + dataEmissao)
      const lote = titulos
        .filter(x => x.clienteId === t.clienteId && x.tipo === t.tipo && x.dataEmissao === t.dataEmissao)
        .sort((a, b) => a.numero - b.numero);
      const posicao = lote.findIndex(x => x.id === t.id) + 1;
      const tipoTituloFormatado = lote.length > 1
        ? `${t.tipo} ${posicao}/${lote.length}`
        : `${t.tipo} ${t.numero}`;
      const msg = buildPagamentoWhatsMsg({
        apelido,
        formaPagamento: data.formaPagamento,
        valorPago: data.valorPago,
        tipoTitulo: tipoTituloFormatado,
        recebidoPor: data.recebidoPor,
        creditoGerado: data.creditoGerado,
      });
      openExternalUrl(whatsLink(t.telefone, msg));
      appendLog(config, updateConfig, user, 'whatsapp.pagamento', `WhatsApp pagamento p/ ${apelido}`);
    }
    setPagarId(null);
    toast.success('Pagamento registrado!');
  };

  const pagarTitulo = pagarId ? titulosCalculados.find(t => t.id === pagarId) ?? null : null;

  const creditoCliente = pagarTitulo
    ? titulos
        .filter(x => x.clienteId === pagarTitulo.clienteId && x.id !== pagarTitulo.id && x.creditoGerado)
        .reduce((s, x) => s + (x.creditoGerado || 0), 0)
      - titulos
        .filter(x => x.clienteId === pagarTitulo.clienteId && x.id !== pagarTitulo.id)
        .reduce((s, x) => s + (x.creditoAplicado || 0), 0)
    : 0;

  return {
    showForm, setShowForm,
    editingTitulo, setEditingTitulo,
    pagarId, setPagarId,
    pendingDelete, setPendingDelete,
    pagarTitulo,
    creditoCliente,
    handleAdd,
    askDelete,
    confirmDelete,
    handleEdit,
    handlePagar,
    handleConfirmPagar,
  };
}
