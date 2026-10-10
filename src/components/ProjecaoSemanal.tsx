import { useState } from 'react';
import { calcularProjecaoSemanal } from '@/lib/projecaoSemanal';
import type { ContaPagar } from '@/types/titulo';

interface Props {
  contas: ContaPagar[];
}

export function ProjecaoSemanal({ contas }: Props) {
  const [margem, setMargem] = useState(30);
  const projecoes = calcularProjecaoSemanal(contas, margem);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <label className="font-medium">Margem de Lucro Estimada (%):</label>
        <input
          type="number" min="1" max="100" value={margem}
          onChange={e => setMargem(parseInt(e.target.value) || 30)}
          className="w-20 border rounded px-2 py-1 text-center dark:bg-gray-700 dark:border-gray-600"
        />
        <span className="text-sm text-gray-500">
          Quanto da venda sobra para pagar despesas
        </span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 text-left">Semana</th>
              <th className="p-2 text-right">Contas a Pagar</th>
              <th className="p-2 text-right">Precisa Vender</th>
            </tr>
          </thead>
          <tbody>
            {projecoes.slice(0, 6).map((p, i) => (
              <tr key={i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-2">
                  <div className="font-medium">{p.semana}</div>
                  <div className="text-xs text-gray-500">{p.periodo}</div>
                </td>
                <td className="p-2 text-right text-red-600 font-medium">
                  R$ {p.totalContas.toFixed(2)}
                </td>
                <td className="p-2 text-right text-blue-600 font-bold">
                  R$ {p.precisaVender.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-300">💡 Como é calculado:</p>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Valor Necessário = Total das Contas ÷ (Margem ÷ 100)
        </p>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Exemplo: Contas de R$ 1.000 com margem de 30% → Precisa vender R$ 3.333,33
        </p>
      </div>
    </div>
  );
}