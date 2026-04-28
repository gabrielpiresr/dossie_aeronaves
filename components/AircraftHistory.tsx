import type { AircraftHistoryData } from '@/types/aircraft';
import AircraftTransactions from './AircraftTransactions';

type AircraftHistoryProps = {
  data?: AircraftHistoryData;
};

export default function AircraftHistory({ data }: AircraftHistoryProps) {
  if (!data) {
    return (
      <section className="mt-8 w-full max-w-xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Faça uma busca para visualizar o histórico da aeronave.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 w-full max-w-xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{data.registration}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {data.manufacturer} {data.model}
      </p>
      <div className="mt-5">
        <AircraftTransactions transactions={data.transactions} />
      </div>
    </section>
  );
}
