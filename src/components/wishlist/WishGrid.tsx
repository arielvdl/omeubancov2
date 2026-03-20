import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WishCard } from './WishCard';
import type { WishItem } from '@/src/types/wishlist';

interface WishGridProps {
  items: WishItem[];
  onItemPress: (item: WishItem) => void;
}

export function WishGrid({ items, onItemPress }: WishGridProps) {
  const { i18n } = useTranslation();

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, WishItem[]> = {};
    for (const item of items) {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // Sort keys descending (newest first)
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  const formatMonthHeader = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    const formatted = date.toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <View style={{ gap: 24 }}>
      {groupedByMonth.map(([monthKey, monthItems]) => (
        <View key={monthKey}>
          {/* Month header */}
          <Text className="text-[15px] font-sans-semibold text-text-secondary mb-3 px-1">
            {formatMonthHeader(monthKey)}
          </Text>
          {/* Grid 2 columns */}
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {monthItems.map((item) => (
              <View key={item.id} style={{ width: '48%' }}>
                <WishCard item={item} onPress={onItemPress} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
