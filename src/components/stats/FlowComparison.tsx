import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrency } from '@/src/hooks/useCurrency';

interface FlowComparisonProps {
  totalIn: number;
  totalOut: number;
  width: number;
}

export function FlowComparison({ totalIn, totalOut, width }: FlowComparisonProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();

  const max = Math.max(totalIn, totalOut, 1);
  const barMaxW = width - 32;
  const barH = 28;
  const inW = Math.max((totalIn / max) * barMaxW, 8);
  const outW = Math.max((totalOut / max) * barMaxW, 8);

  const net = totalIn - totalOut;
  const netPositive = net >= 0;

  return (
    <View>
      {/* Deposits */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <MaterialCommunityIcons name="arrow-down-circle" size={18} color="#22c55e" />
          <Text className="text-[13px] font-sans-medium text-text-secondary ml-2 flex-1">
            {t('stats.deposited')}
          </Text>
          <Text className="text-[16px] font-sans-bold text-success">
            +{format(totalIn)}
          </Text>
        </View>
        <Svg width={width - 32} height={barH}>
          <Rect x={0} y={0} width={barMaxW} height={barH} rx={barH / 2} fill="#f0f0ea" />
          <Rect x={0} y={0} width={inW} height={barH} rx={barH / 2} fill="#22c55e" />
        </Svg>
      </View>

      {/* Withdrawals */}
      <View className="mb-5">
        <View className="flex-row items-center mb-2">
          <MaterialCommunityIcons name="arrow-up-circle" size={18} color="#ef4444" />
          <Text className="text-[13px] font-sans-medium text-text-secondary ml-2 flex-1">
            {t('stats.withdrawn')}
          </Text>
          <Text className="text-[16px] font-sans-bold text-danger">
            -{format(totalOut)}
          </Text>
        </View>
        <Svg width={width - 32} height={barH}>
          <Rect x={0} y={0} width={barMaxW} height={barH} rx={barH / 2} fill="#f0f0ea" />
          <Rect x={0} y={0} width={outW} height={barH} rx={barH / 2} fill="#ef4444" />
        </Svg>
      </View>

      {/* Net result */}
      <View
        className="flex-row items-center justify-center py-3 rounded-2xl"
        style={{ backgroundColor: netPositive ? '#f0fdf4' : '#fef2f2' }}
      >
        <MaterialCommunityIcons
          name={netPositive ? 'trending-up' : 'trending-down'}
          size={22}
          color={netPositive ? '#22c55e' : '#ef4444'}
        />
        <Text
          className="text-[15px] font-sans-bold ml-2"
          style={{ color: netPositive ? '#22c55e' : '#ef4444' }}
        >
          {t('stats.netResult')}: {netPositive ? '+' : ''}{format(net)}
        </Text>
      </View>
    </View>
  );
}
