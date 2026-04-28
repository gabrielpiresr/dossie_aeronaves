'use client';

import { useMemo, useState } from 'react';
import type { AircraftConsolidatedSnapshot, ConsolidatedMetrics, DistributionItem, IncidentCount, IncidentDetail, RegisteredAircraftRow } from '@/types/aircraft';

type AircraftConsolidatedProps = {
  snapshot: AircraftConsolidatedSnapshot | null;
};

type SortDir = 'asc' | 'desc';

type BrazilTile = { estado: string; top: number; left: number };

const COLORS = ['#0f766e', '#0284c7', '#7c3aed', '#ea580c', '#16a34a', '#be123c', '#334155', '#ca8a04'];

const BRAZIL_TILE_MAP: BrazilTile[] = [
  { estado: 'RR', top: 4, left: 29 }, { estado: 'AP', top: 9, left: 49 }, { estado: 'AM', top: 15, left: 23 }, { estado: 'PA', top: 18, left: 44 },
  { estado: 'AC', top: 25, left: 7 }, { estado: 'RO', top: 28, left: 17 }, { estado: 'TO', top: 34, left: 47 }, { estado: 'MA', top: 32, left: 58 },
  { estado: 'PI', top: 37, left: 64 }, { estado: 'CE', top: 37, left: 72 }, { estado: 'RN', top: 35, left: 81 }, { estado: 'PB', top: 39, left: 82 },
  { estado: 'PE', top: 43, left: 79 }, { estado: 'AL', top: 46, left: 79 }, { estado: 'SE', top: 49, left: 77 }, { estado: 'BA', top: 49, left: 66 },
  { estado: 'MT', top: 41, left: 35 }, { estado: 'GO', top: 49, left: 48 }, { estado: 'DF', top: 52, left: 52 }, { estado: 'MS', top: 56, left: 34 },
  { estado: 'MG', top: 59, left: 58 }, { estado: 'ES', top: 63, left: 68 }, { estado: 'RJ', top: 68, left: 65 }, { estado: 'SP', top: 69, left: 56 },
  { estado: 'PR', top: 77, left: 52 }, { estado: 'SC', top: 83, left: 53 }, { estado: 'RS', top: 90, left: 48 },
];

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function heatColor(value: number, max: number) {
  if (value <= 0 || max <= 0) return '#e2e8f0';
  const intensity = value / max;
  if (intensity > 0.75) return '#0c4a6e';
  if (intensity > 0.5) return '#0369a1';
  if (intensity > 0.3) return '#0ea5e9';
  return '#7dd3fc';
}

