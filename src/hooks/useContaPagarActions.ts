// src/hooks/useContaPagarActions.ts
import { useMemo, useState } from 'react';
import { AppConfig, ContaPagar, ContaPagarComCalculo } from '@/types/titulo';
import { SessionUser, appendLog, hasPerm } from '@/lib/auth';
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
    () => (payingContaId ? contasCalculadas.find(conta => conta.id === payingContaId) ?? null : null),
    [contasCalculadas, payingContaId]
  );

  const reversingConta = useMemo(
    () => (reversingContaId ? contasCalculadas.find(conta => conta.id === reversingContaId) ?? null : null),
    [contasCalculadas, reversingContaId]
  );

  // ============================================================
  // CORREÇÃO CRÍTICA: Checagem de permissões em todas as ações.
  // Antes: qualquer usuário podia editar/excluir sem checagem.
  // Agora: cada ação valida hasPerm() e mostra toast se não autorizado.
  // ============================================================
  const handleSubmit = async (data: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    // CORREÇÃO: checa permissão de edição
    if (!hasPerm(config, user, 'contasPagar.editar')) {
      toast.error('Você não tem permissão para editar contas a pagar.');
      return;
    }

    try {
      if (editingConta) {
        await updateConta(editingConta.id, {
          ...data,
          status: editingConta.status === 'PAGO' ? 'PAGO' : 'PENDENTE',
        });
        await appendLog('info', user, `Editou conta a pagar #${editingConta.numero} (${editingConta.favorecido})`);
        toast.success('Conta atualizada!');
      } else {
        const created = await addConta(data);
        await appendLog('info', user, `Criou conta a pagar #${created.numero} (${created.favorecido})`);
        toast.success('Conta adicionada!');
      }
      setEditingConta(null);
      setShowForm(false);
    } catch (e) {
      console.error('[useContaPagarActions] erro ao salvar', e);
      toast.error('Erro ao salvar conta');
    }
  };

  const handleConfirmPagamento = async (data: { paidAt: string; paidAmount: number; formaPagamentoId?: string; formaPagamentoNome?: string }) => {
    if (!payingContaId || !user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    // CORREÇÃO: checa permissão de edição (pagar é uma edição)
    if (!hasPerm(config, user, 'contasPagar.editar')) {
      toast.error('Você não tem permissão para baixar contas.');
      return;
    }

    try {
      const conta = contas.find(item => item.id === payingContaId);
      await updateConta(payingContaId, {
        status: 'PAGO',
        dataPagamento: data.paidAt,
        valorPago: data.paidAmount,
        paidAt: data.paidAt,
        paidAmount: data.paidAmount,
        formaPagamento: data.formaPagamentoNome,
        formaPagamentoId: data.formaPagamentoId,
      });
      await appendLog('sucesso', user, `Baixou conta a pagar #${conta?.numero} (${conta?.favorecido}) no valor de ${data.paidAmount}`);
      setPayingContaId(null);
      toast.success('Pagamento registrado!');
    } catch (e) {
      console.error('[useContaPagarActions] erro ao pagar', e);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleConfirmReversao = async (motivo: string) => {
    if (!reversingContaId || !user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    if (!hasPerm(config, user, 'contasPagar.editar')) {
      toast.error('Você não tem permissão para reverter baixas.');
      return;
    }

    try {
      const conta = contas.find(item => item.id === reversingContaId);
      await updateConta(reversingContaId, {
        status: 'PENDENTE',
        dataPagamento: undefined,
        valorPago: undefined,
        paidAt: undefined,
        paidAmount: undefined,
        formaPagamento: undefined,
        formaPagamentoId: undefined,
        motivoExclusao: `Reversão: ${motivo}`,
      });
      await appendLog('aviso', user, `Reverteu baixa da conta #${conta?.numero} (${conta?.favorecido}). Motivo: ${motivo}`);
      setReversingContaId(null);
      toast.success('Baixa revertida!');
    } catch (e) {
      console.error('[useContaPagarActions] erro ao reverter', e);
      toast.error('Erro ao reverter baixa');
    }
  };

  const handleConfirmDelete = async (motivo: string) => {
    if (!pendingDeleteId || !user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    // CORREÇÃO: checa permissão específica de exclusão
    if (!hasPerm(config, user, 'contasPagar.excluir')) {
      toast.error('Você não tem permissão para excluir contas.');
      return;
    }

    try {
      const conta = contas.find(item => item.id === pendingDeleteId);
      // CORREÇÃO: bloqueia exclusão de contas PAGAS
      if (conta?.status === 'PAGO') {
        toast.error('Não é possível excluir uma conta já paga. Reverta a baixa primeiro.');
        return;
      }
      await deleteConta(pendingDeleteId);
      await appendLog('aviso', user, `Excluiu conta a pagar #${conta?.numero} (${conta?.favorecido}). Motivo: ${motivo}`);
      setPendingDeleteId(null);
      toast.success('Conta removida!');
    } catch (e) {
      console.error('[useContaPagarActions] erro ao excluir', e);
      toast.error('Erro ao excluir conta');
    }
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