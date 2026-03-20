import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { wishlistApi } from '@/src/services/api/wishlist';
import type { WishItem } from '@/src/types/wishlist';

interface GoalStackProps {
  items: WishItem[];
  balance: number;
  childId: string;
  onItemPress?: (item: WishItem) => void;
}

const CARD_HEIGHT = 100;
const COLLAPSED_PEEK = 14; // tight peek — just enough to show there's more
const MAX_GOALS = 5;

export function GoalStack({ items, balance, childId, onItemPress }: GoalStackProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const activeGoals = items.filter(
    (i) => i.status === 'active' && i.priceCents != null && i.priceCents > 0
  );

  const readyToBuy = activeGoals.filter((i) => balance >= (i.priceCents ?? 0));
  const inProgress = activeGoals.filter((i) => balance < (i.priceCents ?? 0));
  const sortedGoals = [...readyToBuy, ...inProgress].slice(0, MAX_GOALS);

  if (sortedGoals.length === 0) return null;

  const toggleExpand = () => {
    haptics.selection();
    setExpanded(!expanded);
  };

  // Collapsed: first card full + remaining as peeks
  // Expanded: all cards full with gap
  const collapsedHeight = CARD_HEIGHT + (sortedGoals.length - 1) * COLLAPSED_PEEK;

  return (
    <View>
      {/* Header */}
      <Pressable
        onPress={toggleExpand}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="flag" size={18} color="#FFD600" />
          <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1a1a0e' }}>
            {sortedGoals.length === 1 ? t('wishlist.myGoal') : t('wishlist.myGoals')}
          </Text>
          {sortedGoals.length > 1 && (
            <View style={{ backgroundColor: '#FFD600', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#1a1a0e' }}>
                {sortedGoals.length}
              </Text>
            </View>
          )}
          {readyToBuy.length > 0 && (
            <View style={{ backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#16a34a' }}>
                {readyToBuy.length} {t('wishlist.readyBadge')}
              </Text>
            </View>
          )}
        </View>
        {sortedGoals.length > 1 && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#6b6b5a"
          />
        )}
      </Pressable>

      {/* Wallet stack */}
      {expanded ? (
        // Expanded — full cards with gap
        <View style={{ gap: 10 }}>
          {sortedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              balance={balance}
              childId={childId}
              onPress={() => onItemPress?.(goal)}
            />
          ))}
        </View>
      ) : (
        // Collapsed — stacked like Apple Wallet
        <Pressable onPress={sortedGoals.length > 1 ? toggleExpand : undefined}>
          <View style={{ height: collapsedHeight }}>
            {sortedGoals.map((goal, index) => (
              <WalletCardLayer
                key={goal.id}
                goal={goal}
                balance={balance}
                childId={childId}
                index={index}
                total={sortedGoals.length}
                onPress={() => {
                  if (index === 0) {
                    onItemPress?.(goal);
                  } else {
                    toggleExpand();
                  }
                }}
              />
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

// Stacked card layer (Apple Wallet collapsed style)
function WalletCardLayer({
  goal,
  balance,
  childId,
  index,
  total,
  onPress,
}: {
  goal: WishItem;
  balance: number;
  childId: string;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const { format } = useCurrency();
  const price = goal.priceCents ?? 0;
  const progress = price > 0 ? Math.min(balance / price, 1) : 0;
  const percent = Math.round(progress * 100);
  const canBuy = balance >= price;

  const topOffset = index * COLLAPSED_PEEK;
  const horizontalInset = index * 6;
  const scale = 1 - index * 0.02;
  const opacity = index === 0 ? 1 : Math.max(0.6, 1 - index * 0.12);
  const zIndex = total - index;

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        top: topOffset,
        left: horizontalInset,
        right: horizontalInset,
        zIndex,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 22,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          height: CARD_HEIGHT,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 4 - index,
          borderWidth: canBuy ? 2 : 0,
          borderColor: canBuy ? '#22c55e' : 'transparent',
        }}
      >
        <Image
          source={{ uri: goal.photoUrl }}
          style={{ width: 70, height: 70, borderRadius: 14 }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1a1a0e' }}
            numberOfLines={1}
          >
            {goal.name || 'Sem nome'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#8a6d00' }}>
              {format(price)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: getProgressColor(progress),
              }}
            >
              {percent}%
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#f0f0eb', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                borderRadius: 3,
                width: `${Math.max(percent, 3)}%`,
                backgroundColor: getProgressColor(progress),
              }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Full expanded card
function GoalCard({
  goal,
  balance,
  childId,
  onPress,
}: {
  goal: WishItem;
  balance: number;
  childId: string;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const scale = useSharedValue(1);
  const updateItem = useWishlistStore((s) => s.updateItem);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const price = goal.priceCents ?? 0;
  const progress = price > 0 ? Math.min(balance / price, 1) : 0;
  const percent = Math.round(progress * 100);
  const remaining = Math.max(price - balance, 0);
  const canBuy = balance >= price;

  const handleConquer = useCallback(() => {
    haptics.medium();
    Alert.alert(
      t('wishlist.readyTitle'),
      t('wishlist.readyMessage', { name: goal.name || t('wishlist.noName') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wishlist.conquered'),
          onPress: async () => {
            try {
              await wishlistApi.conquer(childId, goal.id);
              updateItem(goal.id, { status: 'conquered', conqueredAt: new Date().toISOString() });
              haptics.success();
            } catch {
              haptics.error();
            }
          },
        },
      ]
    );
  }, [goal, childId, updateItem, t]);

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      style={animatedStyle}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 22,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
          borderWidth: canBuy ? 2 : 0,
          borderColor: canBuy ? '#22c55e' : 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image
            source={{ uri: goal.photoUrl }}
            style={{ width: 70, height: 70, borderRadius: 14 }}
            contentFit="cover"
            transition={200}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1a1a0e' }}
              numberOfLines={1}
            >
              {goal.name || t('wishlist.noName')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#8a6d00' }}>
                {format(price)}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  color: getProgressColor(progress),
                }}
              >
                {percent}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#f0f0eb', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  borderRadius: 3,
                  width: `${Math.max(percent, 3)}%`,
                  backgroundColor: getProgressColor(progress),
                }}
              />
            </View>
            {remaining > 0 && (
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#6b6b5a', marginTop: 4 }}>
                {t('wishlist.remaining')}: {format(remaining)}
              </Text>
            )}
          </View>
        </View>

        {canBuy && (
          <Pressable
            onPress={handleConquer}
            style={{
              marginTop: 12,
              backgroundColor: '#22c55e',
              borderRadius: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <MaterialCommunityIcons name="check-circle" size={18} color="#ffffff" />
            <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#ffffff' }}>
              {t('wishlist.readyToBuy')}
            </Text>
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

function getProgressColor(p: number) {
  if (p >= 1) return '#22c55e';
  if (p < 0.33) return '#ef4444';
  if (p < 0.66) return '#FFD600';
  return '#22c55e';
}

// Backward compat
export function GoalProgressCard({ goal, balance, onPress }: { goal: WishItem; balance: number; onPress?: () => void }) {
  return <GoalCard goal={goal} balance={balance} childId="" onPress={onPress} />;
}
