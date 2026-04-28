'use client';

import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type DonutDatum = {
  label: string;
  value: number;
};

type DonutChartProps = {
  title: string;
  data: DonutDatum[];
  centerLabel?: string;
  height?: number;
};

const DONUT_COLORS = ['#2563eb', '#4f46e5', '#0891b2', '#7c3aed', '#0ea5e9', '#6366f1', '#1d4ed8', '#334155'];

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

export default function DonutChart({ title, data, centerLabel = 'Total', height = 330 }: DonutChartProps) {
  if (data.length === 0) {
    return <p className="mt-2 text-xs text-slate-500">Sem dados.</p>;
  }

  const normalizedData = data.map((item) => ({ name: item.label, value: item.value }));
  const total = normalizedData.reduce((acc, item) => acc + item.value, 0);

  const option: EChartsOption = {
    color: DONUT_COLORS,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params as { name: string; value: number; percent: number };
        return `${p.name}<br/>${formatNumber(p.value)} aeronaves (${p.percent.toFixed(1)}%)`;
      },
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#475569', fontSize: 11 },
      formatter: (name: string) => (name.length > 24 ? `${name.slice(0, 24)}…` : name),
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['55%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 7,
          borderColor: '#ffffff',
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(15, 23, 42, 0.12)',
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 700,
            formatter: '{b}\n{d}%',
            color: '#0f172a',
          },
          scale: true,
          scaleSize: 8,
        },
        labelLine: { show: false },
        data: normalizedData,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '35%',
        style: {
          text: formatNumber(total),
          align: 'center',
          fill: '#0f172a',
          fontSize: 24,
          fontWeight: 700,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '47%',
        style: {
          text: centerLabel,
          align: 'center',
          fill: '#64748b',
          fontSize: 12,
          fontWeight: 500,
        },
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
