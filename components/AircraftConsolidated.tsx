'use client';

import { useState } from 'react';
import BarChart from '@/components/charts/BarChart';
import BrazilMapChart from '@/components/charts/BrazilMapChart';
import DonutChart from '@/components/charts/DonutChart';
import RegisteredAircraftTable from '@/components/RegisteredAircraftTable';
import type {
  AircraftConsolidatedSnapshot,
  ConsolidatedMetrics,
  DistributionItem,
  IncidentCount,
  SearchMode,
} from '@/types/aircraft';

type AircraftConsolidatedProps = {
  snapshot: AircraftConsolidatedSnapshot | null;
  viewMode: SearchMode;
};

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function IncidentSummarySection({ title, metrics }: { title: string; metrics: ConsolidatedMetrics }) {
  const counts = metrics.ocorrencias.totais_por_classificacao.filter((item) => item.classificacao !== 'INCIDENTE');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {counts.map((item: IncidentCount) => (
          <article key={item.classificacao} className="rounded-md border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
            <p className="text-xs text-slate-500">{item.classificacao}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(item.total)}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relato por UF</p>
          <BarChart
            categories={metrics.ocorrencias.relato_por_uf.slice(0, 10).map((item) => item.estado)}
            series={[
              {
                name: 'Ocorrências',
                data: metrics.ocorrencias.relato_por_uf.slice(0, 10).map((item) => item.total),
                color: '#2563eb',
              },
            ]}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relato por tipo</p>
          <BarChart
            categories={metrics.ocorrencias.relato_por_tipo.slice(0, 10).map((item) => item.label)}
            series={[
              {
                name: 'Ocorrências',
                data: metrics.ocorrencias.relato_por_tipo.slice(0, 10).map((item) => item.total),
                color: '#4f46e5',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function ModelAccidentTable({ rows }: { rows: AircraftConsolidatedSnapshot['ocorrencias_detalhes_modelo'] }) {
  const [filter, setFilter] = useState('');
  const filtered = rows
    .filter((row) => row.classificacao?.toUpperCase() !== 'INCIDENTE')
    .filter((row) => JSON.stringify(row).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Acidentes reportados do modelo</p>
        <input className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Filtrar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="mt-3 max-h-80 overflow-auto">
        <table className="min-w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Matrícula</th>
              <th className="px-3 py-2">Classificação</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Localidade</th>
              <th className="px-3 py-2">UF</th>
              <th className="px-3 py-2">Aeródromo</th>
              <th className="px-3 py-2">Operação</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={`${row.marca}-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-2">{row.data || '-'}</td>
                <td className="px-3 py-2">{row.marca || '-'}</td>
                <td className="px-3 py-2">{row.classificacao || '-'}</td>
                <td className="px-3 py-2">{row.tipo || '-'}</td>
                <td className="px-3 py-2">{row.localidade || '-'}</td>
                <td className="px-3 py-2">{row.uf || '-'}</td>
                <td className="px-3 py-2">{row.aerodromo || '-'}</td>
                <td className="px-3 py-2">{row.operacao || '-'}</td>
                <td className="px-3 py-2">{row.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function mapDistributionToDonutData(data: DistributionItem[]) {
  return data.slice(0, 10).map((item) => ({ label: item.label, value: item.total }));
}

function ManufacturerSection({ snapshot }: { snapshot: AircraftConsolidatedSnapshot }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900">Consolidado do fabricante: {snapshot.fabricante}</h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <DonutChart title="Distribuição por modelo" data={mapDistributionToDonutData(snapshot.fabricante_consolidado.distribuicao_modelo)} centerLabel="Modelos" />
        <DonutChart title="Distribuição por ano" data={mapDistributionToDonutData(snapshot.fabricante_consolidado.distribuicao_ano)} centerLabel="Anos" />
      </div>
      <div className="mt-3">
        <BrazilMapChart title="Mapa do Brasil por estado" data={snapshot.fabricante_consolidado.mapa_brasil.por_estado} />
      </div>
      <div className="mt-3">
        <IncidentSummarySection title="Ocorrências consolidadas por fabricante" metrics={snapshot.fabricante_consolidado} />
      </div>
    </div>
  );
}

function ModelSection({ snapshot }: { snapshot: AircraftConsolidatedSnapshot }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900">Consolidado do modelo: {snapshot.modelo}</h3>
      <div className="mt-3">
        <DonutChart title="Distribuição por ano" data={mapDistributionToDonutData(snapshot.modelo_consolidado.distribuicao_ano)} centerLabel="Anos" />
      </div>
      <div className="mt-3">
        <RegisteredAircraftTable title="Aeronaves do modelo registradas atualmente" rows={snapshot.modelo_consolidado.aeronaves_registradas_detalhes} />
      </div>
      <div className="mt-3">
        <BrazilMapChart title="Mapa do Brasil por estado" data={snapshot.modelo_consolidado.mapa_brasil.por_estado} />
      </div>
      <div className="mt-3">
        <IncidentSummarySection title="Ocorrências consolidadas por modelo" metrics={snapshot.modelo_consolidado} />
      </div>
      <div className="mt-3">
        <ModelAccidentTable rows={snapshot.ocorrencias_detalhes_modelo} />
      </div>
    </div>
  );
}

export default function AircraftConsolidated({ snapshot, viewMode }: AircraftConsolidatedProps) {
  if (!snapshot) return null;

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Consolidado</h2>
      <div className="mt-4 space-y-6">
        {(viewMode === 'matricula' || viewMode === 'fabricante') && <ManufacturerSection snapshot={snapshot} />}
        {(viewMode === 'matricula' || viewMode === 'modelo') && <ModelSection snapshot={snapshot} />}
      </div>
    </section>
  );
}
