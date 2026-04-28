'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { brazilGeoJson, stateNameByUf } from '@/lib/charts/brazilGeoJson';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type BrazilMapChartProps = {
  data: Array<{ estado: string; total: number }>;
  title: string;
  height?: number;
};

const MAP_NAME = 'brazil-custom';

let mapRegistered = false;

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function ensureMapRegistration() {
  if (!mapRegistered) {
    echarts.registerMap(MAP_NAME, brazilGeoJson as never);
    mapRegistered = true;
  }
}

export default function BrazilMapChart({ data, title, height = 420 }: BrazilMapChartProps) {
  ensureMapRegistration();

  const max = Math.max(...data.map((item) => item.total), 0);

  const mapData = useMemo(
    () =>
      data.map((item) => ({
        name: item.estado,
        value: item.total,
        fullName: stateNameByUf[item.estado] ?? item.estado,
      })),
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
        const p = params as { data?: { fullName?: string; name?: string; value?: number }; name: string; value?: number };
        const stateName = p.data?.fullName ?? stateNameByUf[p.name] ?? p.name;
        const value = typeof p.value === 'number' ? p.value : p.data?.value ?? 0;
        return `<strong>${stateName}</strong> (${p.name})<br/>Aeronaves: ${formatNumber(value)}`;
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
        nameProperty: 'sigla',
        roam: true,
        zoom: 1.1,
        selectedMode: false,
        label: {
          show: true,
          color: '#0f172a',
          fontSize: 9,
          formatter: '{b}',
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
      <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}
