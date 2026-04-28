'use client';

import { useState } from 'react';
import AircraftConsolidated from '@/components/AircraftConsolidated';
import AircraftRabDetails from '@/components/AircraftRabDetails';
import AircraftSearch from '@/components/AircraftSearch';
import AircraftTransactions from '@/components/AircraftTransactions';
import { getSupabaseClient } from '@/lib/supabase';
import type { AircraftConsolidatedSnapshot, AircraftRabSnapshot, DetectedTransaction, SearchMode } from '@/types/aircraft';

export default function HomePage() {
  const [transactions, setTransactions] = useState<DetectedTransaction[]>([]);
  const [aircraftSnapshot, setAircraftSnapshot] = useState<AircraftRabSnapshot | null>(null);
  const [consolidatedSnapshot, setConsolidatedSnapshot] = useState<AircraftConsolidatedSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async (term: string, mode: SearchMode) => {
    setHasSearched(true);
    setErrorMessage('');
    setTransactions([]);

    if (!term) {
      setAircraftSnapshot(null);
      setConsolidatedSnapshot(null);
      setErrorMessage('Informe um valor para buscar.');
      return;
    }

    setIsLoading(true);

    if (mode === 'matricula') {
      const [detailsResponse, consolidatedResponse] = await Promise.all([
        fetch(`/api/aircraft/${encodeURIComponent(term)}`, { cache: 'no-store' }),
        fetch(`/api/aircraft/${encodeURIComponent(term)}/consolidated`, { cache: 'no-store' }),
      ]);

      if (!detailsResponse.ok) {
        setIsLoading(false);
        setAircraftSnapshot(null);
        setConsolidatedSnapshot(null);
        setErrorMessage('Não foi possível consultar os dados detalhados no momento.');
        return;
      }

      const detailsData = (await detailsResponse.json()) as AircraftRabSnapshot;
      setAircraftSnapshot(detailsData);

      if (consolidatedResponse.ok) {
        const consolidatedData = (await consolidatedResponse.json()) as AircraftConsolidatedSnapshot;
        setConsolidatedSnapshot(consolidatedData);
      } else {
        setConsolidatedSnapshot(null);
      }

      const supabase = getSupabaseClient();
      const tableName = process.env.NEXT_PUBLIC_AIRCRAFT_TRANSACTIONS_TABLE_NAME ?? 'history_transactions_cache';

      if (supabase) {
        const { data } = await supabase
          .from(tableName)
          .select('marca, data_anterior, data_nova, proprietario_anterior, proprietario_novo, operador')
          .eq('marca', term)
          .order('data_nova', { ascending: false });

        setTransactions(((data as DetectedTransaction[] | null) ?? []).map((item) => ({ ...item, marca: term })));
      }
    } else {
      setAircraftSnapshot(null);
      setConsolidatedSnapshot(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoading(false);
        setErrorMessage('Integração com base indisponível para este tipo de busca.');
        return;
      }

      const detailsTable = process.env.NEXT_PUBLIC_AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';
      const transactionsTable = process.env.NEXT_PUBLIC_AIRCRAFT_TRANSACTIONS_TABLE_NAME ?? 'history_transactions_cache';

      const baseQuery = supabase.from(detailsTable).select('marcas, ds_modelo, nm_fabricante').limit(2000);
      const { data: detailsRows } = await (mode === 'modelo'
        ? baseQuery.ilike('ds_modelo', `%${term}%`)
        : baseQuery.ilike('nm_fabricante', `%${term}%`));
      const marcas = Array.from(new Set(((detailsRows as Array<{ marcas: string }> | null) ?? []).map((row) => row.marcas)));

      if (marcas.length === 0) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      const { data: txRows } = await supabase
        .from(transactionsTable)
        .select('marca, data_anterior, data_nova, proprietario_anterior, proprietario_novo, operador')
        .in('marca', marcas)
        .order('data_nova', { ascending: false })
        .limit(5000);

      const meta = new Map(
        ((detailsRows as Array<{ marcas: string; ds_modelo: string | null; nm_fabricante: string | null }> | null) ?? []).map((row) => [
          row.marcas,
          { modelo: row.ds_modelo ?? '-', fabricante: row.nm_fabricante ?? '-' },
        ]),
      );

      setTransactions(
        ((txRows as DetectedTransaction[] | null) ?? []).map((item) => ({
          ...item,
          marca: item.marca,
          modelo: meta.get(item.marca ?? '')?.modelo ?? '-',
          fabricante: meta.get(item.marca ?? '')?.fabricante ?? '-',
        })),
      );
    }

    setIsLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossiê de Aeronaves</h1>
      <p className="mt-3 text-sm text-slate-600">Consulte por matrícula, modelo ou fabricante.</p>

      <div className="mt-8 w-full max-w-3xl">
        <AircraftSearch isLoading={isLoading} onSearch={handleSearch} />
      </div>

      {errorMessage && (
        <div className="mt-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      )}

      {hasSearched && !errorMessage && (
        <>
          <AircraftRabDetails snapshot={aircraftSnapshot} />
          <AircraftConsolidated snapshot={consolidatedSnapshot} />
          <AircraftTransactions transactions={transactions} />
        </>
      )}
    </main>
  );
}
