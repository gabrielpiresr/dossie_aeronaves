import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { AircraftConsolidatedSnapshot, DistributionItem, RegionDistributionItem, StateDistributionItem } from '@/types/aircraft';

const DETAIL_TABLE_NAME = process.env.AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';
const TRANSACTIONS_TABLE_NAME = process.env.HISTORY_TRANSACTIONS_CACHE_TABLE_NAME ?? 'history_transactions_cache';
const START_YEAR = 2017;

const REGION_BY_STATE: Record<string, string> = {
  AC: 'Norte',
  AL: 'Nordeste',
  AP: 'Norte',
  AM: 'Norte',
  BA: 'Nordeste',
  CE: 'Nordeste',
  DF: 'Centro-Oeste',
  ES: 'Sudeste',
  GO: 'Centro-Oeste',
  MA: 'Nordeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  MG: 'Sudeste',
  PA: 'Norte',
  PB: 'Nordeste',
  PR: 'Sul',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RJ: 'Sudeste',
  RN: 'Nordeste',
  RS: 'Sul',
  RO: 'Norte',
  RR: 'Norte',
  SC: 'Sul',
  SP: 'Sudeste',
  SE: 'Nordeste',
  TO: 'Norte',
};

type DetailedAircraftRow = {
  marcas: string;
  nm_fabricante: string | null;
  ds_modelo: string | null;
  nr_ano_fabricacao: string | null;
  operadores: string | null;
};

type TransactionRow = {
  marca: string;
  data_anterior: string;
  data_nova: string;
};

function normalizeRegistration(registration: string) {
  const normalized = registration.trim().toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');

  if (normalized.includes('-')) {
    return normalized;
  }

  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }

  return normalized;
}

function buildRegistrationCandidates(registration: string) {
  const raw = registration.trim().toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');
  const normalized = normalizeRegistration(registration);
  const withoutHyphen = raw.replace(/-/g, '');

  return Array.from(new Set([raw, normalized, withoutHyphen]));
}

function resolveSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeText(value: string | null) {
  return value?.trim() || null;
}

function normalizeYear(value: string | null) {
  const year = (value ?? '').trim();

  if (!/^\d{4}$/.test(year)) {
    return 'Não informado';
  }

  return year;
}

function parseBrazilStateFromOperator(operator: string | null) {
  const parts = (operator ?? '').split('|').map((item) => item.trim()).filter(Boolean);
  const candidate = parts.at(-1)?.toUpperCase();

  if (!candidate || !REGION_BY_STATE[candidate]) {
    return null;
  }

  return candidate;
}

