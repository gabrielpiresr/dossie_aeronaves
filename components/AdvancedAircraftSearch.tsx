'use client';

import { useEffect, useMemo, useState } from 'react';

type ComplexEntry = { nome: string; documento: string; percentual: string; estado: string };
type Row = Record<string, string | number | null | ComplexEntry[]>;

type ResponsePayload = {
  rows: Row[];
  total: number;
  fabricantes: string[];
  modelos: string[];
};
const BR_UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

const DEFAULT_COLUMNS = ['marcas', 'nm_fabricante', 'ds_modelo', 'nr_ano_fabricacao', 'sg_uf', 'qtd_negociacoes'];

export default function AdvancedAircraftSearch() {
  const [fabricantes, setFabricantes] = useState<string[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [selectedFabricantes, setSelectedFabricantes] = useState<string[]>([]);
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const [estado, setEstado] = useState('');
  const [anoMin, setAnoMin] = useState('');
  const [anoMax, setAnoMax] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortBy, setSortBy] = useState('qtd_negociacoes');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(false);
  const [openFabricantes, setOpenFabricantes] = useState(false);
  const [openModelos, setOpenModelos] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedFabricantes.length) params.set('fabricantes', selectedFabricantes.join(','));
    if (selectedModelos.length) params.set('modelos', selectedModelos.join(','));
    if (estado) params.set('estado', estado);
    if (anoMin) params.set('anoMin', anoMin);
    if (anoMax) params.set('anoMax', anoMax);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    return params.toString();
  }, [anoMax, anoMin, estado, page, pageSize, selectedFabricantes, selectedModelos, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/aircraft/advanced-search?${queryParams}`, { cache: 'no-store' })
      .then((res) => res.json() as Promise<ResponsePayload>)
      .then((payload) => {
        setRows(payload.rows ?? []);
        setTotal(payload.total ?? 0);
        setFabricantes(payload.fabricantes ?? []);
        setModelos(payload.modelos ?? []);
      })
      .finally(() => setLoading(false));
  }, [queryParams]);

  const columns = useMemo(() => Array.from(new Set(rows.flatMap((r) => Object.keys(r)))), [rows]);

  return (
    <section className="mt-8 w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Busca Avançada</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="relative">
          <button className="w-full rounded border p-2 text-left text-sm" onClick={() => setOpenFabricantes((v) => !v)} type="button">Fabricantes</button>
          <div className="mt-1 flex flex-wrap gap-1">{selectedFabricantes.map((item) => <span key={item} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">{item}</span>)}</div>
          {openFabricantes && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border bg-white p-2 shadow">{fabricantes.map((f) => <label key={f} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedFabricantes.includes(f)} onChange={() => { setSelectedFabricantes((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]); setSelectedModelos([]); setPage(1); }} />{f}</label>)}</div>}
        </div>
        <div className="relative">
          <button className="w-full rounded border p-2 text-left text-sm" onClick={() => setOpenModelos((v) => !v)} type="button">Modelos</button>
          <div className="mt-1 flex flex-wrap gap-1">{selectedModelos.map((item) => <span key={item} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{item}</span>)}</div>
          {openModelos && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border bg-white p-2 shadow">{modelos.map((m) => <label key={m} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedModelos.includes(m)} onChange={() => { setSelectedModelos((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]); setPage(1); }} />{m}</label>)}</div>}
        </div>
        <input className="rounded border p-2" placeholder="Ano mínimo" value={anoMin} onChange={(e) => { setAnoMin(e.target.value); setPage(1); }} />
        <input className="rounded border p-2" placeholder="Ano máximo" value={anoMax} onChange={(e) => { setAnoMax(e.target.value); setPage(1); }} />
        <select className="rounded border p-2" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}>
          <option value="">Todos os estados</option>
          {BR_UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>

      {columns.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {columns.map((col) => (
            <label key={col} className="text-xs">
              <input
                type="checkbox"
                checked={visibleColumns.includes(col)}
                onChange={(e) => setVisibleColumns((prev) => e.target.checked ? [...prev, col] : prev.filter((item) => item !== col))}
              /> {col}
            </label>
          ))}
        </div>
      )}

      {loading ? <p className="mt-4 text-sm">Carregando...</p> : rows.length === 0 ? <p className="mt-4 text-sm">Nenhum resultado para os filtros selecionados.</p> : (
        <div className="mt-4 overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th key={col} className="cursor-pointer border-b p-2 text-left" onClick={() => { setSortBy(col); setSortOrder(sortBy === col && sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {visibleColumns.map((col, cIdx) => {
                    const value = row[col];
                    if (cIdx === 0 && col === 'marcas') {
                      return <td key={col} className="border-b p-2"><a className="text-sky-700 underline" href={`/?term=${encodeURIComponent(String(value ?? ''))}&mode=matricula`}>{String(value ?? '-')}</a></td>;
                    }
                    if (Array.isArray(value)) {
                      return <td key={col} className="border-b p-2">{value.map((item, i) => <div key={i}>{item.nome} ({item.estado}) - {item.percentual}</div>)}</td>;
                    }
                    return <td key={col} className="border-b p-2">{String(value ?? '-')}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span>Total: {total}</span>
        <div className="flex gap-2">
          <button className="rounded border px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span>Página {page}</span>
          <button className="rounded border px-2 py-1" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      </div>
    </section>
  );
}
