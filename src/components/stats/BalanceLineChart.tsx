import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useCurrency } from '@/src/hooks/useCurrency';

interface DataPoint {
  date: string;
  balance: number;
}

interface BalanceLineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
}

export function BalanceLineChart({ data, width, height }: BalanceLineChartProps) {
  const { format } = useCurrency();

  if (data.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-[14px] font-sans text-text-secondary">
          Dados insuficientes
        </Text>
      </View>
    );
  }

  const padding = { top: 20, right: 16, bottom: 56, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const balances = data.map((d) => d.balance);
  const minVal = Math.min(...balances);
  const maxVal = Math.max(...balances);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.balance - minVal) / range) * chartH,
  }));

  // Smooth line path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Fill area path
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${padding.top + chartH}` +
    ` L ${points[0].x} ${padding.top + chartH} Z`;

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const trending = data[data.length - 1].balance >= data[0].balance;
  const lineColor = trending ? '#22c55e' : '#ef4444';

  // Date labels (first, middle, last)
  const dateLabels = [
    { x: firstPoint.x, label: formatShortDate(data[0].date) },
    { x: (firstPoint.x + lastPoint.x) / 2, label: formatShortDate(data[Math.floor(data.length / 2)].date) },
    { x: lastPoint.x, label: formatShortDate(data[data.length - 1].date) },
  ];

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.2} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartH * (1 - frac);
          return (
            <Rect
              key={frac}
              x={padding.left}
              y={y}
              width={chartW}
              height={0.5}
              fill="#e5e5d8"
              opacity={0.5}
            />
          );
        })}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />

        {/* Current point */}
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={lineColor} />
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={8} fill={lineColor} opacity={0.2} />
      </Svg>

      {/* Date labels */}
      <View className="flex-row justify-between" style={{ paddingHorizontal: padding.left }}>
        {dateLabels.map((dl, i) => (
          <Text
            key={i}
            className="text-[11px] font-sans text-text-secondary"
            style={{ textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}
          >
            {dl.label}
          </Text>
        ))}
      </View>

      {/* Min/Max labels */}
      <View className="flex-row justify-between mt-2" style={{ paddingHorizontal: padding.left }}>
        <Text className="text-[12px] font-sans-medium text-text-secondary">
          Min: {format(minVal)}
        </Text>
        <Text className="text-[12px] font-sans-medium text-text-secondary">
          Max: {format(maxVal)}
        </Text>
      </View>
    </View>
  );
}

function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
