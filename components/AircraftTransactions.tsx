import type { DetectedTransaction } from '@/types/aircraft';

type AircraftTransactionsProps = {
  transactions: DetectedTransaction[];
};

export default function AircraftTransactions({ transactions }: AircraftTransactionsProps) {
  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Negociações Detectadas</h2>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nenhuma negociação detectada.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {transactions.map((transaction, index) => (
            <li key={`${transaction.data_nova}-${index}`} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm text-slate-900">
                <span className="font-medium">De:</span> {transaction.proprietario_anterior}
              </p>
              <p className="text-sm text-slate-900">
                <span className="font-medium">Para:</span> {transaction.proprietario_novo}
              </p>

              <p className="mt-3 text-sm text-slate-700">
                <span className="font-medium">Período:</span> {transaction.data_anterior} → {transaction.data_nova}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Operador:</span> {transaction.operador || 'Não informado'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
