import type { AircraftRecord, DetectedTransaction } from '@/types/aircraft';

export function normalizarNome(nome: string) {
  return nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function limparTexto(valor: string | null) {
  return valor?.trim() ?? '';
}

export function detectTransactions(records: AircraftRecord[]): DetectedTransaction[] {
  if (records.length < 2) {
    return [];
  }

  const transactions: DetectedTransaction[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const anterior = records[i - 1];
    const atual = records[i];

    const nomeAnterior = limparTexto(anterior.proprietario);
    const nomeAtual = limparTexto(atual.proprietario);

    if (!nomeAnterior || !nomeAtual) {
      continue;
    }

    if (normalizarNome(nomeAnterior) !== normalizarNome(nomeAtual)) {
      transactions.push({
        data_anterior: anterior.data_registro,
        data_nova: atual.data_registro,
        proprietario_anterior: nomeAnterior,
        proprietario_novo: nomeAtual,
        operador: limparTexto(atual.operador),
      });
    }
  }

  return transactions;
}
