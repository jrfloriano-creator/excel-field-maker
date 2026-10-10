import type { ContaPagar } from '@/types/titulo';

export interface ProjecaoSemanal {
  semana: string;
  periodo: string;
  totalContas: number;
  margemLucro: number;
  precisaVender: number;
}

export function calcularProjecaoSemanal(
  contas: ContaPagar[],
  margemLucroPercentual: number = 30,
  dataInicio?: Date
): ProjecaoSemanal[] {
  const hoje = dataInicio || new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const semanas: ProjecaoSemanal[] = [];

  for (let i = 0; i < 12; i++) {
    // Ajusta para começar na segunda-feira
    const diaSemana = hoje.getDay();
    const ajusteSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() + ajusteSegunda + i * 7);
    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    // Filtra contas não pagas e não canceladas da semana
    const contasDaSemana = contas.filter(c => {
      const vencimento = new Date(c.vencimento + 'T00:00:00');
      return (
        vencimento >= inicioSemana &&
        vencimento <= fimSemana &&
        c.status !== 'PAGO' &&
        c.status !== 'CANCELADO'
      );
    });

    const totalContas = contasDaSemana.reduce((soma, c) => soma + c.valor, 0);
    const precisaVender = margemLucroPercentual > 0 
      ? totalContas / (margemLucroPercentual / 100) 
      : totalContas;

    semanas.push({
      semana: i === 0 ? 'Esta Semana' : `Semana ${i + 1}`,
      periodo: `${inicioSemana.toLocaleDateString('pt-BR')} a ${fimSemana.toLocaleDateString('pt-BR')}`,
      totalContas: Number(totalContas.toFixed(2)),
      margemLucro: margemLucroPercentual,
      precisaVender: Number(precisaVender.toFixed(2))
    });
  }

  return semanas;
}