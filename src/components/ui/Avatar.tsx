import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { getAvatarById, getDefaultAvatar } from '@/src/constants/avatars';
import { isPhotoUri } from '@/src/utils/avatar';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  avatarId?: string;
  imageUri?: string;
  size?: AvatarSize;
  name?: string;
}

const sizeMap: Record<AvatarSize, { container: string; emoji: string; image: number }> = {
  sm: { container: 'w-10 h-10 rounded-full', emoji: 'text-lg', image: 40 },
  md: { container: 'w-14 h-14 rounded-full', emoji: 'text-2xl', image: 56 },
  lg: { container: 'w-20 h-20 rounded-full', emoji: 'text-4xl', image: 80 },
  xl: { container: 'w-28 h-28 rounded-full', emoji: 'text-6xl', image: 112 },
};

export function Avatar({ avatarId, imageUri, size = 'md', name }: AvatarProps) {
  const sizeStyle = sizeMap[size];

  // Auto-detect: if avatarId is actually a photo URI, treat it as imageUri
  const resolvedImageUri = imageUri || (isPhotoUri(avatarId) ? avatarId : undefined);

  if (resolvedImageUri) {
    return (
      <View className={`${sizeStyle.container} overflow-hidden`}>
        <Image
          source={{ uri: resolvedImageUri }}
          style={{ width: sizeStyle.image, height: sizeStyle.image }}
          contentFit="cover"
        />
      </View>
    );
  }

  const avatar = avatarId ? getAvatarById(avatarId) : getDefaultAvatar();
  const bgColor = avatar?.backgroundColor ?? '#F3F4F6';
  const emoji = avatar?.emoji ?? '\u{1F464}';

  return (
    <View
      className={`${sizeStyle.container} items-center justify-center`}
      style={{ backgroundColor: bgColor }}
    >
      <Text className={sizeStyle.emoji}>{emoji}</Text>
    </View>
  );
}
