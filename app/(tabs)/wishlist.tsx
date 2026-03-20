import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { wishlistApi } from '@/src/services/api/wishlist';
import { haptics } from '@/src/utils/haptics';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import type { WishItem } from '@/src/types/wishlist';

type FilterType = 'all' | 'top' | 'conquered';

// Row: either a month header or a pair of items
type GridRow =
  | { type: 'header'; month: string }
  | { type: 'items'; left: WishItem; right?: WishItem };

type FeedRow =
  | { type: 'header'; month: string }
  | { type: 'item'; data: WishItem };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WishlistScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const items = useWishlistStore((s) => s.items);
  const setItems = useWishlistStore((s) => s.setItems);
  const setGoal = useWishlistStore((s) => s.setGoal);
  const setLoading = useWishlistStore((s) => s.setLoading);

  const wishlistLayout = useSettingsStore((s) => s.wishlistLayout);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchWishlist = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const [itemsRes, goalRes] = await Promise.all([
        wishlistApi.getByChild(selectedChild.id),
        wishlistApi.getGoal(selectedChild.id),
      ]);
      if (Array.isArray(itemsRes.data?.data)) {
        const fetchedItems = itemsRes.data.data as WishItem[];
        setItems(fetchedItems);
        // Prefetch first 6 images for instant display
        const urls = fetchedItems.slice(0, 6).map((i) => i.photoUrl).filter(Boolean);
        if (urls.length > 0) {
          Image.prefetch(urls).catch(() => {});
        }
      }
      setGoal(goalRes.data?.data ?? null);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, [selectedChild, setItems, setGoal, setLoading]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  }, [fetchWishlist]);

  const filteredItems = useMemo(() => {
    if (!selectedChild) return [];
    const childItems = items.filter((i) => i.childId === selectedChild.id);
    switch (filter) {
      case 'top':
        return childItems.filter((i) => i.status === 'active' && i.desireLevel === 3);
      case 'conquered':
        return childItems.filter((i) => i.status === 'conquered');
      default:
        return childItems.filter((i) => i.status === 'active');
    }
  }, [items, selectedChild, filter]);

  // Build virtualized grid rows (month headers + item pairs)
  const gridRows = useMemo(() => {
    const groups: Record<string, WishItem[]> = {};
    for (const item of filteredItems) {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const rows: GridRow[] = [];

    for (const key of sortedKeys) {
      const date = new Date(Number(key.split('-')[0]), Number(key.split('-')[1]) - 1);
      const formatted = date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
      rows.push({ type: 'header', month: formatted.charAt(0).toUpperCase() + formatted.slice(1) });

      const monthItems = groups[key];
      for (let i = 0; i < monthItems.length; i += 2) {
        rows.push({ type: 'items', left: monthItems[i], right: monthItems[i + 1] });
      }
    }
    return rows;
  }, [filteredItems, i18n.language]);

  const feedRows = useMemo(() => {
    const groups: Record<string, WishItem[]> = {};
    for (const item of filteredItems) {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const rows: FeedRow[] = [];

    for (const key of sortedKeys) {
      const date = new Date(Number(key.split('-')[0]), Number(key.split('-')[1]) - 1);
      const formatted = date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
      rows.push({ type: 'header', month: formatted.charAt(0).toUpperCase() + formatted.slice(1) });

      for (const item of groups[key]) {
        rows.push({ type: 'item', data: item });
      }
    }
    return rows;
  }, [filteredItems, i18n.language]);

  const handleItemPress = useCallback((item: WishItem) => {
    haptics.selection();
    router.push({ pathname: '/(modals)/wish-detail', params: { id: item.id } });
  }, [router]);

  const canAddWishItem = useSubscriptionStore((s) => s.canAddWishItem);

  const handleNewWish = useCallback(() => {
    haptics.light();
    if (!canAddWishItem()) {
      router.push({ pathname: '/(modals)/paywall', params: { feature: 'wish_item' } });
      return;
    }
    router.push('/(modals)/wish-camera');
  }, [router, canAddWishItem]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('wishlist.filterAll') },
    { key: 'top', label: '\u2764\uFE0F\u2764\uFE0F\u2764\uFE0F' },
    { key: 'conquered', label: t('wishlist.filterConquered') },
  ];

  const renderRow = useCallback(({ item: row }: { item: GridRow }) => {
    if (row.type === 'header') {
      return (
        <Text className="text-[15px] font-sans-semibold text-text-secondary mb-3 mt-2 px-1">
          {row.month}
        </Text>
      );
    }
    return (
      <View className="flex-row mb-3" style={{ gap: 12 }}>
        <View style={{ flex: 1 }}>
          <MiniCard item={row.left} onPress={handleItemPress} />
        </View>
        <View style={{ flex: 1 }}>
          {row.right ? (
            <MiniCard item={row.right} onPress={handleItemPress} />
          ) : null}
        </View>
      </View>
    );
  }, [handleItemPress]);

  const getRowKey = useCallback((row: GridRow, index: number) => {
    if (row.type === 'header') return `h_${row.month}`;
    return `r_${row.left.id}`;
  }, []);

  const renderFeedRow = useCallback(({ item: row }: { item: FeedRow }) => {
    if (row.type === 'header') {
      return (
        <Text
          className="text-[15px] font-sans-semibold text-text-secondary mb-3 mt-2 px-1"
          style={{ backgroundColor: '#FAFAF5', paddingVertical: 4 }}
        >
          {row.month}
        </Text>
      );
    }
    return <FeedCard item={row.data} onPress={handleItemPress} />;
  }, [handleItemPress]);

  const getFeedRowKey = useCallback((row: FeedRow, index: number) => {
    if (row.type === 'header') return `fh_${row.month}`;
    return `fi_${row.data.id}`;
  }, []);

  return (
    <SafeArea>
      {/* Fixed header + filters */}
      <View className="px-7 pt-7 pb-2">
        <Text className="text-[26px] font-sans-bold text-text mb-5">
          {t('wishlist.title')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  haptics.selection();
                  setFilter(f.key);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isActive ? '#FFD600' : '#ffffff',
                  borderWidth: isActive ? 0 : 1,
                  borderColor: '#e5e5d8',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    color: isActive ? '#1a1a0e' : '#6b6b5a',
                    lineHeight: 18,
                    textAlignVertical: 'center',
                    includeFontPadding: false,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Virtualized list */}
      {filteredItems.length > 0 ? (
        wishlistLayout === 'feed' ? (
          <FlatList
            data={feedRows}
            renderItem={renderFeedRow}
            keyExtractor={getFeedRowKey}
            contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 16, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD600" />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            stickyHeaderIndices={feedRows.reduce<number[]>((acc, row, idx) => {
              if (row.type === 'header') acc.push(idx);
              return acc;
            }, [])}
          />
        ) : (
          <FlatList
            data={gridRows}
            renderItem={renderRow}
            keyExtractor={getRowKey}
            contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 16, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD600" />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews
          />
        )
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="heart-outline" size={72} color="#e5e5d8" />
          <Text className="text-[18px] font-sans-semibold text-text-secondary mt-5">
            {t('wishlist.empty')}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center">
            {t('wishlist.emptyHint')}
          </Text>
        </View>
      )}

      {/* FAB */}
      <Pressable
        onPress={handleNewWish}
        className="absolute bottom-28 right-7 w-14 h-14 rounded-full bg-primary items-center justify-center"
        style={{
          shadowColor: '#FFD600',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <MaterialCommunityIcons name="camera-plus" size={26} color="#1a1a0e" />
      </Pressable>
    </SafeArea>
  );
}

