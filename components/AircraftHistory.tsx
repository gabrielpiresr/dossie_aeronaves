import type { AircraftRecord } from '@/types/aircraft';

type AircraftHistoryProps = {
  records: AircraftRecord[];
};

export default function AircraftHistory({ records }: AircraftHistoryProps) {
  if (records.length === 0) {
    return (
      <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Nenhum histórico encontrado.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Histórico completo</h2>
      <ul className="mt-4 space-y-3">
        {records.map((record) => (
          <li key={`${record.DATA_REGISTRO}-${record.MARCA}-${record.PROPRIETARIO ?? 'sem-proprietario'}`} className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{record.DATA_REGISTRO}</p>
            <p className="mt-1 text-sm text-slate-900">
              <span className="font-medium">Proprietário:</span> {record.PROPRIETARIO?.trim() || 'Não informado'}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium">Operador:</span> {record.OPERADOR?.trim() || 'Não informado'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
