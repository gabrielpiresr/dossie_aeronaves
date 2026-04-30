import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ComplexEntry = { nome: string; documento: string; percentual: string; estado: string };
type RawAircraftRow = {
  [key: string]: string | number | boolean | null | ComplexEntry[] | undefined;
  marcas?: string | null;
  nm_fabricante?: string | null;
  ds_modelo?: string | null;
  PROPRIETARIOS?: string | null;
  OPERADORES?: string | null;
};
type IncidentRow = {
  classificacao: string | null;
  uf: string | null;
  tipo: string | null;
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

function parsePeople(raw: string | null): ComplexEntry[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [nome = '', documento = '', percentual = '', estado = ''] = chunk.split('|');
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

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ rows: [], total: 0, fabricantes: [], modelos: [] });
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const params = request.nextUrl.searchParams;
  const fabricantes = params.get('fabricantes')?.split(',').filter(Boolean) ?? [];
  const modelos = params.get('modelos')?.split(',').filter(Boolean) ?? [];
  const estado = params.get('estado') ?? '';
  const anoMin = params.get('anoMin');
  const anoMax = params.get('anoMax');
  const page = Number(params.get('page') ?? '1');
  const pageSize = Math.min(Number(params.get('pageSize') ?? '25'), 100);
  const sortBy = params.get('sortBy') ?? 'qtd_negociacoes';
  const sortOrder = params.get('sortOrder') === 'asc';

  const detailsTable = process.env.NEXT_PUBLIC_AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';
  const transactionsTable = process.env.NEXT_PUBLIC_AIRCRAFT_TRANSACTIONS_TABLE_NAME ?? 'history_transactions_cache';
  const incidentsTable = process.env.AIRCRAFT_INCIDENTS_TABLE_NAME ?? 'aicraft_incidents';

  const applyBaseFilters = (q: any) => {
    let next = q;
    if (fabricantes.length) next = next.in('nm_fabricante', fabricantes);
    if (estado) next = next.eq('sg_uf', estado);
    if (anoMin) next = next.gte('nr_ano_fabricacao', anoMin);
    if (anoMax) next = next.lte('nr_ano_fabricacao', anoMax);
    return next;
  };

  let baseRows: RawAircraftRow[] = [];
  let count = 0;

  if (modelos.length) {
    const { data } = await applyBaseFilters(
      supabase.from(detailsTable).select('*').limit(10000),
    );
    baseRows = (data as RawAircraftRow[] | null) ?? [];
  } else {
    let query = applyBaseFilters(supabase.from(detailsTable).select('*', { count: 'exact' }));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.order(sortBy, { ascending: sortOrder }).range(from, to);
    const response = await query;
    baseRows = (response.data as RawAircraftRow[] | null) ?? [];
    count = response.count ?? 0;
  }

  const normalizedRows: NormalizedAircraftRow[] = baseRows.map((row) => {
    const proprietario = mapPeopleToColumns(row.PROPRIETARIOS ?? null);
    const operador = mapPeopleToColumns(row.OPERADORES ?? null);

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

  let filteredRows: NormalizedAircraftRow[] = modelos.length
    ? normalizedRows.filter((row) => modelos.includes(String(row.ds_modelo ?? '')))
    : normalizedRows;
  if (modelos.length) {
    filteredRows = filteredRows.sort((a, b) => {
      const left = String(a[sortBy] ?? '');
      const right = String(b[sortBy] ?? '');
      return sortOrder ? left.localeCompare(right) : right.localeCompare(left);
    });
    count = filteredRows.length;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    filteredRows = filteredRows.slice(from, to);
  }

  const marcas = filteredRows.map((row) => row.marcas).filter(Boolean);
  const { data: txData } = await supabase.from(transactionsTable).select('marca').in('marca', marcas as string[]);
  const txMap = (txData ?? []).reduce<Record<string, number>>((acc, item: { marca: string }) => {
    acc[item.marca] = (acc[item.marca] ?? 0) + 1;
    return acc;
  }, {});

  const rows = filteredRows.map((row) => ({ ...row, qtd_negociacoes: txMap[String(row.marcas ?? '')] ?? 0 }));

  const { data: reportBaseRows } = await applyBaseFilters(
    supabase.from(detailsTable).select('marcas, nm_fabricante, ds_modelo, nr_ano_fabricacao, sg_uf').limit(10000),
  );
  const reportRowsRaw = ((reportBaseRows as RawAircraftRow[] | null) ?? []).filter((row) =>
    modelos.length ? modelos.includes(String(row.ds_modelo ?? '')) : true,
  );

  const reportRows = reportRowsRaw.map((row) => ({
    marca: String(row.marcas ?? ''),
    fabricante: String(row.nm_fabricante ?? 'Não informado'),
    modelo: String(row.ds_modelo ?? 'Não informado'),
    ano: String(row.nr_ano_fabricacao ?? 'Não informado'),
    uf: String(row.sg_uf ?? 'Não informado'),
  }));

  const marcasReport = Array.from(new Set(reportRows.map((row) => row.marca).filter(Boolean)));
  let incidentRows: IncidentRow[] = [];
  if (marcasReport.length) {
    const { data: incidentsData } = await supabase
      .from(incidentsTable)
      .select('classificacao, uf, tipo')
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
    rows,
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
