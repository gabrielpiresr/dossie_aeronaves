import RegisteredAircraftTable from '@/components/RegisteredAircraftTable';
import type { AircraftConsolidatedSnapshot } from '@/types/aircraft';

type AircraftOperatorFleetProps = {
  snapshot: AircraftConsolidatedSnapshot | null;
};

export default function AircraftOperatorFleet({ snapshot }: AircraftOperatorFleetProps) {
  if (!snapshot) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Aeronaves deste operador</h2>
      <p className="mt-1 text-sm text-slate-600">Operador atual: {snapshot.operador_consolidado.operador_principal}</p>
      <div className="mt-4">
        <RegisteredAircraftTable
          title="Frota registrada atualmente"
          rows={snapshot.operador_consolidado.aeronaves_registradas_detalhes}
          emptyMessage="Nenhuma aeronave encontrada para o operador informado."
        />
      </div>
    </section>
  );
}
