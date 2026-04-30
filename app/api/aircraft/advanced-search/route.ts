import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ComplexEntry = { nome: string; documento: string; percentual: string; estado: string };
type RawAircraftRow = Record<string, string | null> & {
  marcas?: string | null;
  nm_fabricante?: string | null;
  ds_modelo?: string | null;
  PROPRIETARIOS?: string | null;
  OPERADORES?: string | null;
};
type NormalizedAircraftRow = Omit<RawAircraftRow, 'proprietarios' | 'operadores'> & {
  modelo_normalizado: string;
  proprietarios: ComplexEntry[];
  operadores: ComplexEntry[];
  [key: string]: string | null | ComplexEntry[] | undefined;
};

function normalizeModel(modelo: string, fabricante: string) {
  return modelo
    .toUpperCase()
    .replace(new RegExp(fabricante.toUpperCase(), 'g'), '')
    .replace(/\b(LSA|NG)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  let query = supabase.from(detailsTable).select('*', { count: 'exact' });
  if (fabricantes.length) query = query.in('nm_fabricante', fabricantes);
  if (estado) query = query.eq('sg_uf', estado);
  if (anoMin) query = query.gte('nr_ano_fabricacao', anoMin);
  if (anoMax) query = query.lte('nr_ano_fabricacao', anoMax);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order(sortBy, { ascending: sortOrder }).range(from, to);

  const { data, count } = await query;
  const baseRows = (data as RawAircraftRow[] | null) ?? [];

  const normalizedRows: NormalizedAircraftRow[] = baseRows.map((row) => {
    const fabricante = row.nm_fabricante ?? '';
    const modelo = row.ds_modelo ?? '';
    return {
      ...row,
      modelo_normalizado: normalizeModel(modelo, fabricante),
      proprietarios: parsePeople(row.PROPRIETARIOS ?? null),
      operadores: parsePeople(row.OPERADORES ?? null),
    };
  });

  const filteredRows: NormalizedAircraftRow[] = modelos.length
    ? normalizedRows.filter((row) => modelos.includes(String(row.modelo_normalizado ?? '')))
    : normalizedRows;

  const marcas = filteredRows.map((row) => row.marcas).filter(Boolean);
  const { data: txData } = await supabase.from(transactionsTable).select('marca').in('marca', marcas as string[]);
  const txMap = (txData ?? []).reduce<Record<string, number>>((acc, item: { marca: string }) => {
    acc[item.marca] = (acc[item.marca] ?? 0) + 1;
    return acc;
  }, {});

  const rows = filteredRows.map((row) => ({ ...row, qtd_negociacoes: txMap[String(row.marcas ?? '')] ?? 0 }));

  const { data: fabricantesData } = await supabase.from(detailsTable).select('nm_fabricante').not('nm_fabricante', 'is', null).limit(2000);
  const modelosDisponiveis = Array.from(new Set(
    filteredRows.map((row) => String(row.modelo_normalizado ?? '')).filter(Boolean),
  ));

  return NextResponse.json({
    rows,
    total: count ?? 0,
    fabricantes: Array.from(new Set((fabricantesData ?? []).map((item: { nm_fabricante: string }) => item.nm_fabricante))).sort(),
    modelos: modelosDisponiveis.sort(),
  });
}
