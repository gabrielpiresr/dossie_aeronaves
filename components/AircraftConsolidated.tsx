'use client';

import { useMemo, useState } from 'react';
import type { AircraftConsolidatedSnapshot, ConsolidatedMetrics, DistributionItem, IncidentCount, IncidentDetail } from '@/types/aircraft';

type AircraftConsolidatedProps = {
  snapshot: AircraftConsolidatedSnapshot | null;
};

type TooltipState = {
  label: string;
  total: number;
  percent: number;
} | null;

type BrazilTile = {
  estado: string;
  top: number;
  left: number;
};

const DONUT_COLORS = ['#0f766e', '#0284c7', '#7c3aed', '#ea580c', '#16a34a', '#be123c', '#334155', '#ca8a04', '#0891b2', '#4f46e5'];

const BRAZIL_TILE_MAP: BrazilTile[] = [
  { estado: 'RR', top: 4, left: 29 },
  { estado: 'AP', top: 9, left: 49 },
  { estado: 'AM', top: 15, left: 23 },
  { estado: 'PA', top: 18, left: 44 },
  { estado: 'AC', top: 25, left: 7 },
  { estado: 'RO', top: 28, left: 17 },
  { estado: 'TO', top: 34, left: 47 },
  { estado: 'MA', top: 32, left: 58 },
  { estado: 'PI', top: 37, left: 64 },
  { estado: 'CE', top: 37, left: 72 },
  { estado: 'RN', top: 35, left: 81 },
  { estado: 'PB', top: 39, left: 82 },
  { estado: 'PE', top: 43, left: 79 },
  { estado: 'AL', top: 46, left: 79 },
  { estado: 'SE', top: 49, left: 77 },
  { estado: 'BA', top: 49, left: 66 },
  { estado: 'MT', top: 41, left: 35 },
  { estado: 'GO', top: 49, left: 48 },
  { estado: 'DF', top: 52, left: 52 },
  { estado: 'MS', top: 56, left: 34 },
  { estado: 'MG', top: 59, left: 58 },
  { estado: 'ES', top: 63, left: 68 },
  { estado: 'RJ', top: 68, left: 65 },
  { estado: 'SP', top: 69, left: 56 },
  { estado: 'PR', top: 77, left: 52 },
  { estado: 'SC', top: 83, left: 53 },
  { estado: 'RS', top: 90, left: 48 },
];

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function colorByIntensity(value: number, max: number) {
  if (value <= 0 || max <= 0) {
    return '#e2e8f0';
  }

  const intensity = Math.min(value / max, 1);
  if (intensity > 0.8) return '#0c4a6e';
  if (intensity > 0.6) return '#0369a1';
  if (intensity > 0.4) return '#0284c7';
  if (intensity > 0.2) return '#38bdf8';
  return '#bae6fd';
}

