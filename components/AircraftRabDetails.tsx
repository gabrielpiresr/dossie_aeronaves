'use client';

import { useMemo, useState } from 'react';
import type { AircraftRabSnapshot } from '@/types/aircraft';

type AircraftRabDetailsProps = {
  snapshot: AircraftRabSnapshot | null;
};

type OwnershipRow = {
  nome: string;
  documento: string;
  percentual: string;
  uf: string;
};

function parseOwnership(value: string) {
  const chunks = value.split('|').map((item) => item.trim()).filter(Boolean);
  const rows: OwnershipRow[] = [];

  for (let i = 0; i < chunks.length; i += 4) {
    rows.push({
      nome: chunks[i] ?? '-',
      documento: chunks[i + 1] ?? '-',
      percentual: chunks[i + 2] ?? '-',
      uf: chunks[i + 3] ?? '-',
    });
  }

  return rows;
}

export default function AircraftRabDetails({ snapshot }: AircraftRabDetailsProps) {
  const [activeTab, setActiveTab] = useState<'gerais' | 'proprietarios' | 'operadores' | 'tecnicos'>('gerais');

  const grouped = useMemo(() => {
    if (!snapshot) {
      return { proprietarios: [], operadores: [], gerais: [], tecnicos: [] };
    }

    const proprietariosField = snapshot.campos.find((field) => field.label === 'Proprietários');
    const operadoresField = snapshot.campos.find((field) => field.label === 'Operadores');

    return {
      proprietarios: proprietariosField ? parseOwnership(proprietariosField.value) : [],
      operadores: operadoresField ? parseOwnership(operadoresField.value) : [],
      gerais: snapshot.campos.filter((field) => !['Proprietários', 'Operadores'].includes(field.label)).slice(0, 8),
      tecnicos: snapshot.campos.filter((field) => !['Proprietários', 'Operadores'].includes(field.label)).slice(8),
    };
  }, [snapshot]);

  if (!snapshot) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Dados atuais da base interna</h2>
        {snapshot.consulta_realizada_em && (
          <p className="text-xs text-slate-500">Consulta realizada em: {snapshot.consulta_realizada_em}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveTab('gerais')} className={`rounded px-3 py-1 text-sm ${activeTab === 'gerais' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Dados gerais</button>
        <button onClick={() => setActiveTab('proprietarios')} className={`rounded px-3 py-1 text-sm ${activeTab === 'proprietarios' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Proprietários</button>
        <button onClick={() => setActiveTab('operadores')} className={`rounded px-3 py-1 text-sm ${activeTab === 'operadores' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Operadores</button>
        <button onClick={() => setActiveTab('tecnicos')} className={`rounded px-3 py-1 text-sm ${activeTab === 'tecnicos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Detalhes técnicos</button>
      </div>

      {activeTab === 'gerais' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {grouped.gerais.map((field, index) => (
            <div key={`${field.label}-${index}`} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
              <p className="mt-1 text-sm text-slate-900">{field.value}</p>
            </div>
          ))}
        </div>
      )}

      {(activeTab === 'proprietarios' || activeTab === 'operadores') && (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">UF</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'proprietarios' ? grouped.proprietarios : grouped.operadores).map((row, index) => (
                <tr key={`${row.nome}-${index}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.nome}</td>
                  <td className="px-3 py-2">{row.documento}</td>
                  <td className="px-3 py-2">{row.percentual}</td>
                  <td className="px-3 py-2">{row.uf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'tecnicos' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {grouped.tecnicos.map((field, index) => (
            <div key={`${field.label}-${index}`} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
              <p className="mt-1 text-sm text-slate-900">{field.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
