import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  AircraftConsolidatedSnapshot,
  DistributionItem,
  IncidentClassificacao,
  IncidentCount,
  IncidentDetail,
  RegionDistributionItem,
  StateDistributionItem,
} from '@/types/aircraft';

const DETAIL_TABLE_NAME = process.env.AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';
const TRANSACTIONS_TABLE_NAME = process.env.HISTORY_TRANSACTIONS_CACHE_TABLE_NAME ?? 'history_transactions_cache';
const INCIDENTS_TABLE_NAME = process.env.AIRCRAFT_INCIDENTS_TABLE_NAME ?? 'aicraft_incidents';
const START_YEAR = 2017;
const PAGE_SIZE = 1000;
const INCIDENT_CLASSIFICATIONS: IncidentClassificacao[] = ['ACIDENTE', 'INCIDENTE', 'INCIDENTE GRAVE'];

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
  cd_tipo_icao: string | null;
  ds_categoria_homologacao: string | null;
  tp_motor: string | null;
  qt_motor: string | null;
};

type TransactionRow = {
  marca: string;
  data_anterior: string;
  data_nova: string;
};

type IncidentRow = IncidentDetail;

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

async function fetchAllPages<T>(queryPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryPage(from, to);

    if (error) {
      throw new Error('Erro ao consultar páginas de dados.');
    }

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
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

function parseOperatorNames(value: string | null) {
  const chunks = (value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const operators: string[] = [];

  for (let i = 0; i < chunks.length; i += 4) {
    const name = chunks[i];
    if (name) {
      operators.push(name);
    }
  }

  return Array.from(new Set(operators));
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

function normalizeIncidentClassification(value: string | null) {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'ACIDENTE' || normalized === 'INCIDENTE' || normalized === 'INCIDENTE GRAVE') {
    return normalized as IncidentClassificacao;
  }

  return null;
}

function buildIncidentCounts(rows: IncidentRow[]): IncidentCount[] {
  const counters = new Map<IncidentClassificacao, number>(INCIDENT_CLASSIFICATIONS.map((item) => [item, 0]));

  rows.forEach((row) => {
    const classification = normalizeIncidentClassification(row.classificacao);
    if (!classification) {
      return;
    }

    counters.set(classification, (counters.get(classification) ?? 0) + 1);
  });

  return INCIDENT_CLASSIFICATIONS.map((classificacao) => ({
    classificacao,
    total: counters.get(classificacao) ?? 0,
  }));
}

function buildIncidentStateDistribution(rows: IncidentRow[]): StateDistributionItem[] {
  const counters = new Map<string, number>();

  rows.forEach((row) => {
    const state = (row.uf ?? '').trim().toUpperCase();
    if (!state || !REGION_BY_STATE[state]) {
      return;
    }

    counters.set(state, (counters.get(state) ?? 0) + 1);
  });

  return Array.from(counters.entries())
    .map(([estado, total]) => ({ estado, total, regiao: REGION_BY_STATE[estado] }))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado));
}

function buildIncidentTypeDistribution(rows: IncidentRow[]) {
  return buildDistribution(rows.map((row) => normalizeText(row.tipo) ?? 'Não informado'));
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

function calculateOwnershipDurationDaysByAircraft(rows: TransactionRow[], now: Date) {
  const rowsByAircraft = new Map<string, TransactionRow[]>();

  rows.forEach((row) => {
    const marca = row.marca?.trim();
    if (!marca) {
      return;
    }

    const aircraftRows = rowsByAircraft.get(marca) ?? [];
    aircraftRows.push(row);
    rowsByAircraft.set(marca, aircraftRows);
  });

  let totalDays = 0;
  let totalIntervals = 0;

  rowsByAircraft.forEach((aircraftRows) => {
    const sorted = [...aircraftRows]
      .map((row) => ({
        ...row,
        dataNovaParsed: dateFromUnknownFormat(row.data_nova),
        dataAnteriorParsed: dateFromUnknownFormat(row.data_anterior),
      }))
      .filter((row) => row.dataNovaParsed && row.dataAnteriorParsed)
      .sort((a, b) => (a.dataNovaParsed as Date).getTime() - (b.dataNovaParsed as Date).getTime());

    for (let i = 1; i < sorted.length; i += 1) {
      const previousDataNova = sorted[i - 1].dataNovaParsed as Date;
      const currentDataAnterior = sorted[i].dataAnteriorParsed as Date;

      if (currentDataAnterior >= previousDataNova) {
        totalDays += Math.round((currentDataAnterior.getTime() - previousDataNova.getTime()) / (1000 * 60 * 60 * 24));
        totalIntervals += 1;
      }
    }

    const last = sorted.at(-1);
    if (last?.dataAnteriorParsed && now >= last.dataAnteriorParsed) {
      totalDays += Math.round((now.getTime() - last.dataAnteriorParsed.getTime()) / (1000 * 60 * 60 * 24));
      totalIntervals += 1;
    }
  });

  return totalIntervals > 0 ? Number((totalDays / totalIntervals).toFixed(2)) : 0;
}

function calcTransactionMetrics(rows: TransactionRow[]) {
  const sinceDate = new Date(`${START_YEAR}-01-01T00:00:00Z`);
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);

  let totalDesde2017 = 0;
  let ultimos12Meses = 0;

  rows.forEach((row) => {
    const nova = dateFromUnknownFormat(row.data_nova);

    if (nova && nova >= sinceDate) {
      totalDesde2017 += 1;

      if (nova >= twelveMonthsAgo && nova <= now) {
        ultimos12Meses += 1;
      }
    }
  });

  const anosAnalisados = Math.max(now.getUTCFullYear() - START_YEAR + 1, 1);

  return {
    negociacoes_desde_2017: totalDesde2017,
    media_negociacoes_por_ano_desde_2017: Number((totalDesde2017 / anosAnalisados).toFixed(2)),
    negociacoes_ultimos_12_meses: ultimos12Meses,
    tempo_medio_permanencia_dias: calculateOwnershipDurationDaysByAircraft(rows, now),
  };
}

