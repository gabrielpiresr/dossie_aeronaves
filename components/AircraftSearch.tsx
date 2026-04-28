'use client';

import { FormEvent, useState } from 'react';
import type { SearchMode } from '@/types/aircraft';

type AircraftSearchProps = {
  isLoading: boolean;
  onSearch: (term: string, mode: SearchMode) => void;
};

export default function AircraftSearch({ isLoading, onSearch }: AircraftSearchProps) {
  const [term, setTerm] = useState('');
  const [mode, setMode] = useState<SearchMode>('matricula');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(term.trim().toUpperCase(), mode);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-3xl flex-col gap-3 md:flex-row">
      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as SearchMode)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-slate-400 transition focus:ring-2"
      >
        <option value="matricula">Matrícula</option>
        <option value="modelo">Modelo</option>
        <option value="fabricante">Fabricante</option>
      </select>
      <input
        type="text"
        placeholder={mode === 'matricula' ? 'Ex.: PR-ABC' : mode === 'modelo' ? 'Ex.: CESSNA 172' : 'Ex.: EMBRAER'}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm outline-none ring-slate-400 transition focus:ring-2"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {isLoading ? 'Buscando...' : 'Buscar'}
      </button>
    </form>
  );
}
