import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryConfig } from '@/src/constants/categories';
import { useCurrency } from '@/src/hooks/useCurrency';

interface CategoryData {
  category: string;
  total: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  size: number;
}

export function CategoryBreakdown({ data, size }: CategoryBreakdownProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const grandTotal = sorted.reduce((s, d) => s + d.total, 0);

  if (grandTotal === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-[14px] font-sans text-text-secondary">
          {t('common.noData')}
        </Text>
      </View>
    );
  }

  // Donut chart
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;
  const cx = size / 2;
  const cy = size / 2;
  let currentAngle = -Math.PI / 2;

  const arcs = sorted.map((item) => {
    const frac = item.total / grandTotal;
    const angle = frac * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const config = getCategoryConfig(item.category);

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    return { d, color: config.color, category: item.category };
  });

  return (
    <View>
      {/* Donut */}
      <View className="items-center mb-5">
        <Svg width={size} height={size}>
          {arcs.map((arc, i) => (
            <Path key={i} d={arc.d} fill={arc.color} />
          ))}
        </Svg>
      </View>

      {/* Legend */}
      <View className="gap-3">
        {sorted.map((item) => {
          const config = getCategoryConfig(item.category);
          const pct = Math.round((item.total / grandTotal) * 100);
          return (
            <View key={item.category} className="flex-row items-center">
              <View
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: config.color }}
              />
              <MaterialCommunityIcons
                name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={18}
                color={config.color}
                style={{ marginRight: 8 }}
              />
              <Text className="text-[14px] font-sans-medium text-text flex-1">
                {t(`categories.${item.category}`)}
              </Text>
              <Text className="text-[14px] font-sans-semibold text-text mr-2">
                {format(item.total)}
              </Text>
              <Text className="text-[12px] font-sans text-text-secondary w-10 text-right">
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
