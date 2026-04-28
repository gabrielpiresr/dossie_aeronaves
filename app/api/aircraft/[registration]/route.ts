import { NextResponse } from 'next/server';
import { extractIncidentsFromCenipaHtml } from '@/utils/cenipaParser';
import { extractFieldsFromRabHtml, extractSearchTimestamp } from '@/utils/rabParser';

const RAB_BASE_URL = 'https://aeronaves.anac.gov.br/aeronaves';
const CENIPA_REPORTS_URL = 'https://sistema.cenipa.fab.mil.br/cenipa/paginas/relatorios/relatorios.php';

function normalizeRegistration(registration: string) {
  return registration.trim().toUpperCase();
}

function normalizeRegistrationForCenipa(registration: string) {
  return registration.replace(/[^A-Z0-9]/gi, '');
}

function buildSearchUrl(registration: string) {
  const params = new URLSearchParams({
    tipo_pesquisa: 'marcas',
    textMarca: registration,
    selectHabilitacao: '',
    selectIcao: '',
    selectModelo: '',
    selectFabricante: '',
    textNumeroSerie: '',
  });

  return `${RAB_BASE_URL}/cons_rab_resposta2.asp?${params.toString()}`;
}

function buildDirectUrl(registration: string) {
  const params = new URLSearchParams({
    tipo_pesquisa: 'marcas',
    textMarca: registration,
  });

  return `${RAB_BASE_URL}/cons_rab_resposta.asp?${params.toString()}`;
}

function buildCenipaUrl(registration: string) {
  const params = new URLSearchParams({
    matricula_anv: registration,
    numero_relatorio: '',
    data_inicial: '',
    data_final: '',
    classificacao: '',
    uf: '',
  });

  return `${CENIPA_REPORTS_URL}?${params.toString()}`;
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar endpoint externo (HTTP ${response.status}).`);
  }

  return response.text();
}

export async function GET(_: Request, { params }: { params: Promise<{ registration: string }> }) {
  try {
    const { registration } = await params;
    const normalizedRegistration = normalizeRegistration(registration);

    if (!normalizedRegistration) {
      return NextResponse.json({ error: 'Matrícula inválida.' }, { status: 400 });
    }

    const candidateRabUrls = [buildSearchUrl(normalizedRegistration), buildDirectUrl(normalizedRegistration)];

    let selectedHtml = '';
    let selectedUrl = '';

    for (const url of candidateRabUrls) {
      try {
        const html = await fetchPage(url);
        const fields = extractFieldsFromRabHtml(html);

        if (fields.length > 0) {
          selectedHtml = html;
          selectedUrl = url;
          break;
        }
      } catch {
        // tenta próxima variação de endpoint
      }
    }

    if (!selectedHtml) {
      return NextResponse.json(
        {
          error:
            'Não foi possível obter dados da ANAC para esta matrícula agora. Tente novamente em instantes.',
        },
        { status: 502 },
      );
    }

    const fields = extractFieldsFromRabHtml(selectedHtml);

    const cenipaUrl = buildCenipaUrl(normalizeRegistrationForCenipa(normalizedRegistration));
    let incidentes = [];
    let incidentesConsultaErro: string | undefined;

    try {
      const cenipaHtml = await fetchPage(cenipaUrl);
      incidentes = extractIncidentsFromCenipaHtml(cenipaHtml);
    } catch {
      incidentesConsultaErro =
        'Dados atuais da ANAC carregados, mas não foi possível consultar incidentes no CENIPA neste momento.';
    }

    return NextResponse.json({
      marca: normalizedRegistration,
      consulta_realizada_em: extractSearchTimestamp(selectedHtml),
      fonte_url: selectedUrl,
      campos: fields,
      fonte_cenipa_url: cenipaUrl,
      incidentes,
      incidentes_consulta_erro: incidentesConsultaErro,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Erro inesperado ao consultar o RAB da ANAC.',
      },
      { status: 500 },
    );
  }
}
