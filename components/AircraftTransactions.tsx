import { useMemo } from 'react';
import type { DetectedTransaction } from '@/types/aircraft';

type AircraftTransactionsProps = {
  transactions: DetectedTransaction[];
  isLoading?: boolean;
};

function sortByMostRecent(transactions: DetectedTransaction[]) {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.data_nova).getTime();
    const dateB = new Date(b.data_nova).getTime();

    return dateB - dateA;
  });
}

function formatMonthYear(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export default function AircraftTransactions({ transactions, isLoading = false }: AircraftTransactionsProps) {
  const sortedTransactions = useMemo(() => sortByMostRecent(transactions), [transactions]);

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Timeline de Negociações</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-600">Carregando negociações...</p>
      ) : sortedTransactions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nenhuma negociação detectada.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {sortedTransactions.map((transaction, index) => (
            <li key={`${transaction.data_nova}-${index}`} className="relative pl-8">
              <span
                className="absolute left-[11px] top-2 h-3 w-3 rounded-full border-2 border-sky-600 bg-white"
                aria-hidden="true"
              />

              {index < sortedTransactions.length - 1 && (
                <span className="absolute left-[16px] top-5 h-[calc(100%+1.2rem)] w-px bg-slate-200" aria-hidden="true" />
              )}

              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-sky-700">{formatMonthYear(transaction.data_nova)}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="font-medium">De:</span> {transaction.proprietario_anterior}
                  </p>
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <span className="font-medium">Para:</span> {transaction.proprietario_novo}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                  <p><span className="font-medium">Matrícula:</span> {transaction.marca ?? '-'}</p>
                  <p><span className="font-medium">Modelo:</span> {transaction.modelo ?? '-'}</p>
                  <p><span className="font-medium">Fabricante:</span> {transaction.fabricante ?? '-'}</p>
                </div>

                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-medium">Operador:</span> {transaction.operador || 'Não informado'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