function DonutChart({ title, data }: { title: string; data: DistributionItem[] }) {
  const [activeTooltip, setActiveTooltip] = useState<TooltipState>(null);

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
      <div className="mt-3 flex items-start gap-4">
        <div className="relative h-28 w-28 rounded-full" style={style}>
          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>

        <div className="flex-1">
          <ul className="space-y-1 text-xs text-slate-700">
            {data.slice(0, 10).map((item, index) => {
              const percent = (item.total / total) * 100;
              return (
                <li
                  key={item.label}
                  className="flex cursor-default items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50"
                  onMouseEnter={() => setActiveTooltip({ label: item.label, total: item.total, percent })}
                  onMouseLeave={() => setActiveTooltip(null)}
                  title={`${item.label}: ${formatNumber(item.total)} (${percent.toFixed(1)}%)`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                  <span>
                    {item.label}: {formatNumber(item.total)} ({percent.toFixed(1)}%)
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 min-h-10 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
            {activeTooltip ? (
              <>
                <p className="font-semibold text-slate-800">{activeTooltip.label}</p>
                <p>
                  {formatNumber(activeTooltip.total)} aeronaves ({activeTooltip.percent.toFixed(1)}%)
                </p>
              </>
            ) : (
              <p>Passe o mouse nos itens para ver o tooltip detalhado.</p>
            )}
          </div>
        </div>
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
  const stateMap = useMemo(() => {
    const map = new Map<string, number>();
    metrics.mapa_brasil.por_estado.forEach((item) => map.set(item.estado, item.total));
    return map;
  }, [metrics.mapa_brasil.por_estado]);

  const maxValue = Math.max(...metrics.mapa_brasil.por_estado.map((item) => item.total), 0);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">Mapa do Brasil por estado (heatmap)</h4>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="relative mx-auto h-80 w-full max-w-xs rounded-md bg-white">
            {BRAZIL_TILE_MAP.map((tile) => {
              const total = stateMap.get(tile.estado) ?? 0;
              const color = colorByIntensity(total, maxValue);

              return (
                <div
                  key={tile.estado}
                  className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-default items-center justify-center rounded text-[10px] font-semibold text-slate-800 shadow-sm"
                  style={{ top: `${tile.top}%`, left: `${tile.left}%`, backgroundColor: color }}
                  title={`${tile.estado}: ${formatNumber(total)} aeronaves`}
                >
                  {tile.estado}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">* Mapa em formato tile para comparação visual por estado.</p>
        </div>

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

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Top estados</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {metrics.mapa_brasil.por_estado.slice(0, 8).map((item) => (
              <li key={item.estado}>
                {item.estado} ({item.regiao}): <strong>{formatNumber(item.total)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function IncidentCountCards({ counts }: { counts: IncidentCount[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {counts.map((item) => (
        <article key={item.classificacao} className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">{item.classificacao}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(item.total)}</p>
        </article>
      ))}
    </div>
  );
}

function IncidentHistoryTable({ incidents }: { incidents: IncidentDetail[] }) {
  if (incidents.length === 0) {
    return null;
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
            <th className="px-3 py-2 font-semibold">Link</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident, index) => (
            <tr key={`${incident.link ?? 'sem-link'}-${incident.data ?? 'sem-data'}-${index}`} className="border-t border-slate-100">
              <td className="px-3 py-2">{incident.data?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.classificacao?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.tipo?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.localidade?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.uf?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.aerodromo?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.operacao?.trim() || '-'}</td>
              <td className="px-3 py-2">{incident.status?.trim() || '-'}</td>
              <td className="px-3 py-2">
                {incident.link?.trim() ? (
                  <a
                    href={incident.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-700 underline hover:text-sky-900"
                  >
                    Abrir relatório
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentTypeTable({ data }: { data: DistributionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="px-3 py-2" colSpan={2}>
                Sem dados de ocorrências por tipo.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.label} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.label}</td>
                <td className="px-3 py-2">{formatNumber(item.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function IncidentStateChart({ data }: { data: ConsolidatedMetrics['ocorrencias']['relato_por_uf'] }) {
  const max = Math.max(...data.map((item) => item.total), 0);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h5 className="text-sm font-semibold text-slate-800">Relato por UF</h5>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Sem dados por UF.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((item) => {
            const widthPercent = max > 0 ? (item.total / max) * 100 : 0;
            return (
              <li key={item.estado}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                  <span>
                    {item.estado} ({item.regiao})
                  </span>
                  <span className="font-semibold">{formatNumber(item.total)}</span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-sky-600" style={{ width: `${widthPercent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IncidentSummarySection({ title, metrics }: { title: string; metrics: ConsolidatedMetrics }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3">
        <IncidentCountCards counts={metrics.ocorrencias.totais_por_classificacao} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <IncidentStateChart data={metrics.ocorrencias.relato_por_uf} />
        <IncidentTypeTable data={metrics.ocorrencias.relato_por_tipo} />
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
        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">Ocorrências da aeronave consultada</h3>
          <div
            className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${
              snapshot.aeronave_consultada_ocorrencias.possui_historico
                ? 'border-amber-700 bg-amber-800/90 text-amber-50'
                : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {snapshot.aeronave_consultada_ocorrencias.possui_historico
              ? 'AERONAVE COM HISTORICO DE ACIDENTE OU INCIDENTE'
              : 'AERONAVE SEM HISTORICO DE ACIDENTE'}
          </div>
          <div className="mt-3">
            <IncidentCountCards counts={snapshot.aeronave_consultada_ocorrencias.totais_por_classificacao} />
          </div>
          <IncidentHistoryTable incidents={snapshot.aeronave_consultada_ocorrencias.historico} />
        </div>

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
          <div className="mt-3">
            <IncidentSummarySection title="Ocorrências consolidadas por fabricante" metrics={snapshot.fabricante_consolidado} />
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
          <div className="mt-3">
            <IncidentSummarySection title="Ocorrências consolidadas por modelo" metrics={snapshot.modelo_consolidado} />
          </div>
        </div>
      </div>
    </section>
  );
}
