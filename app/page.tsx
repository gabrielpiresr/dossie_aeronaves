'use client';

import { useMemo, useState } from 'react';
import AircraftHistory from '@/components/AircraftHistory';
import AircraftSearch from '@/components/AircraftSearch';
import AircraftTransactions from '@/components/AircraftTransactions';
import { supabase } from '@/lib/supabase';
import type { AircraftRecord } from '@/types/aircraft';
import { detectTransactions } from '@/utils/detectTransactions';

export default function HomePage() {
  const [records, setRecords] = useState<AircraftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const transactions = useMemo(() => detectTransactions(records), [records]);

  const handleSearch = async (marca: string) => {
    setHasSearched(true);
    setErrorMessage('');

    if (!marca) {
      setRecords([]);
      setErrorMessage('Informe uma matrícula para buscar.');
      return;
    }

    const tableName = process.env.NEXT_PUBLIC_AIRCRAFT_TABLE_NAME;
    if (!tableName) {
      setRecords([]);
      setErrorMessage('Configure NEXT_PUBLIC_AIRCRAFT_TABLE_NAME para realizar a busca.');
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from(tableName)
      .select('data_registro, marca, proprietario, operador')
      .eq('marca', marca)
      .order('data_registro', { ascending: true });

    setIsLoading(false);

    if (error) {
      setRecords([]);
      setErrorMessage('Não foi possível buscar o histórico agora. Tente novamente em instantes.');
      return;
    }

    setRecords((data as AircraftRecord[]) ?? []);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Histórico de Aeronaves</h1>
      <p className="mt-3 text-sm text-slate-600">Digite uma matrícula para iniciar a consulta.</p>

      <div className="mt-8 w-full max-w-xl">
        <AircraftSearch isLoading={isLoading} onSearch={handleSearch} />
      </div>

      {errorMessage && (
        <div className="mt-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      )}

      {hasSearched && !errorMessage && <AircraftHistory records={records} />}

      {hasSearched && !errorMessage && records.length > 0 && <AircraftTransactions transactions={transactions} />}
    </main>
  );
}
