'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import AircraftConsolidated from '@/components/AircraftConsolidated';
import AircraftCurrentAircraftOccurrences from '@/components/AircraftCurrentAircraftOccurrences';
import AircraftOperatorFleet from '@/components/AircraftOperatorFleet';
import AircraftPhotos from '@/components/AircraftPhotos';
import AircraftRabDetails from '@/components/AircraftRabDetails';
import AircraftSearch from '@/components/AircraftSearch';
import AircraftTransactions from '@/components/AircraftTransactions';
import { getSupabaseClient } from '@/lib/supabase';
import type {
  AircraftConsolidatedSnapshot,
  AircraftPhotoSnapshot,
  AircraftRabSnapshot,
  DetectedTransaction,
  SearchMode,
} from '@/types/aircraft';

export default function HomePage() {
  const [transactions, setTransactions] = useState<DetectedTransaction[]>([]);
  const [aircraftSnapshot, setAircraftSnapshot] = useState<AircraftRabSnapshot | null>(null);
  const [consolidatedSnapshot, setConsolidatedSnapshot] = useState<AircraftConsolidatedSnapshot | null>(null);
  const [photoSnapshot, setPhotoSnapshot] = useState<AircraftPhotoSnapshot | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('matricula');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = useCallback(async (term: string, mode: SearchMode) => {
    setHasSearched(true);
    setSearchMode(mode);
    setErrorMessage('');
    setTransactions([]);
    setPhotoSnapshot(null);

    if (!term) {
      setAircraftSnapshot(null);
      setConsolidatedSnapshot(null);
      setPhotoSnapshot(null);
      setErrorMessage('Informe um valor para buscar.');
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (mode === 'matricula') {
      const [detailsResponse, consolidatedResponse] = await Promise.all([
        fetch(`/api/aircraft/${encodeURIComponent(term)}`, { cache: 'no-store' }),
        fetch(`/api/aircraft/${encodeURIComponent(term)}/consolidated`, { cache: 'no-store' }),
      ]);

      if (!detailsResponse.ok) {
        setIsLoading(false);
        setAircraftSnapshot(null);
        setConsolidatedSnapshot(null);
        setPhotoSnapshot(null);
        setErrorMessage('Não foi possível consultar os dados detalhados no momento.');
        return;
      }

      const detailsSnapshot = (await detailsResponse.json()) as AircraftRabSnapshot;
      setAircraftSnapshot(detailsSnapshot);
      setConsolidatedSnapshot(consolidatedResponse.ok ? ((await consolidatedResponse.json()) as AircraftConsolidatedSnapshot) : null);
      const modelField = detailsSnapshot.campos.find((field) => field.label === 'Modelo')?.value ?? '';
      const photosResponse = await fetch(
        `/api/aircraft/${encodeURIComponent(term)}/photos?model=${encodeURIComponent(modelField)}`,
        { cache: 'no-store' },
      );
      setPhotoSnapshot(photosResponse.ok ? ((await photosResponse.json()) as AircraftPhotoSnapshot) : null);

      if (supabase) {
        const tableName = process.env.NEXT_PUBLIC_AIRCRAFT_TRANSACTIONS_TABLE_NAME ?? 'history_transactions_cache';
        const { data } = await supabase
          .from(tableName)
          .select('marca, data_anterior, data_nova, proprietario_anterior, proprietario_novo, operador')
          .eq('marca', term)
          .order('data_nova', { ascending: false });

        setTransactions(((data as DetectedTransaction[] | null) ?? []).map((item) => ({ ...item, marca: term })));
      }

      setIsLoading(false);
      return;
    }

    setAircraftSnapshot(null);
    setPhotoSnapshot(null);
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

    const typedRows = (detailsRows as Array<{ marcas: string; ds_modelo: string | null; nm_fabricante: string | null }> | null) ?? [];
    const marcas = Array.from(new Set(typedRows.map((row) => row.marcas)));

    if (marcas.length === 0) {
      setTransactions([]);
      setConsolidatedSnapshot(null);
      setIsLoading(false);
      return;
    }

    const consolidatedResponse = await fetch(`/api/aircraft/${encodeURIComponent(marcas[0])}/consolidated`, { cache: 'no-store' });
    setConsolidatedSnapshot(consolidatedResponse.ok ? ((await consolidatedResponse.json()) as AircraftConsolidatedSnapshot) : null);

    const { data: txRows } = await supabase
      .from(transactionsTable)
      .select('marca, data_anterior, data_nova, proprietario_anterior, proprietario_novo, operador')
      .in('marca', marcas)
      .order('data_nova', { ascending: false })
      .limit(5000);

    const meta = new Map(typedRows.map((row) => [row.marcas, { modelo: row.ds_modelo ?? '-', fabricante: row.nm_fabricante ?? '-' }]));

    setTransactions(
      ((txRows as DetectedTransaction[] | null) ?? []).map((item) => ({
        ...item,
        marca: item.marca,
        modelo: meta.get(item.marca ?? '')?.modelo ?? '-',
        fabricante: meta.get(item.marca ?? '')?.fabricante ?? '-',
      })),
    );

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const term = params.get('term');
    const mode = params.get('mode') as SearchMode | null;
    if (term && mode && ['matricula', 'modelo', 'fabricante'].includes(mode)) {
      const timer = window.setTimeout(() => {
        void handleSearch(term, mode);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [handleSearch]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossiê de Aeronaves</h1>
      <p className="mt-3 text-sm text-slate-600">Consulte por matrícula, modelo ou fabricante.</p>

      <div className="mt-8 w-full max-w-3xl">
        <AircraftSearch isLoading={isLoading} onSearch={handleSearch} />
      </div>

      {errorMessage && <div className="mt-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      {hasSearched && !errorMessage && (
        <>
          <AircraftRabDetails snapshot={aircraftSnapshot} />
          <AircraftPhotos snapshot={photoSnapshot} isLoading={isLoading} />
          <AircraftCurrentAircraftOccurrences snapshot={consolidatedSnapshot} />
          <AircraftTransactions transactions={transactions} isLoading={isLoading} />
          <AircraftOperatorFleet snapshot={consolidatedSnapshot} />
          <AircraftConsolidated snapshot={consolidatedSnapshot} viewMode={searchMode} />
        </>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white/95 px-8 py-6 shadow-xl">
            <Image
              src="https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif"
              alt="Carregando"
              className="h-16 w-16"
              width={64}
              height={64}
              unoptimized
            />
            <p className="text-sm font-medium text-slate-700">Carregando dados...</p>
          </div>
        </div>
      )}
    </main>
  );
}