function dateFromUnknownFormat(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00Z`);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

function buildDistribution(items: string[]): DistributionItem[] {
  const counters = new Map<string, number>();

  items.forEach((item) => {
    counters.set(item, (counters.get(item) ?? 0) + 1);
  });

  return Array.from(counters.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function buildStateAndRegionDistribution(rows: DetailedAircraftRow[]) {
  const stateCount = new Map<string, number>();
  const regionCount = new Map<string, number>();

  rows.forEach((row) => {
    const state = parseBrazilStateFromOperator(row.operadores);
    if (!state) {
      return;
    }

    stateCount.set(state, (stateCount.get(state) ?? 0) + 1);

    const region = REGION_BY_STATE[state];
    regionCount.set(region, (regionCount.get(region) ?? 0) + 1);
  });

  const por_estado: StateDistributionItem[] = Array.from(stateCount.entries())
    .map(([estado, total]) => ({ estado, total, regiao: REGION_BY_STATE[estado] }))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado));

  const por_regiao: RegionDistributionItem[] = Array.from(regionCount.entries())
    .map(([regiao, total]) => ({ regiao, total }))
    .sort((a, b) => b.total - a.total || a.regiao.localeCompare(b.regiao));

  return { por_estado, por_regiao };
}

function calcTransactionMetrics(rows: TransactionRow[]) {
  const sinceDate = new Date(`${START_YEAR}-01-01T00:00:00Z`);
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);

  let totalDesde2017 = 0;
  let ultimos12Meses = 0;
  let totalDiasPermanencia = 0;
  let permanenciaComDados = 0;

  rows.forEach((row) => {
    const nova = dateFromUnknownFormat(row.data_nova);
    const anterior = dateFromUnknownFormat(row.data_anterior);

    if (nova && nova >= sinceDate) {
      totalDesde2017 += 1;

      if (nova >= twelveMonthsAgo && nova <= now) {
        ultimos12Meses += 1;
      }
    }

    if (nova && anterior && nova >= anterior) {
      const diffDays = Math.round((nova.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24));
      totalDiasPermanencia += diffDays;
      permanenciaComDados += 1;
    }
  });

  const anosAnalisados = Math.max(now.getUTCFullYear() - START_YEAR + 1, 1);

  return {
    negociacoes_desde_2017: totalDesde2017,
    media_negociacoes_por_ano_desde_2017: Number((totalDesde2017 / anosAnalisados).toFixed(2)),
    negociacoes_ultimos_12_meses: ultimos12Meses,
    tempo_medio_permanencia_dias:
      permanenciaComDados > 0 ? Number((totalDiasPermanencia / permanenciaComDados).toFixed(2)) : 0,
  };
}

async function fetchTransactionsByMarcas(supabase: ReturnType<typeof createClient>, marcas: string[]) {
  if (marcas.length === 0) {
    return [] as TransactionRow[];
  }

  const CHUNK_SIZE = 300;
  const allRows: TransactionRow[] = [];

  for (let i = 0; i < marcas.length; i += CHUNK_SIZE) {
    const chunk = marcas.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
      .from(TRANSACTIONS_TABLE_NAME)
      .select('marca, data_anterior, data_nova')
      .in('marca', chunk);

    if (error) {
      throw error;
    }

    allRows.push(...((data as TransactionRow[] | null) ?? []));
  }

  return allRows;
}

function buildConsolidation(rows: DetailedAircraftRow[], transactions: TransactionRow[]) {
  return {
    quantidade_aeronaves_registradas: rows.length,
    distribuicao_modelo: buildDistribution(rows.map((row) => normalizeText(row.ds_modelo) ?? 'Não informado')),
    distribuicao_ano: buildDistribution(rows.map((row) => normalizeYear(row.nr_ano_fabricacao))),
    mapa_brasil: buildStateAndRegionDistribution(rows),
    ...calcTransactionMetrics(transactions),
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  const normalizedRegistration = normalizeRegistration(registration);
  const registrationCandidates = buildRegistrationCandidates(registration);

  if (!normalizedRegistration) {
    return NextResponse.json({ error: 'Matrícula inválida.' }, { status: 400 });
  }

  const supabase = resolveSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Integração com base de aeronaves indisponível.' }, { status: 500 });
  }

  const { data: currentAircraft, error: currentError } = await supabase
    .from(DETAIL_TABLE_NAME)
    .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores')
    .in('marcas', registrationCandidates)
    .limit(1)
    .maybeSingle<DetailedAircraftRow>();

  if (currentError) {
    return NextResponse.json({ error: 'Não foi possível consolidar os dados no momento.' }, { status: 502 });
  }

  if (!currentAircraft) {
    return NextResponse.json({ error: 'Aeronave não encontrada na base detalhada.' }, { status: 404 });
  }

  const fabricante = normalizeText(currentAircraft.nm_fabricante);
  const modelo = normalizeText(currentAircraft.ds_modelo);

  if (!fabricante || !modelo) {
    return NextResponse.json(
      { error: 'Dados insuficientes para gerar consolidados de fabricante e modelo desta aeronave.' },
      { status: 422 },
    );
  }

  const [manufacturerRowsResult, modelRowsResult] = await Promise.all([
    supabase
      .from(DETAIL_TABLE_NAME)
      .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores')
      .eq('nm_fabricante', fabricante),
    supabase
      .from(DETAIL_TABLE_NAME)
      .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores')
      .eq('ds_modelo', modelo),
  ]);

  if (manufacturerRowsResult.error || modelRowsResult.error) {
    return NextResponse.json({ error: 'Falha ao consultar dados consolidados de fabricante/modelo.' }, { status: 502 });
  }

  const manufacturerRows = (manufacturerRowsResult.data as DetailedAircraftRow[] | null) ?? [];
  const modelRows = (modelRowsResult.data as DetailedAircraftRow[] | null) ?? [];

  const manufacturerMarcas = Array.from(new Set(manufacturerRows.map((row) => row.marcas).filter(Boolean)));
  const modelMarcas = Array.from(new Set(modelRows.map((row) => row.marcas).filter(Boolean)));

  let manufacturerTransactions: TransactionRow[] = [];
  let modelTransactions: TransactionRow[] = [];

  try {
    [manufacturerTransactions, modelTransactions] = await Promise.all([
      fetchTransactionsByMarcas(supabase, manufacturerMarcas),
      fetchTransactionsByMarcas(supabase, modelMarcas),
    ]);
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar histórico consolidado de negociações.' }, { status: 502 });
  }

  const snapshot: AircraftConsolidatedSnapshot = {
    marca_consultada: currentAircraft.marcas,
    fabricante,
    modelo,
    consulta_realizada_em: new Date().toISOString(),
    fonte_url: 'base_interna:detailed_aircrafts_info+history_transactions_cache',
    fabricante_consolidado: buildConsolidation(manufacturerRows, manufacturerTransactions),
    modelo_consolidado: {
      ...buildConsolidation(modelRows, modelTransactions),
      aeronaves_registradas_atualmente: modelMarcas.sort((a, b) => a.localeCompare(b)),
    },
  };

  return NextResponse.json(snapshot);
}
