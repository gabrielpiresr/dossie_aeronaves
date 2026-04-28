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

    const nomeAnterior = limparTexto(anterior.PROPRIETARIO);
    const nomeAtual = limparTexto(atual.PROPRIETARIO);

    if (!nomeAnterior || !nomeAtual) {
      continue;
    }

    if (normalizarNome(nomeAnterior) !== normalizarNome(nomeAtual)) {
      transactions.push({
        data_anterior: anterior.DATA_REGISTRO,
        data_nova: atual.DATA_REGISTRO,
        proprietario_anterior: nomeAnterior,
        proprietario_novo: nomeAtual,
        operador: limparTexto(atual.OPERADOR),
      });
    }
  }

  return transactions;
}