async function fetchTransactionsByMarcas(
  marcas: string[],
  queryChunk: (chunk: string[], from: number, to: number) => Promise<{ data: TransactionRow[] | null; error: unknown }>,
) {
  if (marcas.length === 0) {
    return [] as TransactionRow[];
  }

  const CHUNK_SIZE = 300;
  const allRows: TransactionRow[] = [];

  for (let i = 0; i < marcas.length; i += CHUNK_SIZE) {
    const chunk = marcas.slice(i, i + CHUNK_SIZE);

    const chunkRows = await fetchAllPages<TransactionRow>((from, to) => queryChunk(chunk, from, to));
    allRows.push(...chunkRows);
  }

  return allRows;
}

function buildConsolidation(rows: DetailedAircraftRow[], transactions: TransactionRow[], incidents: IncidentRow[]) {
  return {
    quantidade_aeronaves_registradas: rows.length,
    distribuicao_modelo: buildDistribution(rows.map((row) => normalizeText(row.ds_modelo) ?? 'Não informado')),
    distribuicao_ano: buildDistribution(rows.map((row) => normalizeYear(row.nr_ano_fabricacao))),
    mapa_brasil: buildStateAndRegionDistribution(rows),
    ocorrencias: {
      totais_por_classificacao: buildIncidentCounts(incidents),
      relato_por_uf: buildIncidentStateDistribution(incidents),
      relato_por_tipo: buildIncidentTypeDistribution(incidents),
    },
    ...calcTransactionMetrics(transactions),
  };
}

