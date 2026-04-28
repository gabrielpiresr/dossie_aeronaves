import type { AircraftRabSnapshot } from '@/types/aircraft';

type AircraftIncidentsProps = {
  snapshot: AircraftRabSnapshot | null;
};

export default function AircraftIncidents({ snapshot }: AircraftIncidentsProps) {
  if (!snapshot) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Incidentes da aeronave (CENIPA)</h2>
        {snapshot.fonte_cenipa_url && (
          <a
            href={snapshot.fonte_cenipa_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-sky-700 underline hover:text-sky-900"
          >
            Abrir consulta no CENIPA
          </a>
        )}
      </div>

      {snapshot.incidentes_consulta_erro && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {snapshot.incidentes_consulta_erro}
        </div>
      )}

      {!snapshot.incidentes_consulta_erro && snapshot.incidentes.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">Nenhum incidente encontrado para esta matrícula na consulta atual.</p>
      )}

      {snapshot.incidentes.length > 0 && (
        <div className="mt-4 space-y-4">
          {snapshot.incidentes.map((incidente, index) => (
            <article key={`incidente-${index}`} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">Incidente {index + 1}</h3>
                {incidente.link_relatorio && (
                  <a
                    href={incidente.link_relatorio}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-sky-700 underline hover:text-sky-900"
                  >
                    Abrir relatório
                  </a>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {incidente.campos.map((campo, campoIndex) => (
                  <div key={`${index}-${campo.label}-${campoIndex}`} className="rounded-md border border-slate-100 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{campo.label}</p>
                    <p className="mt-1 text-sm text-slate-900">{campo.value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
