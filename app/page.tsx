'use client';

import { useMemo, useState } from 'react';
import AircraftHistory from '@/components/AircraftHistory';
import AircraftRabDetails from '@/components/AircraftRabDetails';
import AircraftSearch from '@/components/AircraftSearch';
import AircraftTransactions from '@/components/AircraftTransactions';
import { getSupabaseClient } from '@/lib/supabase';
import type { AircraftRabSnapshot, AircraftRecord } from '@/types/aircraft';
import { detectTransactions } from '@/utils/detectTransactions';

export default function HomePage() {
  const [records, setRecords] = useState<AircraftRecord[]>([]);
  const [aircraftSnapshot, setAircraftSnapshot] = useState<AircraftRabSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const transactions = useMemo(() => detectTransactions(records), [records]);

  const handleSearch = async (marca: string) => {
    setHasSearched(true);
    setErrorMessage('');

    if (!marca) {
      setRecords([]);
      setAircraftSnapshot(null);
      setErrorMessage('Informe uma matrícula para buscar.');
      return;
    }

    setIsLoading(true);

    const [detailsResponse, historicalResponse] = await Promise.all([
      fetch(`/api/aircraft/${encodeURIComponent(marca)}`, { cache: 'no-store' }),
      (async () => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          return { data: null as AircraftRecord[] | null, error: null };
        }

        const tableName = process.env.NEXT_PUBLIC_AIRCRAFT_TABLE_NAME;
        if (!tableName) {
          return { data: null as AircraftRecord[] | null, error: null };
        }

        const { data, error } = await supabase
          .from(tableName)
          .select('data_registro, marca, proprietario, operador')
          .eq('marca', marca)
          .order('data_registro', { ascending: true });

        return { data: (data as AircraftRecord[]) ?? [], error };
      })(),
    ]);

    setIsLoading(false);

    if (!detailsResponse.ok) {
      setRecords([]);
      setAircraftSnapshot(null);
      setErrorMessage('Não foi possível consultar os dados detalhados no momento. Tente novamente em instantes.');
      return;
    }

    const detailsData = (await detailsResponse.json()) as AircraftRabSnapshot;
    setAircraftSnapshot(detailsData);

    if (historicalResponse.error) {
      setRecords([]);
      setErrorMessage('Dados atuais carregados, mas não foi possível consultar o histórico de negociações agora.');
      return;
    }

    setRecords(historicalResponse.data ?? []);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossiê de Aeronaves</h1>
      <p className="mt-3 text-sm text-slate-600">Consulte dados atuais da base interna e negociações passadas por matrícula.</p>

      <div className="mt-8 w-full max-w-xl">
        <AircraftSearch isLoading={isLoading} onSearch={handleSearch} />
      </div>

      {errorMessage && (
        <div className="mt-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      )}

      {hasSearched && !errorMessage && aircraftSnapshot && (
        <>
          <AircraftRabDetails snapshot={aircraftSnapshot} />
          <AircraftTransactions transactions={transactions} />
          <AircraftHistory records={records} />
        </>
      )}
    </main>
  );
}
