'use client';

import { useMemo } from 'react';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';
import { getActiveLenses } from '@/lib/convergence/lenses';

interface LensWeightsChartProps {
  lensWeights: LensWeights;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

export default function LensWeightsChart({
  lensWeights,
  size = 'small',
  showLabels = true,
}: LensWeightsChartProps) {
  const chartData = useMemo(() => {
    const activeLenses = getActiveLenses(lensWeights);
    if (activeLenses.length === 0) return null;

    const lensAbbrev: Record<string, string> = {
      'Scientific': 'Sci',
      'Psychological': 'Psy',
      'Philosophical': 'Phi',
      'Religious/Spiritual': 'Rel',
      'Historical/Anthropological': 'Hist',
      'Symbolic/Occult': 'Sym',
      'Mathematical': 'Math'
    };

    const maxWeight = Math.max(...activeLenses.map(l => lensWeights[l.id as keyof LensWeights] || 0), 1);

    return activeLenses
      .map(lens => ({
        id: lens.id,
        name: lens.name,
        abbrev: lensAbbrev[lens.name] || lens.name.substring(0, 4),
        weight: lensWeights[lens.id as keyof LensWeights] || 0,
        normalized: (lensWeights[lens.id as keyof LensWeights] || 0) / maxWeight,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [lensWeights]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-amber-100/60 text-sm">No active lenses</div>
    );
  }

  // Size configurations
  const sizeConfig = {
    small: { width: 200, height: 150, barHeight: 12, fontSize: 10, spacing: 16 },
    medium: { width: 300, height: 200, barHeight: 16, fontSize: 12, spacing: 20 },
    large: { width: 400, height: 300, barHeight: 20, fontSize: 14, spacing: 24 },
  };

  const config = sizeConfig[size];
  const barWidth = config.width - 80; // Leave space for labels and values
  const startY = 20;
  const labelWidth = 50;

  // Color gradient based on weight
  const getBarColor = (weight: number) => {
    if (weight >= 60) return '#a855f7'; // Purple (high)
    if (weight >= 30) return '#c084fc'; // Light purple (medium)
    return '#d8b4fe'; // Lighter purple (low)
  };

  return (
    <div className="inline-block">
      <svg
        width={config.width}
        height={config.height}
        className="bg-zinc-900/30 rounded-lg"
        viewBox={`0 0 ${config.width} ${config.height}`}
      >
        {/* Title */}
        <text
          x={config.width / 2}
          y={12}
          textAnchor="middle"
          className="fill-amber-100"
          fontSize={config.fontSize + 2}
          fontWeight="600"
        >
          Lens Weights
        </text>

        {/* Bars */}
        {chartData.map((lens, index) => {
          const y = startY + index * config.spacing;
          const barLength = lens.normalized * barWidth;
          const color = getBarColor(lens.weight);

          return (
            <g key={lens.id}>
              {/* Label */}
              {showLabels && (
                <text
                  x={0}
                  y={y + config.barHeight / 2 + config.fontSize / 3}
                  className="fill-amber-100/90"
                  fontSize={config.fontSize}
                  fontWeight="500"
                >
                  {lens.abbrev}
                </text>
              )}

              {/* Bar background */}
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={config.barHeight}
                rx={config.barHeight / 2}
                className="fill-zinc-800/50"
              />

              {/* Bar fill */}
              <rect
                x={labelWidth}
                y={y}
                width={barLength}
                height={config.barHeight}
                rx={config.barHeight / 2}
                fill={color}
                opacity={0.8}
              />

              {/* Weight value */}
              <text
                x={labelWidth + barWidth + 8}
                y={y + config.barHeight / 2 + config.fontSize / 3}
                className="fill-amber-100/70"
                fontSize={config.fontSize}
              >
                {lens.weight}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

