import type { AircraftConsolidatedSnapshot, IncidentDetail } from '@/types/aircraft';

type Props = { snapshot: AircraftConsolidatedSnapshot | null };

function IncidentHistoryTable({ incidents }: { incidents: IncidentDetail[] }) {
  if (incidents.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">Sem histórico detalhado de ocorrências.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-left text-xs text-slate-700">
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th className="px-3 py-2 font-semibold">Data</th>
            <th className="px-3 py-2 font-semibold">Classificação</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Localidade</th>
            <th className="px-3 py-2 font-semibold">UF</th>
            <th className="px-3 py-2 font-semibold">Aeródromo</th>
            <th className="px-3 py-2 font-semibold">Operação</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents
            .filter((item) => item.classificacao?.toUpperCase() !== 'INCIDENTE')
            .map((incident, index) => (
              <tr key={`${incident.data}-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-2">{incident.data || '-'}</td>
                <td className="px-3 py-2">{incident.classificacao || '-'}</td>
                <td className="px-3 py-2">{incident.tipo || '-'}</td>
                <td className="px-3 py-2">{incident.localidade || '-'}</td>
                <td className="px-3 py-2">{incident.uf || '-'}</td>
                <td className="px-3 py-2">{incident.aerodromo || '-'}</td>
                <td className="px-3 py-2">{incident.operacao || '-'}</td>
                <td className="px-3 py-2">{incident.status || '-'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AircraftCurrentAircraftOccurrences({ snapshot }: Props) {
  if (!snapshot) {
    return null;
  }

  const filteredCounts = snapshot.aeronave_consultada_ocorrencias.totais_por_classificacao.filter(
    (item) => item.classificacao !== 'INCIDENTE',
  );

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Ocorrências da aeronave consultada</h2>
      <div
        className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${
          snapshot.aeronave_consultada_ocorrencias.possui_historico
            ? 'border-amber-700 bg-amber-800/90 text-amber-50'
            : 'border-green-200 bg-green-50 text-green-800'
        }`}
      >
        {snapshot.aeronave_consultada_ocorrencias.possui_historico
          ? 'AERONAVE COM HISTÓRICO DE ACIDENTE/INCIDENTE GRAVE'
          : 'AERONAVE SEM HISTÓRICO DE ACIDENTE'}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {filteredCounts.map((item) => (
          <article key={item.classificacao} className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{item.classificacao}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{item.total.toLocaleString('pt-BR')}</p>
          </article>
        ))}
      </div>

      <IncidentHistoryTable incidents={snapshot.aeronave_consultada_ocorrencias.historico} />
    </section>
  );
}
