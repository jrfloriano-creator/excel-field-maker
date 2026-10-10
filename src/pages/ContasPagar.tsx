import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, Filter } from 'lucide-react';
import { useContasPagar, StatusFiltro } from '@/hooks/useContasPagar';
import { ContasPagarFormModal } from '@/components/ContasPagarFormModal';
import { ProjecaoSemanal } from '@/components/ProjecaoSemanal';
import type { ContaPagar } from '@/types/titulo';

const MAPA_STATUS: Record<string, string> = {
  PENDENTE: 'A Vencer',
  VENCIDO: 'Vencida',
  PAGO: 'Paga',
  CANCELADO: 'Cancelada'
};

export default function ContasPagarPage() {
  const {
    contasFiltradas, contasCalculadas, totais, loading,
    filtroStatus, setFiltroStatus,
    addConta, updateConta, deleteConta, marcarComoPaga
  } = useContasPagar();

  const [modalAberto, setModalAberto] = useState(false);
  const [contaEdicao, setContaEdicao] = useState<ContaPagar | null>(null);

  const abrirCadastro = () => {
    setContaEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicao = (conta: ContaPagar) => {
    setContaEdicao(conta);
    setModalAberto(true);
  };

  const salvar = async (dados: any) => {
    if (contaEdicao) {
      await updateConta(contaEdicao.id, dados);
    } else {
      await addConta(dados);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">💰 Contas a Pagar</h1>
        <button
          onClick={abrirCadastro}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} /> Nova Conta
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">A Vencer</p>
          <p className="text-xl font-bold text-blue-700">R$ {totais.aVencer.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">Vencidas</p>
          <p className="text-xl font-bold text-red-700">R$ {totais.vencidas.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">Pagas</p>
          <p className="text-xl font-bold text-green-700">R$ {totais.pagas.toFixed(2)}</p>
        </div>
      </div>

      {/* Projeção Semanal */}
      <div className="bg-white dark:bg-gray-900 border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">📊 Quanto Preciso Vender Esta Semana</h2>
        <ProjecaoSemanal contas={contasCalculadas} />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-500" />
        {(['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO', 'CANCELADO'] as StatusFiltro[]).map(status => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1 rounded text-sm ${
              filtroStatus === status 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'
            }`}
          >
            {status === 'TODOS' ? 'Todas' : MAPA_STATUS[status]}
          </button>
        ))}
      </div>

      {/* Lista de Contas */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="p-3 text-left">Nº</th>
              <th className="p-3 text-left">Favorecido</th>
              <th className="p-3 text-left">Vencimento</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  Nenhuma conta encontrada. Clique em "Nova Conta" para cadastrar.
                </td>
              </tr>
            ) : (
              contasFiltradas.map(conta => (
                <tr key={conta.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono text-xs text-gray-500">{conta.numero}</td>
                  <td className="p-3">
                    <div className="font-medium">{conta.favorecido}</div>
                    <div className="text-xs text-gray-500">{conta.descricao}</div>
                  </td>
                  <td className="p-3">
                    {new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-right font-medium">R$ {conta.valor.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      conta.status === 'PAGO' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      conta.status === 'VENCIDO' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      conta.status === 'CANCELADO' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {MAPA_STATUS[conta.status]}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      {conta.status !== 'PAGO' && conta.status !== 'CANCELADO' && (
                        <button
                          onClick={() => marcarComoPaga(conta.id)}
                          className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded"
                          title="Marcar como paga"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => abrirEdicao(conta)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteConta(conta.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ContasPagarFormModal
        aberto={modalAberto}
        fechar={() => { setModalAberto(false); setContaEdicao(null); }}
        aoSalvar={salvar}
        contaEdicao={contaEdicao}
      />
    </div>
  );
}