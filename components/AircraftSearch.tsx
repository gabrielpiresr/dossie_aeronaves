'use client';

import { FormEvent, useState } from 'react';

type AircraftSearchProps = {
  isLoading: boolean;
  onSearch: (registration: string) => void;
};

export default function AircraftSearch({ isLoading, onSearch }: AircraftSearchProps) {
  const [registration, setRegistration] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(registration.trim().toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-3">
      <input
        type="text"
        placeholder="Ex.: PR-ABC"
        value={registration}
        onChange={(event) => setRegistration(event.target.value)}
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
