import type { AircraftTransaction } from '@/types/aircraft';

type AircraftTransactionsProps = {
  transactions: AircraftTransaction[];
};

export default function AircraftTransactions({ transactions }: AircraftTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Nenhuma transação para exibir.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => (
        <li key={transaction.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">{transaction.date}</p>
          <p className="mt-1 text-sm text-slate-800">{transaction.description}</p>
        </li>
      ))}
    </ul>
  );
}
