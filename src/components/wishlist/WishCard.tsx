import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '@/src/utils/haptics';
import { useCurrency } from '@/src/hooks/useCurrency';
import type { WishItem } from '@/src/types/wishlist';

interface WishCardProps {
  item: WishItem;
  onPress: (item: WishItem) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WishCard({ item, onPress }: WishCardProps) {
  const scale = useSharedValue(1);
  const { format } = useCurrency();

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
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      style={animatedStyle}
      className="flex-1"
    >
      <View
        className="bg-surface rounded-2xl overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Photo */}
        <View className="aspect-square relative bg-[#f0f0e8]">
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
            recyclingKey={item.id}
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

        {/* Info */}
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
