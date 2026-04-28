import { NextResponse } from 'next/server';

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

function extractJetPhotosUrls(html: string) {
  const matches = html.match(/https:\/\/cdn\.jetphotos\.com\/[0-9]+\/[0-9]+\/[0-9]+_[0-9]+\.jpg/g) ?? [];
  return Array.from(new Set(matches));
}

async function fetchJetPhotosPage(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  if (!response.ok) {
    throw new Error(`JetPhotos retornou ${response.status}`);
  }

  const html = await response.text();
  return extractJetPhotosUrls(html);
}

export async function GET(request: Request, { params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  const normalizedRegistration = normalizeRegistration(registration);
  const modelParam = new URL(request.url).searchParams.get('model')?.trim() ?? '';

  if (!normalizedRegistration) {
    return NextResponse.json({ error: 'Matrícula inválida.' }, { status: 400 });
  }

  const registrationUrl = `https://www.jetphotos.com/registration/${encodeURIComponent(normalizedRegistration)}`;

  try {
    const registrationPhotos = await fetchJetPhotosPage(registrationUrl);

    if (registrationPhotos.length > 0) {
      return NextResponse.json({
        registration: normalizedRegistration,
        searchedModel: null,
        source: 'registration',
        warning: null,
        sourceUrl: registrationUrl,
        credits: 'Fotos: JetPhotos.com',
        photos: registrationPhotos,
      });
    }

    if (!modelParam) {
      return NextResponse.json({
        registration: normalizedRegistration,
        searchedModel: null,
        source: 'registration',
        warning: null,
        sourceUrl: registrationUrl,
        credits: 'Fotos: JetPhotos.com',
        photos: [],
      });
    }

    const modelUrl = `https://www.jetphotos.com/photo/keyword/${encodeURIComponent(modelParam)}`;
    const modelPhotos = await fetchJetPhotosPage(modelUrl);

    return NextResponse.json({
      registration: normalizedRegistration,
      searchedModel: modelParam,
      source: 'model',
      warning: 'nao encontrado fotos dessa aeronave, mostrando similares',
      sourceUrl: modelUrl,
      credits: 'Fotos: JetPhotos.com',
      photos: modelPhotos,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Não foi possível consultar fotos no JetPhotos no momento.',
      },
      { status: 502 },
    );
  }
}