function DonutChart({ title, data }: { title: string; data: DistributionItem[] }) {
  if (data.length === 0) return null;
  const total = data.reduce((acc, item) => acc + item.total, 0);
  const gradient = data.slice(0, 10).reduce<{ stops: string[]; progress: number }>((acc, item, index) => {
    const pct = (item.total / total) * 100;
    acc.stops.push(`${COLORS[index % COLORS.length]} ${acc.progress}% ${acc.progress + pct}%`);
    acc.progress += pct;
    return acc;
  }, { stops: [], progress: 0 }).stops.join(', ');

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3 flex gap-4">
        <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
        <ul className="space-y-1 text-xs text-slate-700">
          {data.slice(0, 10).map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {item.label}: {formatNumber(item.total)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SortableTable<T extends Record<string, unknown>>({ title, rows, columns }: { title: string; rows: T[]; columns: Array<{ key: keyof T; label: string }> }) {
  const [sortBy, setSortBy] = useState<keyof T>(columns[0].key);
  const [dir, setDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');

  const filteredRows = useMemo(() => {
    const base = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(filter.toLowerCase()));
    return [...base].sort((a, b) => {
      const av = String(a[sortBy] ?? '');
      const bv = String(b[sortBy] ?? '');
      const result = av.localeCompare(bv, 'pt-BR', { numeric: true });
      return dir === 'asc' ? result : -result;
    });
  }, [rows, filter, sortBy, dir]);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <input className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Filtrar..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      <div className="mt-3 max-h-80 overflow-auto">
        <table className="min-w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="cursor-pointer px-3 py-2" onClick={() => {
                  if (sortBy === column.key) setDir(dir === 'asc' ? 'desc' : 'asc');
                  else {
                    setSortBy(column.key);
                    setDir('asc');
                  }
                }}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {columns.map((column) => <td key={String(column.key)} className="px-3 py-2">{String(row[column.key] ?? '-')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrazilMapInfographic({ metrics }: { metrics: ConsolidatedMetrics }) {
  const stateMap = useMemo(() => new Map(metrics.mapa_brasil.por_estado.map((item) => [item.estado, item.total])), [metrics.mapa_brasil.por_estado]);
  const maxValue = Math.max(...metrics.mapa_brasil.por_estado.map((item) => item.total), 0);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">Mapa do Brasil por estado</h4>
      <p className="mt-1 text-xs text-slate-500">Heatmap melhorado com legenda e intensidade por estado.</p>
      <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
        <div className="relative mx-auto h-80 w-full max-w-xs rounded-md bg-white">
          {BRAZIL_TILE_MAP.map((tile) => {
            const total = stateMap.get(tile.estado) ?? 0;
            return (
              <div
                key={tile.estado}
                className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded text-[10px] font-semibold text-slate-800"
                style={{ top: `${tile.top}%`, left: `${tile.left}%`, backgroundColor: heatColor(total, maxValue) }}
                title={`${tile.estado}: ${formatNumber(total)} aeronaves`}
              >
                {tile.estado}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function IncidentCountCards({ counts }: { counts: IncidentCount[] }) {
  const filtered = counts.filter((item) => item.classificacao !== 'INCIDENTE');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.map((item) => (
        <article key={item.classificacao} className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">{item.classificacao}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(item.total)}</p>
        </article>
      ))}
    </div>
  );
}

export default function AircraftConsolidated({ snapshot }: AircraftConsolidatedProps) {
  if (!snapshot) return null;

  const registeredColumns: Array<{ key: keyof RegisteredAircraftRow; label: string }> = [
    { key: 'marca', label: 'Matrícula' }, { key: 'fabricante', label: 'Fabricante' }, { key: 'modelo', label: 'Modelo' }, { key: 'ano_fabricacao', label: 'Ano' },
    { key: 'tipo_icao', label: 'Tipo ICAO' }, { key: 'categoria', label: 'Categoria' }, { key: 'tipo_motor', label: 'Motor' }, { key: 'quantidade_motores', label: 'Qt Motores' }, { key: 'estado_operacao', label: 'UF' },
  ];

  const incidentColumns: Array<{ key: keyof IncidentDetail; label: string }> = [
    { key: 'data', label: 'Data' }, { key: 'marca', label: 'Matrícula' }, { key: 'classificacao', label: 'Classificação' }, { key: 'tipo', label: 'Tipo' },
    { key: 'localidade', label: 'Localidade' }, { key: 'uf', label: 'UF' }, { key: 'aerodromo', label: 'Aeródromo' }, { key: 'operacao', label: 'Operação' }, { key: 'status', label: 'Status' },
  ];

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Consolidado de Fabricante e Modelo</h2>
      <div className="mt-4 space-y-6">
        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">Ocorrências da aeronave consultada</h3>
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${snapshot.aeronave_consultada_ocorrencias.possui_historico ? 'border-amber-700 bg-amber-800/90 text-amber-50' : 'border-green-200 bg-green-50 text-green-800'}`}>
            {snapshot.aeronave_consultada_ocorrencias.possui_historico ? 'AERONAVE COM HISTÓRICO DE ACIDENTE' : 'AERONAVE SEM HISTÓRICO DE ACIDENTE'}
          </div>
          <div className="mt-3"><IncidentCountCards counts={snapshot.aeronave_consultada_ocorrencias.totais_por_classificacao} /></div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">Fabricante: {snapshot.fabricante}</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <DonutChart title="Distribuição por modelo" data={snapshot.fabricante_consolidado.distribuicao_modelo} />
            <DonutChart title="Distribuição por ano" data={snapshot.fabricante_consolidado.distribuicao_ano} />
          </div>
          <div className="mt-3"><BrazilMapInfographic metrics={snapshot.fabricante_consolidado} /></div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h3 className="text-base font-semibold text-slate-900">Modelo: {snapshot.modelo}</h3>
          <div className="mt-3"><SortableTable title="Aeronaves do modelo registradas atualmente" rows={snapshot.modelo_consolidado.aeronaves_registradas_detalhes} columns={registeredColumns} /></div>
          <div className="mt-3"><SortableTable title="Acidentes reportados do modelo" rows={snapshot.ocorrencias_detalhes_modelo.filter((item) => item.classificacao?.toUpperCase() !== 'INCIDENTE')} columns={incidentColumns} /></div>
          <div className="mt-3"><BrazilMapInfographic metrics={snapshot.modelo_consolidado} /></div>
        </div>
      </div>
    </section>
  );
}