function toRegisteredAircraftRow(row: DetailedAircraftRow) {
  return {
    marca: row.marcas,
    fabricante: row.nm_fabricante?.trim() || 'Não informado',
    modelo: row.ds_modelo?.trim() || 'Não informado',
    ano_fabricacao: normalizeYear(row.nr_ano_fabricacao),
    tipo_icao: row.cd_tipo_icao?.trim() || 'Não informado',
    categoria: row.ds_categoria_homologacao?.trim() || 'Não informado',
    tipo_motor: row.tp_motor?.trim() || 'Não informado',
    quantidade_motores: row.qt_motor?.trim() || 'Não informado',
    estado_operacao: parseBrazilStateFromOperator(row.operadores) || '-',
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
    .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores, cd_tipo_icao, ds_categoria_homologacao, tp_motor, qt_motor')
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
  const operadorPrincipal = parseOperatorNames(currentAircraft.operadores)[0] ?? 'Não informado';

  if (!fabricante || !modelo) {
    return NextResponse.json(
      { error: 'Dados insuficientes para gerar consolidados de fabricante e modelo desta aeronave.' },
      { status: 422 },
    );
  }

  let manufacturerRows: DetailedAircraftRow[] = [];
  let modelRows: DetailedAircraftRow[] = [];
  let operatorRows: DetailedAircraftRow[] = [];

  try {
    [manufacturerRows, modelRows, operatorRows] = await Promise.all([
      fetchAllPages<DetailedAircraftRow>(async (from, to) => {
        const { data, error } = await supabase
          .from(DETAIL_TABLE_NAME)
          .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores, cd_tipo_icao, ds_categoria_homologacao, tp_motor, qt_motor')
          .eq('nm_fabricante', fabricante)
          .range(from, to);

        return { data: (data as DetailedAircraftRow[] | null) ?? [], error };
      }),
      fetchAllPages<DetailedAircraftRow>(async (from, to) => {
        const { data, error } = await supabase
          .from(DETAIL_TABLE_NAME)
          .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores, cd_tipo_icao, ds_categoria_homologacao, tp_motor, qt_motor')
          .eq('ds_modelo', modelo)
          .range(from, to);

        return { data: (data as DetailedAircraftRow[] | null) ?? [], error };
      }),
      operadorPrincipal === 'Não informado'
        ? Promise.resolve([] as DetailedAircraftRow[])
        : fetchAllPages<DetailedAircraftRow>(async (from, to) => {
            const { data, error } = await supabase
              .from(DETAIL_TABLE_NAME)
              .select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, operadores, cd_tipo_icao, ds_categoria_homologacao, tp_motor, qt_motor')
              .ilike('operadores', `%${operadorPrincipal}%`)
              .range(from, to);

            return { data: (data as DetailedAircraftRow[] | null) ?? [], error };
          }),
    ]);
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar dados consolidados de fabricante/modelo.' }, { status: 502 });
  }

  const manufacturerMarcas = Array.from(new Set(manufacturerRows.map((row) => row.marcas).filter(Boolean)));
  const modelMarcas = Array.from(new Set(modelRows.map((row) => row.marcas).filter(Boolean)));

  let manufacturerTransactions: TransactionRow[] = [];
  let modelTransactions: TransactionRow[] = [];
  let aircraftIncidents: IncidentRow[] = [];
  let manufacturerIncidents: IncidentRow[] = [];
  let modelIncidents: IncidentRow[] = [];

  try {
    [manufacturerTransactions, modelTransactions, aircraftIncidents, manufacturerIncidents, modelIncidents] = await Promise.all([
      fetchTransactionsByMarcas(manufacturerMarcas, async (chunk, from, to) => {
        const { data, error } = await supabase
          .from(TRANSACTIONS_TABLE_NAME)
          .select('marca, data_anterior, data_nova')
          .in('marca', chunk)
          .range(from, to);

        return { data: (data as TransactionRow[] | null) ?? [], error };
      }),
      fetchTransactionsByMarcas(modelMarcas, async (chunk, from, to) => {
        const { data, error } = await supabase
          .from(TRANSACTIONS_TABLE_NAME)
          .select('marca, data_anterior, data_nova')
          .in('marca', chunk)
          .range(from, to);

        return { data: (data as TransactionRow[] | null) ?? [], error };
      }),
      fetchAllPages<IncidentRow>(async (from, to) => {
        const { data, error } = await supabase
          .from(INCIDENTS_TABLE_NAME)
          .select('link, data, marca, classificacao, tipo, localidade, uf, aerodromo, operacao, status')
          .eq('marca', currentAircraft.marcas)
          .range(from, to);

        return { data: (data as IncidentRow[] | null) ?? [], error };
      }),
      fetchIncidentsByMarcas(manufacturerMarcas, async (chunk, from, to) => {
        const { data, error } = await supabase
          .from(INCIDENTS_TABLE_NAME)
          .select('link, data, marca, classificacao, tipo, localidade, uf, aerodromo, operacao, status')
          .in('marca', chunk)
          .range(from, to);

        return { data: (data as IncidentRow[] | null) ?? [], error };
      }),
      fetchIncidentsByMarcas(modelMarcas, async (chunk, from, to) => {
        const { data, error } = await supabase
          .from(INCIDENTS_TABLE_NAME)
          .select('link, data, marca, classificacao, tipo, localidade, uf, aerodromo, operacao, status')
          .in('marca', chunk)
          .range(from, to);

        return { data: (data as IncidentRow[] | null) ?? [], error };
      }),
    ]);
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar histórico consolidado de negociações e ocorrências.' }, { status: 502 });
  }

  const aircraftIncidentCounts = buildIncidentCounts(aircraftIncidents);
  const aircraftHasHistory = aircraftIncidentCounts.some((item) => item.total > 0);

  const snapshot: AircraftConsolidatedSnapshot = {
    marca_consultada: currentAircraft.marcas,
    fabricante,
    modelo,
    consulta_realizada_em: new Date().toISOString(),
    fonte_url: 'base_interna:detailed_aircrafts_info+history_transactions_cache+aicraft_incidents',
    aeronave_consultada_ocorrencias: {
      totais_por_classificacao: aircraftIncidentCounts,
      historico: aircraftIncidents,
      possui_historico: aircraftHasHistory,
    },
    ocorrencias_detalhes_modelo: modelIncidents,
    fabricante_consolidado: buildConsolidation(manufacturerRows, manufacturerTransactions, manufacturerIncidents),
    modelo_consolidado: {
      ...buildConsolidation(modelRows, modelTransactions, modelIncidents),
      aeronaves_registradas_atualmente: modelMarcas.sort((a, b) => a.localeCompare(b)),
      aeronaves_registradas_detalhes: modelRows.map(toRegisteredAircraftRow),
    },
    operador_consolidado: {
      operador_principal: operadorPrincipal,
      aeronaves_registradas_detalhes: Array.from(new Map(operatorRows.map((row) => [row.marcas, toRegisteredAircraftRow(row)])).values()),
    },
  };

  return NextResponse.json(snapshot);
}

async function fetchIncidentsByMarcas(
  marcas: string[],
  queryChunk: (chunk: string[], from: number, to: number) => Promise<{ data: IncidentRow[] | null; error: unknown }>,
) {
  if (marcas.length === 0) {
    return [] as IncidentRow[];
  }

  const CHUNK_SIZE = 300;
  const allRows: IncidentRow[] = [];

  for (let i = 0; i < marcas.length; i += CHUNK_SIZE) {
    const chunk = marcas.slice(i, i + CHUNK_SIZE);
    const chunkRows = await fetchAllPages<IncidentRow>((from, to) => queryChunk(chunk, from, to));
    allRows.push(...chunkRows);
  }

  return allRows;
}
