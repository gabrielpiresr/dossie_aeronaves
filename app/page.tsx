import AircraftHistory from '@/components/AircraftHistory';
import AircraftSearch from '@/components/AircraftSearch';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Histórico de Aeronaves</h1>
      <p className="mt-3 text-sm text-slate-600">Digite uma matrícula para iniciar a consulta.</p>

      <div className="mt-8 w-full max-w-xl">
        <AircraftSearch />
      </div>

      <AircraftHistory />
    </main>
  );
}
