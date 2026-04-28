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

type JetPhotosAttemptResult = {
  status: number | null;
  photos: string[];
};

async function fetchJetPhotosPage(url: string): Promise<JetPhotosAttemptResult> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.jetphotos.com/',
      },
      signal: AbortSignal.timeout(9000),
    });

    const html = await response.text();

    if (!response.ok) {
      const snippet = html.slice(0, 180).replace(/\s+/g, ' ');
      console.warn(`[jetphotos] non-200 status=${response.status} url=${url} snippet="${snippet}"`);
      return { status: response.status, photos: [] };
    }

    return { status: response.status, photos: extractJetPhotosUrls(html) };
  } catch (error) {
    console.error(`[jetphotos] request failed url=${url}`, error);
    return { status: null, photos: [] };
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  const normalizedRegistration = normalizeRegistration(registration);
  const modelParam = new URL(request.url).searchParams.get('model')?.trim() ?? '';

  if (!normalizedRegistration) {
    return NextResponse.json({ error: 'Matrícula inválida.' }, { status: 400 });
  }

  const registrationCandidates = Array.from(new Set([normalizedRegistration, normalizedRegistration.replace(/-/g, '')]));
  const registrationUrls = registrationCandidates.map(
    (value) => `https://www.jetphotos.com/registration/${encodeURIComponent(value)}`,
  );

  console.info(`[jetphotos] lookup start registration=${normalizedRegistration} model=${modelParam || '-'}`);

  for (const registrationUrl of registrationUrls) {
    const attempt = await fetchJetPhotosPage(registrationUrl);

    if (attempt.photos.length > 0) {
      return NextResponse.json({
        registration: normalizedRegistration,
        searchedModel: null,
        source: 'registration',
        warning: null,
        sourceUrl: registrationUrl,
        credits: 'Fotos: JetPhotos.com',
        photos: attempt.photos,
      });
    }

    console.info(`[jetphotos] registration attempt done url=${registrationUrl} status=${attempt.status} photos=${attempt.photos.length}`);
  }

  if (!modelParam) {
    return NextResponse.json({
      registration: normalizedRegistration,
      searchedModel: null,
      source: 'registration',
      warning: null,
      sourceUrl: registrationUrls[0],
      credits: 'Fotos: JetPhotos.com',
      photos: [],
    });
  }

  const modelUrls = [
    `https://www.jetphotos.com/photo/keyword/${encodeURIComponent(modelParam)}`,
    `https://www.jetphotos.com/keyword/${encodeURIComponent(modelParam)}`,
  ];

  for (const modelUrl of modelUrls) {
    const attempt = await fetchJetPhotosPage(modelUrl);

    if (attempt.photos.length > 0) {
      return NextResponse.json({
        registration: normalizedRegistration,
        searchedModel: modelParam,
        source: 'model',
        warning: 'nao encontrado fotos dessa aeronave, mostrando similares',
        sourceUrl: modelUrl,
        credits: 'Fotos: JetPhotos.com',
        photos: attempt.photos,
      });
    }

    console.info(`[jetphotos] model attempt done url=${modelUrl} status=${attempt.status} photos=${attempt.photos.length}`);
  }

  return NextResponse.json({
    registration: normalizedRegistration,
    searchedModel: modelParam,
    source: 'model',
    warning: 'nao encontrado fotos dessa aeronave, mostrando similares',
    sourceUrl: modelUrls[0],
    credits: 'Fotos: JetPhotos.com',
    photos: [],
  });
}
