'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { BRAZIL_GEOJSON_URL, normalizeBrazilStateName, stateNameByUf, stateUfByName } from '@/lib/charts/brazilGeoJson';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type BrazilMapChartProps = {
  data: Array<{ estado: string; total: number }>;
  title: string;
  height?: number;
};

const MAP_NAME = 'brazil-custom';

let mapRegistered = false;
let mapRegistrationPromise: Promise<void> | null = null;

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

async function ensureMapRegistration() {
  if (mapRegistered) {
    return;
  }

  if (!mapRegistrationPromise) {
    mapRegistrationPromise = fetch(BRAZIL_GEOJSON_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao carregar o mapa dos estados.');
        }

        const geoJson = await response.json();
        echarts.registerMap(MAP_NAME, geoJson as never);
        mapRegistered = true;
      })
      .finally(() => {
        if (!mapRegistered) {
          mapRegistrationPromise = null;
        }
      });
  }

  await mapRegistrationPromise;
}

export default function BrazilMapChart({ data, title, height = 420 }: BrazilMapChartProps) {
  const [ready, setReady] = useState(mapRegistered);

  useEffect(() => {
    let isMounted = true;

    ensureMapRegistration()
      .then(() => {
        if (isMounted) {
          setReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const max = Math.max(...data.map((item) => item.total), 0);

  const mapData = useMemo(
    () => {
      const totalsByState = new Map(data.map((item) => [item.estado.toUpperCase(), item.total]));

      return Object.keys(stateNameByUf).map((uf) => ({
        name: stateNameByUf[uf] ?? uf,
        uf,
        value: totalsByState.get(uf) ?? 0,
        fullName: stateNameByUf[uf] ?? uf,
      }));
    },
    [data],
  );

  const option: EChartsOption = {
    animationDuration: 1100,
    animationEasing: 'quarticOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#020617',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params as { data?: { fullName?: string; uf?: string; value?: number; name?: string }; name: string; value?: number };
        const normalizedName = normalizeBrazilStateName(p.name);
        const uf = p.data?.uf ?? stateUfByName[normalizedName] ?? p.name;
        const stateName = p.data?.fullName ?? stateNameByUf[uf] ?? p.name;
        const value = typeof p.value === 'number' ? p.value : p.data?.value ?? 0;
        return `<strong>${stateName}</strong> (${uf})<br/>Aeronaves: ${formatNumber(value)}`;
      },
    },
    visualMap: {
      min: 0,
      max: max > 0 ? max : 1,
      orient: 'horizontal',
      left: 'center',
      bottom: 16,
      text: ['Maior', 'Menor'],
      calculable: true,
      itemWidth: 14,
      itemHeight: 120,
      textStyle: { color: '#475569' },
      inRange: {
        color: ['#dbeafe', '#7dd3fc', '#60a5fa', '#6366f1', '#4338ca'],
      },
    },
    series: [
      {
        type: 'map',
        map: MAP_NAME,
        nameProperty: 'name',
        roam: true,
        zoom: 1,
        selectedMode: false,
        label: {
          show: true,
          color: '#0f172a',
          fontSize: 9,
          formatter: (params) => {
            const name = String(params.name ?? '');
            const uf = stateUfByName[normalizeBrazilStateName(name)] ?? name;
            return uf;
          },
        },
        itemStyle: {
          borderColor: '#e2e8f0',
          borderWidth: 1,
          areaColor: '#f8fafc',
          shadowBlur: 12,
          shadowColor: 'rgba(30, 41, 59, 0.12)',
        },
        emphasis: {
          label: {
            color: '#ffffff',
            fontWeight: 'bold',
          },
          itemStyle: {
            areaColor: '#312e81',
            borderColor: '#c4b5fd',
            borderWidth: 1.25,
            shadowBlur: 18,
            shadowColor: 'rgba(49, 46, 129, 0.28)',
          },
        },
        data: mapData,
      },
    ],
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {ready ? (
        <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} />
      ) : (
        <div className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>
          Carregando mapa do Brasil...
        </div>
      )}
    </div>
  );
}
