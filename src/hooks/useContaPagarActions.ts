import { useMemo, useState } from 'react';
import { AppConfig, ContaPagar, ContaPagarComCalculo } from '@/types/titulo';
import { SessionUser, appendLog } from '@/lib/auth';
import { toast } from 'sonner';

interface UseContaPagarActionsProps {
  contas: ContaPagar[];
  contasCalculadas: ContaPagarComCalculo[];
  config: AppConfig;
  updateConfig: (data: Partial<AppConfig>) => void;
  addConta: (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<ContaPagar>;
  updateConta: (id: string, data: Partial<ContaPagar>) => Promise<void>;
  deleteConta: (id: string) => Promise<void>;
  user: SessionUser | null;
}

export function useContaPagarActions({
  contas,
  contasCalculadas,
  config,
  updateConfig,
  addConta,
  updateConta,
  deleteConta,
  user,
}: UseContaPagarActionsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [payingContaId, setPayingContaId] = useState<string | null>(null);
  const [reversingContaId, setReversingContaId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const payingConta = useMemo(
    () => payingContaId ? contasCalculadas.find(conta => conta.id === payingContaId) ?? null : null,
    [contasCalculadas, payingContaId]
  );

  const reversingConta = useMemo(
    () => reversingContaId ? contasCalculadas.find(conta => conta.id === reversingContaId) ?? null : null,
    [contasCalculadas, reversingContaId]
  );

  const handleSubmit = async (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!user) return;
    if (editingConta) {
      await updateConta(editingConta.id, {
        ...data,
        status: editingConta.status === 'PAGO' ? 'PAGO' : 'PENDENTE',
      });
      appendLog(config, updateConfig, user, 'conta-pagar.editar', `Editou conta a pagar #${editingConta.numero} (${editingConta.favorecido})`);
      toast.success('Conta atualizada!');
    } else {
      const created = await addConta(data);
      appendLog(config, updateConfig, user, 'conta-pagar.criar', `Criou conta a pagar #${created.numero} (${created.favorecido})`);
      toast.success('Conta adicionada!');
    }
    setEditingConta(null);
    setShowForm(false);
  };

  const handleConfirmPagamento = async (data: { paidAt: string; paidAmount: number; formaPagamentoId?: string; formaPagamentoNome?: string }) => {
    if (!payingContaId || !user) return;
    const conta = contas.find(item => item.id === payingContaId);
    await updateConta(payingContaId, {
      status: 'PAGO',
      paidAt: data.paidAt,
      paidAmount: data.paidAmount,
      formaPagamentoId: data.formaPagamentoId,
      formaPagamentoNome: data.formaPagamentoNome,
      reversalReason: undefined,
      reversedAt: undefined,
      reversedBy: undefined,
    });
    appendLog(config, updateConfig, user, 'conta-pagar.pagar', `Baixou conta a pagar #${conta?.numero} (${conta?.favorecido}) no valor de ${data.paidAmount}`);
    setPayingContaId(null);
    toast.success('Pagamento registrado!');
  };

  const handleConfirmReversao = async (motivo: string) => {
    if (!reversingContaId || !user) return;
    const conta = contas.find(item => item.id === reversingContaId);
    await updateConta(reversingContaId, {
      status: 'PENDENTE',
      paidAt: undefined,
      paidAmount: undefined,
      reversalReason: motivo,
      reversedAt: new Date().toISOString(),
      reversedBy: user.nome,
      formaPagamentoId: undefined,
      formaPagamentoNome: undefined,
    });
    appendLog(config, updateConfig, user, 'conta-pagar.reverter', `Reverteu baixa da conta #${conta?.numero} (${conta?.favorecido}). Motivo: ${motivo}`);
    setReversingContaId(null);
    toast.success('Baixa revertida!');
  };

  const handleConfirmDelete = async (motivo: string) => {
    if (!pendingDeleteId || !user) return;
    const conta = contas.find(item => item.id === pendingDeleteId);
    await deleteConta(pendingDeleteId);
    appendLog(config, updateConfig, user, 'conta-pagar.excluir', `Excluiu conta a pagar #${conta?.numero} (${conta?.favorecido}). Motivo: ${motivo}`);
    setPendingDeleteId(null);
    toast.success('Conta removida!');
  };

  return {
    showForm,
    setShowForm,
    editingConta,
    setEditingConta,
    payingContaId,
    setPayingContaId,
    payingConta,
    reversingContaId,
    setReversingContaId,
    reversingConta,
    pendingDeleteId,
    setPendingDeleteId,
    handleSubmit,
    handleConfirmPagamento,
    handleConfirmReversao,
    handleConfirmDelete,
  };
}