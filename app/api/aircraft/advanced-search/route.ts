import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ComplexEntry = { nome: string; documento: string; percentual: string; estado: string };
type RawAircraftRow = {
  [key: string]: string | number | boolean | null | ComplexEntry[] | undefined;
  marcas?: string | null;
  nm_fabricante?: string | null;
  ds_modelo?: string | null;
  proprietarios?: string | null;
  operadores?: string | null;
  PROPRIETARIOS?: string | null;
  OPERADORES?: string | null;
  MARCAS?: string | null;
  NM_FABRICANTE?: string | null;
  DS_MODELO?: string | null;
  NR_ANO_FABRICACAO?: string | number | null;
  SG_UF?: string | null;
};
type IncidentRow = {
  marca?: string | null;
  classificacao: string | null;
  uf: string | null;
  tipo: string | null;
  ds_gravame?: string | null;
};

type NormalizedAircraftRow = RawAircraftRow & {
  proprietario_nome: string;
  proprietario_documento: string;
  proprietario_percentual_cota: string;
  proprietario_estado: string;
  operador_nome: string;
  operador_documento: string;
  operador_percentual_cota: string;
  operador_estado: string;
};
type RowWithOccurrences = NormalizedAircraftRow & {
  qtd_negociacoes: number;
  qtd_ocorrencias: number;
  ds_gravame: string;
};

function parsePeople(raw: string | null): ComplexEntry[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [nome = '', documento = '', percentual = '', estado = ''] = chunk.split('|').map((part) => part.trim());

      if (!estado && BR_UF_REGEX.test(percentual)) {
        return { nome, documento, percentual: '', estado: percentual };
      }

      if (!estado && percentual && percentual.includes('|')) {
        const [fixedPercentual = '', fixedEstado = ''] = percentual.split('|').map((part) => part.trim());
        return { nome, documento, percentual: fixedPercentual, estado: fixedEstado };
      }

      return { nome: nome.trim(), documento: documento.trim(), percentual: percentual.trim(), estado: estado.trim() };
    });
}

function mapPeopleToColumns(raw: string | null) {
  const [first] = parsePeople(raw);
  if (!first) {
    return { nome: '', documento: '', percentual: '', estado: '' };
  }

  if (!first.estado && first.percentual && BR_UF_REGEX.test(first.percentual)) {
    return { nome: first.nome, documento: first.documento, percentual: '', estado: first.percentual };
  }

  return first;
}

const BR_UF_REGEX = /^[A-Z]{2}$/;

function getRawPeopleValue(row: RawAircraftRow, field: 'proprietarios' | 'operadores') {
  const upper = field.toUpperCase();
  const value = row[field] ?? row[upper];
  return typeof value === 'string' ? value : null;
}

