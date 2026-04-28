import { NextResponse } from 'next/server';
import { extractDetailLinksFromSearchHtml, extractFieldsFromRabHtml, extractSearchTimestamp } from '@/utils/rabParser';

const RAB_BASE_URL = 'https://aeronaves.anac.gov.br/aeronaves';

function normalizeRegistration(registration: string) {
  const normalized = registration.trim().toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');

  if (normalized.includes('-')) {
    return normalized;
  }

  // Ex.: PULRO -> PU-LRO
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }

  return normalized;
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

async function fetchPage(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      Referer: `${RAB_BASE_URL}/cons_rab.asp`,
      Origin: 'https://aeronaves.anac.gov.br',
    },
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar ANAC (HTTP ${response.status}).`);
  }

  const buffer = await response.arrayBuffer();
  const latin1Text = new TextDecoder('latin1').decode(buffer);

  return {
    html: latin1Text,
    finalUrl: response.url,
  };
}

async function resolveRabDetails(searchUrl: string, directUrl: string) {
  const visited = new Set<string>();
  const queue = [searchUrl, directUrl];

  while (queue.length > 0) {
    const url = queue.shift();

    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);

    try {
      const { html, finalUrl } = await fetchPage(url);
      const fields = extractFieldsFromRabHtml(html);

      if (fields.length > 0) {
        return { html, sourceUrl: finalUrl };
      }

      const links = extractDetailLinksFromSearchHtml(html, RAB_BASE_URL);
      for (const link of links) {
        if (!visited.has(link)) {
          queue.push(link);
        }
      }
    } catch {
      // segue para os próximos candidatos
    }
  }

  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ registration: string }> }) {
  try {
    const { registration } = await params;
    const normalizedRegistration = normalizeRegistration(registration);

    if (!normalizedRegistration) {
      return NextResponse.json({ error: 'Matrícula inválida.' }, { status: 400 });
    }

    const searchUrl = buildSearchUrl(normalizedRegistration);
    const directUrl = buildDirectUrl(normalizedRegistration);

    const rabDetails = await resolveRabDetails(searchUrl, directUrl);

    if (!rabDetails) {
      return NextResponse.json(
        {
          error:
            'Não foi possível obter dados da ANAC para esta matrícula agora. Tente novamente em instantes.',
        },
        { status: 502 },
      );
    }

    const fields = extractFieldsFromRabHtml(rabDetails.html);

    return NextResponse.json({
      marca: normalizedRegistration,
      consulta_realizada_em: extractSearchTimestamp(rabDetails.html),
      fonte_url: rabDetails.sourceUrl,
      campos: fields,
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
