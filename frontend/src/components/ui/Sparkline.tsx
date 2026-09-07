// src/components/ui/Sparkline.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';

export interface SparklineProps {
  data: number[];
  color: string;
}

export default function Sparkline({ data, color }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{
      data,
      borderColor: color,
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: `${color}15`,
    }],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      animation: false,
    },
    scales: {
      x: { display: false },
      y: { display: false, min: Math.min(...data) * 0.9 },
    },
    layout: { padding: 0 },
  };

  return (
    <div className="h-10 w-24 ml-auto opacity-80 pointer-events-none transition-all duration-500">
      <Line data={chartData} options={options} />
    </div>
  );
}