function getFirstStringValue(row: RawAircraftRow, keys: string[], fallback = 'Não informado') {
  for (const key of keys) {
    const raw = row[key];
    if (raw === null || raw === undefined) continue;
    const normalized = String(raw).trim();
    if (normalized) return normalized;
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ rows: [], total: 0, fabricantes: [], modelos: [] });
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const params = request.nextUrl.searchParams;
  const fabricantes = params.getAll('fabricantes').filter(Boolean);
  const modelos = params.getAll('modelos').filter(Boolean);
  const estado = params.get('estado') ?? '';
  const anoMin = params.get('anoMin');
  const anoMax = params.get('anoMax');
  const page = Number(params.get('page') ?? '1');
  const pageSize = Math.min(Number(params.get('pageSize') ?? '25'), 100);
  const sortBy = params.get('sortBy') ?? 'qtd_negociacoes';
  const sortOrder = params.get('sortOrder') === 'asc';

  const detailsTable = process.env.NEXT_PUBLIC_AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';
  const transactionsTable = process.env.NEXT_PUBLIC_AIRCRAFT_TRANSACTIONS_TABLE_NAME ?? 'history_transactions_cache';
  const incidentsTable = process.env.AIRCRAFT_INCIDENTS_TABLE_NAME ?? 'aircraft_incidents';

  const applyBaseFilters = (q: any) => {
    let next = q;
    if (fabricantes.length) next = next.in('nm_fabricante', fabricantes);
    if (modelos.length) next = next.in('ds_modelo', modelos);
    if (estado) next = next.eq('sg_uf', estado);
    if (anoMin) next = next.gte('nr_ano_fabricacao', anoMin);
    if (anoMax) next = next.lte('nr_ano_fabricacao', anoMax);
    return next;
  };

  const sortableInDb = new Set(['marcas', 'nm_fabricante', 'ds_modelo', 'nr_ano_fabricacao', 'sg_uf']);
  const shouldSortInMemory = !sortableInDb.has(sortBy);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let baseRows: RawAircraftRow[] = [];
  let count = 0;
  if (shouldSortInMemory) {
    const { data } = await applyBaseFilters(supabase.from(detailsTable).select('*').limit(10000));
    baseRows = (data as RawAircraftRow[] | null) ?? [];
    count = baseRows.length;
  } else {
    let query = applyBaseFilters(supabase.from(detailsTable).select('*', { count: 'exact' }));
    query = query.order(sortBy, { ascending: sortOrder }).range(from, to);
    const response = await query;
    baseRows = (response.data as RawAircraftRow[] | null) ?? [];
    count = response.count ?? 0;
  }

  const normalizedRows: NormalizedAircraftRow[] = baseRows.map((row) => {
    const proprietario = mapPeopleToColumns(getRawPeopleValue(row, 'proprietarios'));
    const operador = mapPeopleToColumns(getRawPeopleValue(row, 'operadores'));

    return {
      ...row,
      proprietario_nome: proprietario.nome,
      proprietario_documento: proprietario.documento,
      proprietario_percentual_cota: proprietario.percentual,
      proprietario_estado: proprietario.estado,
      operador_nome: operador.nome,
      operador_documento: operador.documento,
      operador_percentual_cota: operador.percentual,
      operador_estado: operador.estado,
    };
  });

  const filteredRows: NormalizedAircraftRow[] = normalizedRows;

  const marcas = filteredRows.map((row) => row.marcas).filter(Boolean);
  const { data: txData } = marcas.length
    ? await supabase.from(transactionsTable).select('marca').in('marca', marcas as string[])
    : { data: [] as Array<{ marca: string }> };
  const txMap = (txData ?? []).reduce<Record<string, number>>((acc, item: { marca: string }) => {
    acc[item.marca] = (acc[item.marca] ?? 0) + 1;
    return acc;
  }, {});

  const rows = filteredRows.map((row) => ({ ...row, qtd_negociacoes: txMap[String(row.marcas ?? '')] ?? 0 }));

  const { data: reportBaseRows } = await applyBaseFilters(
    supabase.from(detailsTable).select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, sg_uf').limit(10000),
  );
  const reportRowsRaw = (reportBaseRows as RawAircraftRow[] | null) ?? [];

  const reportRows = reportRowsRaw.map((row) => ({
    marca: getFirstStringValue(row, ['marcas', 'MARCAS'], ''),
    fabricante: getFirstStringValue(row, ['nm_fabricante', 'NM_FABRICANTE']),
    modelo: getFirstStringValue(row, ['ds_modelo', 'DS_MODELO']),
    ano: getFirstStringValue(row, ['nr_ano_fabricacao', 'NR_ANO_FABRICACAO']),
    uf: getFirstStringValue(row, ['sg_uf', 'SG_UF']),
  }));

  const marcasReport = Array.from(new Set(reportRows.map((row) => row.marca).filter(Boolean)));
  let incidentRows: IncidentRow[] = [];
  if (marcasReport.length) {
    const { data: incidentsData } = await supabase
      .from(incidentsTable)
      .select('marca, classificacao, uf, tipo, ds_gravame')
      .in('marca', marcasReport)
      .limit(100000);
    incidentRows = (incidentsData as IncidentRow[] | null) ?? [];
  }

  const countBy = <T,>(items: T[], getKey: (item: T) => string) => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const key = getKey(item).trim() || 'Não informado';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  };

  const distribuicaoAno = countBy(reportRows, (row) => row.ano);
  const distribuicaoFabricante = countBy(reportRows, (row) => row.fabricante);
  const distribuicaoModelo = countBy(reportRows, (row) => row.modelo);
  const mapaPorEstado = countBy(reportRows, (row) => row.uf).map((item) => ({ estado: item.label, total: item.total }));


  const incidentStatsByMarca = incidentRows.reduce<Record<string, { qtd: number; grave: string }>>((acc, item) => {
    const key = String(item.marca ?? '').trim();
    if (!key) return acc;
    const current = acc[key] ?? { qtd: 0, grave: '' };
    current.qtd += 1;
    if (!current.grave && item.ds_gravame) current.grave = item.ds_gravame;
    acc[key] = current;
    return acc;
  }, {});

  let rowsWithOccurrences: RowWithOccurrences[] = rows.map((row) => {
    const stats = incidentStatsByMarca[String(row.marcas ?? '')] ?? { qtd: 0, grave: '' };
    return { ...row, ds_gravame: stats.grave || 'Não informado', qtd_ocorrencias: stats.qtd };
  });
  if (shouldSortInMemory) {
    rowsWithOccurrences = rowsWithOccurrences
      .sort((a, b) => {
        const left = (a as Record<string, string | number | null | undefined>)[sortBy];
        const right = (b as Record<string, string | number | null | undefined>)[sortBy];
        if (typeof left === 'number' && typeof right === 'number') {
          return sortOrder ? left - right : right - left;
        }
        return sortOrder
          ? String(left ?? '').localeCompare(String(right ?? ''))
          : String(right ?? '').localeCompare(String(left ?? ''));
      })
      .slice(from, to + 1);
  }

  const acidentes = incidentRows.filter((row) => (row.classificacao ?? '').toUpperCase() === 'ACIDENTE').length;
  const incidentesGraves = incidentRows.filter((row) => (row.classificacao ?? '').toUpperCase() === 'INCIDENTE GRAVE').length;
  const relatoPorUf = countBy(incidentRows, (row) => String(row.uf ?? 'Não informado')).map((item) => ({ estado: item.label, total: item.total }));
  const relatoPorTipo = countBy(incidentRows, (row) => String(row.tipo ?? 'Não informado'));

  const { data: fabricantesData } = await supabase.from(detailsTable).select('nm_fabricante').not('nm_fabricante', 'is', null).limit(2000);
  const modelosColetados: Array<{ ds_modelo: string | null; nm_fabricante: string | null }> = [];
  const modelosBatchSize = 1000;
  let modelosFrom = 0;
  while (true) {
    const modelosTo = modelosFrom + modelosBatchSize - 1;
    const { data: modelosLote } = await applyBaseFilters(
      supabase.from(detailsTable).select('ds_modelo, nm_fabricante').range(modelosFrom, modelosTo),
    );
    const loteAtual = (modelosLote as Array<{ ds_modelo: string | null; nm_fabricante: string | null }> | null) ?? [];
    if (!loteAtual.length) break;

    modelosColetados.push(...loteAtual);

    if (loteAtual.length < modelosBatchSize) break;
    modelosFrom += loteAtual.length;
  }
  const modelosDisponiveis = Array.from(
    new Set(
      modelosColetados
        .map((row) => row.ds_modelo ?? '')
        .filter(Boolean),
    ),
  );

  return NextResponse.json({
    rows: rowsWithOccurrences,
    total: count ?? 0,
    fabricantes: Array.from(new Set((fabricantesData ?? []).map((item: { nm_fabricante: string }) => item.nm_fabricante))).sort(),
    modelos: modelosDisponiveis.sort(),
    report: {
      totalAeronaves: reportRows.length,
      distribuicaoAno,
      mapaPorEstado,
      distribuicaoFabricante,
      distribuicaoModelo,
      ocorrencias: {
        acidentes,
        incidentesGraves,
        relatoPorUf,
        relatoPorTipo,
      },
    },
  });
}
