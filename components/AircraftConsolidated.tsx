import type { AircraftConsolidatedSnapshot, ConsolidatedMetrics, DistributionItem } from '@/types/aircraft';

type AircraftConsolidatedProps = {
  snapshot: AircraftConsolidatedSnapshot | null;
};

const DONUT_COLORS = ['#0f766e', '#0284c7', '#7c3aed', '#ea580c', '#16a34a', '#be123c', '#334155', '#ca8a04'];

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function DonutChart({ title, data }: { title: string; data: DistributionItem[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 p-4">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="mt-3 text-sm text-slate-500">Sem dados para exibir.</p>
      </div>
    );
  }

  const total = data.reduce((acc, item) => acc + item.total, 0);
  const slices = data.reduce<{ gradient: string[]; progress: number }>((acc, item, index) => {
    const percent = (item.total / total) * 100;
    const start = acc.progress;
    const end = start + percent;

    acc.gradient.push(`${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}% ${end}%`);
    acc.progress = end;

    return acc;
  }, { gradient: [], progress: 0 }).gradient;

  const style = {
    background: `conic-gradient(${slices.join(', ')})`,
  };

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-28 w-28 rounded-full" style={style}>
          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
        <ul className="space-y-1 text-xs text-slate-700">
          {data.slice(0, 8).map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
              <span>
                {item.label}: {formatNumber(item.total)} ({((item.total / total) * 100).toFixed(1)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: ConsolidatedMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article className="rounded-md border border-slate-200 p-3">
        <p className="text-xs text-slate-500">Aeronaves registradas</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(metrics.quantidade_aeronaves_registradas)}</p>
      </article>
      <article className="rounded-md border border-slate-200 p-3">
        <p className="text-xs text-slate-500">Negociações desde 2017</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(metrics.negociacoes_desde_2017)}</p>
      </article>
      <article className="rounded-md border border-slate-200 p-3">
        <p className="text-xs text-slate-500">Média por ano (desde 2017)</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.media_negociacoes_por_ano_desde_2017.toFixed(2)}</p>
      </article>
      <article className="rounded-md border border-slate-200 p-3">
        <p className="text-xs text-slate-500">Negociações últimos 12 meses</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(metrics.negociacoes_ultimos_12_meses)}</p>
      </article>
      <article className="rounded-md border border-slate-200 p-3 sm:col-span-2 lg:col-span-4">
        <p className="text-xs text-slate-500">Tempo médio de permanência</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.tempo_medio_permanencia_dias.toFixed(2)} dias</p>
      </article>
    </div>
  );
}

function BrazilMapInfographic({ metrics }: { metrics: ConsolidatedMetrics }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">Infográfico Brasil (estado e região)</h4>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por região</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {metrics.mapa_brasil.por_regiao.length === 0 ? (
              <li>Sem dados regionais.</li>
            ) : (
              metrics.mapa_brasil.por_regiao.map((item) => (
                <li key={item.regiao}>
                  {item.regiao}: <strong>{formatNumber(item.total)}</strong>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por estado</p>
          <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-100 p-2">
            <ul className="space-y-1 text-sm text-slate-700">
              {metrics.mapa_brasil.por_estado.length === 0 ? (
                <li>Sem dados por estado.</li>
              ) : (
                metrics.mapa_brasil.por_estado.map((item) => (
                  <li key={item.estado}>
                    {item.estado} ({item.regiao}): <strong>{formatNumber(item.total)}</strong>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AircraftConsolidated({ snapshot }: AircraftConsolidatedProps) {
  if (!snapshot) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Consolidado de Fabricante e Modelo</h2>
        <span className="text-xs text-slate-500">Fonte: {snapshot.fonte_url}</span>
      </div>

      <div className="mt-4 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Fabricante: {snapshot.fabricante}</h3>
          <div className="mt-3">
            <MetricsGrid metrics={snapshot.fabricante_consolidado} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <DonutChart title="Distribuição por modelo" data={snapshot.fabricante_consolidado.distribuicao_modelo} />
            <DonutChart title="Distribuição por ano" data={snapshot.fabricante_consolidado.distribuicao_ano} />
          </div>
          <div className="mt-3">
            <BrazilMapInfographic metrics={snapshot.fabricante_consolidado} />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h3 className="text-base font-semibold text-slate-900">Modelo: {snapshot.modelo}</h3>
          <div className="mt-3">
            <MetricsGrid metrics={snapshot.modelo_consolidado} />
          </div>
          <div className="mt-3">
            <DonutChart title="Distribuição por ano" data={snapshot.modelo_consolidado.distribuicao_ano} />
          </div>
          <div className="mt-3 rounded-md border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">Aeronaves do modelo registradas atualmente</p>
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-100 p-2">
              <div className="flex flex-wrap gap-2">
                {snapshot.modelo_consolidado.aeronaves_registradas_atualmente.map((marca) => (
                  <span key={marca} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {marca}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <BrazilMapInfographic metrics={snapshot.modelo_consolidado} />
          </div>
        </div>
      </div>
    </section>
  );
}
