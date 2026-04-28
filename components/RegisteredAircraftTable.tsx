'use client';

import { useMemo, useState } from 'react';
import type { RegisteredAircraftRow } from '@/types/aircraft';

type SortDir = 'asc' | 'desc';

type RegisteredAircraftTableProps = {
  rows: RegisteredAircraftRow[];
  title: string;
  emptyMessage?: string;
};

export default function RegisteredAircraftTable({ rows, title, emptyMessage = 'Nenhum registro encontrado.' }: RegisteredAircraftTableProps) {
  const [sortBy, setSortBy] = useState<keyof RegisteredAircraftRow>('marca');
  const [dir, setDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');

  const columns: Array<{ key: keyof RegisteredAircraftRow; label: string }> = [
    { key: 'marca', label: 'Matrícula' },
    { key: 'fabricante', label: 'Fabricante' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'ano_fabricacao', label: 'Ano' },
    { key: 'tipo_icao', label: 'Tipo ICAO' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'tipo_motor', label: 'Motor' },
    { key: 'quantidade_motores', label: 'Qt Motores' },
    { key: 'estado_operacao', label: 'UF' },
  ];

  const filteredRows = useMemo(() => {
    const base = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(filter.toLowerCase()));
    return [...base].sort((a, b) => {
      const result = String(a[sortBy]).localeCompare(String(b[sortBy]), 'pt-BR', { numeric: true });
      return dir === 'asc' ? result : -result;
    });
  }, [rows, filter, sortBy, dir]);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <input className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Filtrar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="mt-3 max-h-80 overflow-auto">
        <table className="min-w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="cursor-pointer px-3 py-2"
                  onClick={() => {
                    if (sortBy === column.key) setDir(dir === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy(column.key);
                      setDir('asc');
                    }
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={`${row.marca}-${row.modelo}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <a className="text-sky-700 underline" href={`/?mode=matricula&term=${encodeURIComponent(row.marca)}`} target="_blank" rel="noreferrer">
                      {row.marca}
                    </a>
                  </td>
                  <td className="px-3 py-2">{row.fabricante}</td>
                  <td className="px-3 py-2">{row.modelo}</td>
                  <td className="px-3 py-2">{row.ano_fabricacao}</td>
                  <td className="px-3 py-2">{row.tipo_icao}</td>
                  <td className="px-3 py-2">{row.categoria}</td>
                  <td className="px-3 py-2">{row.tipo_motor}</td>
                  <td className="px-3 py-2">{row.quantidade_motores}</td>
                  <td className="px-3 py-2">{row.estado_operacao}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
