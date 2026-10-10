import { useState, useEffect } from 'react';
import type { ContaPagar, ContaPagarCategoria } from '@/types/titulo';

interface Props {
  aberto: boolean;
  fechar: () => void;
  aoSalvar: (dados: Omit<ContaPagar, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  contaEdicao?: ContaPagar | null;
}

const CATEGORIAS: ContaPagarCategoria[] = [
  'FORNECEDOR', 'FUNCIONARIO', 'IMPOSTO', 'ALUGUEL', 'UTILIDADE', 'SERVICO', 'OUTRO'
];

const MAPA_CATEGORIA: Record<ContaPagarCategoria, string> = {
  FORNECEDOR: 'Fornecedor',
  FUNCIONARIO: 'Funcionário',
  IMPOSTO: 'Imposto',
  ALUGUEL: 'Aluguel',
  UTILIDADE: 'Conta de Luz/Água/Internet',
  SERVICO: 'Serviço',
  OUTRO: 'Outro'
};

export function ContasPagarFormModal({ aberto, fechar, aoSalvar, contaEdicao }: Props) {
  const [form, setForm] = useState({
    favorecido: '',
    descricao: '',
    categoria: 'OUTRO' as ContaPagarCategoria,
    valor: 0,
    vencimento: '',
    observacoes: '',
  });

  useEffect(() => {
    if (contaEdicao) {
      setForm({
        favorecido: contaEdicao.favorecido,
        descricao: contaEdicao.descricao,
        categoria: contaEdicao.categoria,
        valor: contaEdicao.valor,
        vencimento: contaEdicao.vencimento,
        observacoes: contaEdicao.observacoes || '',
      });
    } else {
      setForm({
        favorecido: '', descricao: '', categoria: 'OUTRO', valor: 0, vencimento: '', observacoes: ''
      });
    }
  }, [contaEdicao, aberto]);

  if (!aberto) return null;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    aoSalvar(form);
    fechar();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {contaEdicao ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
        </h2>
        
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Credor/Favorecido *</label>
            <input
              type="text" required
              value={form.favorecido}
              onChange={e => setForm({...form, favorecido: e.target.value})}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Nome de quem deve pagar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição *</label>
            <input
              type="text" required
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Ex: Aluguel de outubro, compra de material..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm({...form, categoria: e.target.value as any})}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{MAPA_CATEGORIA[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.valor || ''}
                onChange={e => setForm({...form, valor: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vencimento *</label>
            <input
              type="date" required
              value={form.vencimento}
              onChange={e => setForm({...form, vencimento: e.target.value})}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({...form, observacoes: e.target.value})}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
              rows={2}
              placeholder="Informações adicionais"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button" onClick={fechar}
              className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {contaEdicao ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}