// Inline card component — lightweight for virtualization
function MiniCard({ item, onPress }: { item: WishItem; onPress: (item: WishItem) => void }) {
  const { format } = useCurrency();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isConquered = item.status === 'conquered';

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.selection();
        onPress(item);
      }}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      style={animatedStyle}
    >
      <View
        className="bg-surface rounded-2xl overflow-hidden"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
      >
        <View className="aspect-square relative bg-[#f0f0e8]">
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
            recyclingKey={item.id}
            cachePolicy="disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
          />
          {isConquered && (
            <View className="absolute inset-0 bg-black/30 items-center justify-center">
              <View className="bg-green-500 rounded-full p-2">
                <MaterialCommunityIcons name="check" size={24} color="#ffffff" />
              </View>
            </View>
          )}
          {item.isGoal && !isConquered && (
            <View className="absolute top-2 right-2 bg-primary-500 rounded-full p-1.5">
              <MaterialCommunityIcons name="flag" size={14} color="#1a1a0e" />
            </View>
          )}
        </View>
        <View className="p-3">
          {item.name && (
            <Text className="text-[14px] font-sans-semibold text-text" numberOfLines={1}>
              {item.name}
            </Text>
          )}
          <View className="flex-row items-center justify-between mt-1.5">
            {item.priceCents != null ? (
              <Text className="text-[13px] font-sans-bold text-primary-700">
                {format(item.priceCents)}
              </Text>
            ) : (
              <View />
            )}
            <View className="flex-row">
              {[1, 2, 3].map((level) => (
                <MaterialCommunityIcons
                  key={level}
                  name={level <= item.desireLevel ? 'heart' : 'heart-outline'}
                  size={14}
                  color={level <= item.desireLevel ? '#FFD600' : '#d4d4c8'}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

// Feed-style card component — full-width Instagram-style layout
function FeedCard({ item, onPress }: { item: WishItem; onPress: (item: WishItem) => void }) {
  const { format } = useCurrency();
  const { i18n } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isConquered = item.status === 'conquered';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.selection();
        onPress(item);
      }}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      style={animatedStyle}
    >
      <View
        className="bg-surface rounded-2xl overflow-hidden mb-4"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
      >
        {/* Photo */}
        <View className="relative" style={{ aspectRatio: 4 / 3 }}>
          <View className="flex-1 bg-[#f0f0e8]">
            <Image
              source={{ uri: item.photoUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
              recyclingKey={item.id}
              cachePolicy="disk"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              placeholderContentFit="cover"
            />
          </View>
          {isConquered && (
            <View className="absolute inset-0 bg-black/30 items-center justify-center">
              <View className="bg-green-500 rounded-full p-3">
                <MaterialCommunityIcons name="check" size={28} color="#ffffff" />
              </View>
            </View>
          )}
          {item.isGoal && !isConquered && (
            <View className="absolute top-3 right-3 bg-primary-500 rounded-full p-2">
              <MaterialCommunityIcons name="flag" size={16} color="#1a1a0e" />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              {item.name ? (
                <Text className="text-[16px] font-sans-semibold text-text" numberOfLines={1}>
                  {item.name}
                </Text>
              ) : null}
              <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                {item.priceCents != null && (
                  <Text className="text-[15px] font-sans-bold text-primary-700">
                    {format(item.priceCents)}
                  </Text>
                )}
                <Text className="text-[13px] font-sans text-text-secondary">
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
            <View className="flex-row" style={{ gap: 2 }}>
              {[1, 2, 3].map((level) => (
                <MaterialCommunityIcons
                  key={level}
                  name={level <= item.desireLevel ? 'heart' : 'heart-outline'}
                  size={18}
                  color={level <= item.desireLevel ? '#FFD600' : '#d4d4c8'}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
