'use client';

import Image from 'next/image';
import type { AircraftPhotoSnapshot } from '@/types/aircraft';

type AircraftPhotosProps = {
  snapshot: AircraftPhotoSnapshot | null;
  isLoading: boolean;
};

export default function AircraftPhotos({ snapshot, isLoading }: AircraftPhotosProps) {
  if (!snapshot && !isLoading) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Fotos da aeronave (JetPhotos)</h2>

      {snapshot?.warning && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{snapshot.warning}</div>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-600">Buscando fotos...</p>}

      {!isLoading && snapshot && snapshot.photos.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">Nenhuma foto encontrada no JetPhotos.</p>
      )}

      {!isLoading && snapshot && snapshot.photos.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.photos.map((photoUrl, index) => (
            <a
              key={`${photoUrl}-${index}`}
              href={photoUrl.replace('/400/', '/')}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border border-slate-200"
            >
              <Image
                src={photoUrl}
                alt={`Foto ${index + 1} da aeronave`}
                className="h-40 w-full object-cover"
                width={400}
                height={300}
                unoptimized
              />
            </a>
          ))}
        </div>
      )}

      {snapshot && (
        <p className="mt-4 text-xs text-slate-500">
          {snapshot.credits} • Fonte:{' '}
          <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            {snapshot.sourceUrl}
          </a>
        </p>
      )}
    </section>
  );
}
