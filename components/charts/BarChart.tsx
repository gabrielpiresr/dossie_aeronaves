'use client';

import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type BarSeries = {
  name: string;
  data: number[];
  color?: string;
  stack?: string;
};

type BarChartProps = {
  categories: string[];
  series: BarSeries[];
  height?: number;
  horizontal?: boolean;
};

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

export default function BarChart({ categories, series, height = 320, horizontal = false }: BarChartProps) {
  if (categories.length === 0 || series.length === 0) {
    return <p className="mt-2 text-xs text-slate-500">Sem dados.</p>;
  }

  const palette = ['#2563eb', '#4f46e5', '#0891b2', '#7c3aed', '#0284c7'];

  const option: EChartsOption = {
    color: palette,
    animationDuration: 900,
    animationEasing: 'quarticOut',
    grid: {
      top: 24,
      left: 50,
      right: 20,
      bottom: horizontal ? 24 : 62,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const rows = (Array.isArray(params) ? params : [params]) as Array<{ marker: string; seriesName: string; value: number; axisValue: string }>;
        const header = rows[0]?.axisValue ?? '';
        const body = rows.map((item) => `${item.marker}${item.seriesName}: <strong>${formatNumber(item.value)}</strong>`).join('<br/>');
        return `${header}<br/>${body}`;
      },
    },
    xAxis: horizontal
      ? {
          type: 'value',
          axisLabel: { color: '#64748b', formatter: (value: number) => formatNumber(value) },
          splitLine: { lineStyle: { color: '#e2e8f0' } },
        }
      : {
          type: 'category',
          data: categories,
          axisLabel: {
            color: '#64748b',
            interval: 0,
            rotate: categories.length > 7 ? 22 : 0,
            fontSize: 11,
          },
          axisTick: { alignWithLabel: true },
        },
    yAxis: horizontal
      ? {
          type: 'category',
          data: categories,
          axisLabel: { color: '#64748b', fontSize: 11 },
          axisTick: { show: false },
        }
      : {
          type: 'value',
          axisLabel: { color: '#64748b', formatter: (value: number) => formatNumber(value) },
          splitLine: { lineStyle: { color: '#e2e8f0' } },
        },
    series: series.map((item, index) => ({
      name: item.name,
      type: 'bar',
      data: item.data,
      stack: item.stack,
      barMaxWidth: 38,
      itemStyle: {
        color: item.color ?? palette[index % palette.length],
        borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0],
        shadowBlur: 8,
        shadowColor: 'rgba(15, 23, 42, 0.16)',
      },
      emphasis: {
        itemStyle: {
          opacity: 0.86,
        },
      },
    })),
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
