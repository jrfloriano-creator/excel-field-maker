// src/lib/projecaoSemanal.ts
import type { ContaPagar } from '@/types/titulo';

export interface ProjecaoSemanal {
  semana: string;
  periodo: string;
  totalContas: number;
  margemLucro: number;
  precisaVender: number;
}

/**
 * CORREÇÃO CRÍTICA:
 * 1. Não muta mais o parâmetro `dataInicio` (usava setHours no objeto recebido)
 * 2. Inclui contas vencidas de semanas anteriores na linha "Esta Semana"
 *    (antes, vencidas sumiam e o "quanto preciso vender" ficava subestimado)
 */
export function calcularProjecaoSemanal(
  contas: ContaPagar[],
  margemLucroPercentual: number = 30,
  dataInicio?: Date
): ProjecaoSemanal[] {
  // CORREÇÃO: cria cópia para não mutar o parâmetro recebido
  const hoje = dataInicio ? new Date(dataInicio.getTime()) : new Date();
  hoje.setHours(0, 0, 0, 0);

  // CORREÇÃO CRÍTICA: calcula contas vencidas ANTES da semana atual
  // (semanas anteriores que não foram pagas nem canceladas)
  const diaSemanaHoje = hoje.getDay();
  const ajusteSegunda = diaSemanaHoje === 0 ? -6 : 1 - diaSemanaHoje;
  const inicioSemanaAtual = new Date(hoje);
  inicioSemanaAtual.setDate(hoje.getDate() + ajusteSegunda);
  inicioSemanaAtual.setHours(0, 0, 0, 0);

  const contasVencidas = contas.filter((c) => {
    if (c.status === 'PAGO' || c.status === 'CANCELADO') return false;
    const vencimento = new Date(`${c.vencimento}T00:00:00`);
    return vencimento < inicioSemanaAtual;
  });
  const totalVencidas = contasVencidas.reduce((soma, c) => soma + c.valor, 0);

  const semanas: ProjecaoSemanal[] = [];

  for (let i = 0; i < 12; i++) {
    const diaSemana = hoje.getDay();
    const ajusteSegundaLoop = diaSemana === 0 ? -6 : 1 - diaSemana;
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() + ajusteSegundaLoop + i * 7);
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    // Filtra contas não pagas e não canceladas da semana
    const contasDaSemana = contas.filter((c) => {
      const vencimento = new Date(`${c.vencimento}T00:00:00`);
      return (
        vencimento >= inicioSemana &&
        vencimento <= fimSemana &&
        c.status !== 'PAGO' &&
        c.status !== 'CANCELADO'
      );
    });

    let totalContas = contasDaSemana.reduce((soma, c) => soma + c.valor, 0);

    // CORREÇÃO CRÍTICA: na primeira semana, inclui contas vencidas
    let nomeSemana: string;
    if (i === 0) {
      totalContas += totalVencidas;
      nomeSemana = totalVencidas > 0
        ? `Esta Semana (+ ${contasVencidas.length} em atraso)`
        : 'Esta Semana';
    } else {
      nomeSemana = `Semana ${i + 1}`;
    }

    const precisaVender =
      margemLucroPercentual > 0
        ? totalContas / (margemLucroPercentual / 100)
        : totalContas;

    semanas.push({
      semana: nomeSemana,
      periodo: `${inicioSemana.toLocaleDateString('pt-BR')} a ${fimSemana.toLocaleDateString('pt-BR')}`,
      totalContas: Number(totalContas.toFixed(2)),
      margemLucro: margemLucroPercentual,
      precisaVender: Number(precisaVender.toFixed(2)),
    });
  }

  return semanas;
}