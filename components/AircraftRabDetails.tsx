import type { AircraftRabSnapshot } from '@/types/aircraft';

type AircraftRabDetailsProps = {
  snapshot: AircraftRabSnapshot | null;
};

export default function AircraftRabDetails({ snapshot }: AircraftRabDetailsProps) {
  if (!snapshot) {
    return null;
  }

  const hasExternalSourceLink = snapshot.fonte_url.startsWith('http://') || snapshot.fonte_url.startsWith('https://');

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Dados atuais da base interna</h2>
        {hasExternalSourceLink ? (
          <a
            href={snapshot.fonte_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-sky-700 underline hover:text-sky-900"
          >
            Abrir origem dos dados
          </a>
        ) : (
          <span className="text-xs text-slate-500">Fonte: {snapshot.fonte_url}</span>
        )}
      </div>

      {snapshot.consulta_realizada_em && (
        <p className="mt-2 text-xs text-slate-500">Consulta realizada em: {snapshot.consulta_realizada_em}</p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.campos.map((field, index) => (
          <div key={`${field.label}-${index}`} className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
            <p className="mt-1 text-sm text-slate-900">{field.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
