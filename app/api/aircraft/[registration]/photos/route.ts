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
  const rawMatches = html.match(/https?:\/\/cdn\.jetphotos\.com\/[^"'\\s<>]+?\.(?:jpg|jpeg|webp)(?:\?[^"'\\s<>]*)?/gi) ?? [];
  const escapedMatches = html.match(/https?:\\\/\\\/cdn\.jetphotos\.com\\\/[^"'\\s<>]+?\.(?:jpg|jpeg|webp)(?:\?[^"'\\s<>]*)?/gi) ?? [];
  const normalizedEscaped = escapedMatches.map((url) => url.replace(/\\\//g, '/'));
  const allMatches = [...rawMatches, ...normalizedEscaped];
  const cleaned = allMatches.map((url) => url.replace(/\?.*$/, ''));
  const unique = Array.from(new Set(cleaned));

  if (unique.length === 0) {
    console.info('[jetphotos] extractor found 0 urls in HTML payload');
  } else {
    console.info(`[jetphotos] extractor found ${unique.length} urls. first=${unique[0]}`);
  }

  return unique;
}

type JetPhotosAttemptResult = {
  status: number | null;
  photos: string[];
};

function buildFetchCandidates(url: string) {
  const encodedUrl = encodeURIComponent(url);
  return [
    url,
    `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`,
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
  ];
}

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
      console.info(`[jetphotos] non-200 status=${response.status} url=${url} snippet="${snippet}"`);
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
    let attempt: JetPhotosAttemptResult = { status: null, photos: [] };
    for (const candidateUrl of buildFetchCandidates(registrationUrl)) {
      attempt = await fetchJetPhotosPage(candidateUrl);
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
    }

    console.info(
      `[jetphotos] registration attempt done url=${registrationUrl} status=${attempt.status} photos=${attempt.photos.length}`,
    );
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
    let attempt: JetPhotosAttemptResult = { status: null, photos: [] };
    for (const candidateUrl of buildFetchCandidates(modelUrl)) {
      attempt = await fetchJetPhotosPage(candidateUrl);

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
