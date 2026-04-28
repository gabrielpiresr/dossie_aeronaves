import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { AircraftDetailField } from '@/types/aircraft';

const DETAIL_TABLE_NAME = process.env.AIRCRAFT_DETAILS_TABLE_NAME ?? 'detailed_aircrafts_info';

type DetailedAircraftRow = {
  marcas: string;
  proprietarios: string | null;
  operadores: string | null;
  nr_cert_matricula: string | null;
  nr_serie: string | null;
  cd_tipo: string | null;
  ds_modelo: string | null;
  nm_fabricante: string | null;
  cd_cls: string | null;
  nr_pmd: string | null;
  cd_tipo_icao: string | null;
  nr_tripulacao_min: string | null;
  nr_passageiros_max: string | null;
  nr_assentos: string | null;
  nr_ano_fabricacao: string | null;
  dt_validade_cva: string | null;
  dt_validade_ca: string | null;
  dt_canc: string | null;
  ds_motivo_canc: string | null;
  cd_interdicao: string | null;
  ds_gravame: string | null;
  dt_matricula: string | null;
  tp_motor: string | null;
  qt_motor: string | null;
  tp_pouso: string | null;
  tp_ca: string | null;
  cd_proposito_cave: string | null;
  cf_operacional: string | null;
  ds_categoria_homologacao: string | null;
  tp_operacao: string | null;
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

function buildFields(row: DetailedAircraftRow): AircraftDetailField[] {
  const fieldMapping: Array<[label: string, value: string | null]> = [
    ['Proprietários', row.proprietarios],
    ['Operadores', row.operadores],
    ['Certificado de Matrícula', row.nr_cert_matricula],
    ['Número de Série', row.nr_serie],
    ['Código do Tipo', row.cd_tipo],
    ['Modelo', row.ds_modelo],
    ['Fabricante', row.nm_fabricante],
    ['Classe', row.cd_cls],
    ['PMD', row.nr_pmd],
    ['Tipo ICAO', row.cd_tipo_icao],
    ['Tripulação Mínima', row.nr_tripulacao_min],
    ['Passageiros Máximos', row.nr_passageiros_max],
    ['Assentos', row.nr_assentos],
    ['Ano de Fabricação', row.nr_ano_fabricacao],
    ['Validade CVA', row.dt_validade_cva],
    ['Validade CA', row.dt_validade_ca],
    ['Data de Cancelamento', row.dt_canc],
    ['Motivo do Cancelamento', row.ds_motivo_canc],
    ['Interdição', row.cd_interdicao],
    ['Gravame', row.ds_gravame],
    ['Data da Matrícula', row.dt_matricula],
    ['Tipo de Motor', row.tp_motor],
    ['Quantidade de Motores', row.qt_motor],
    ['Tipo de Pouso', row.tp_pouso],
    ['Tipo de CA', row.tp_ca],
    ['Propósito CAVE', row.cd_proposito_cave],
    ['CF Operacional', row.cf_operacional],
    ['Categoria de Homologação', row.ds_categoria_homologacao],
    ['Tipo de Operação', row.tp_operacao],
  ];

  return fieldMapping
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([label, value]) => ({ label, value: value as string }));
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

  const { data, error } = await supabase
    .from(DETAIL_TABLE_NAME)
    .select('*')
    .in('marcas', registrationCandidates)
    .limit(1)
    .maybeSingle<DetailedAircraftRow>();

  if (error) {
    return NextResponse.json(
      {
        error: 'Não foi possível consultar os dados detalhados desta aeronave no momento.',
      },
      { status: 502 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: 'Aeronave não encontrada na base detalhada.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    marca: data.marcas ?? normalizedRegistration,
    consulta_realizada_em: new Date().toISOString(),
    fonte_url: 'base_interna:detailed_aircrafts_info',
    campos: buildFields(data),
  });
}
