import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Button } from '@/src/components/ui/Button';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';
import { processAndSaveAvatar } from '@/src/utils/avatar';

const CROP_SIZE = 280;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CameraAvatarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const updateChild = useBankStore((s) => s.updateChild);

  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const captureScale = useSharedValue(1);
  const captureAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    haptics.medium();
    captureScale.value = withSpring(0.85, { damping: 10, stiffness: 300 });
    setTimeout(() => {
      captureScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    }, 150);

    const result = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    if (result?.uri) {
      setPhoto(result.uri);
    }
  }, [captureScale]);

  const handleRetake = useCallback(() => {
    haptics.light();
    setPhoto(null);
  }, []);

  const handleUse = useCallback(async () => {
    if (!selectedChild || !photo) return;
    setProcessing(true);

    try {
      const permanentUri = await processAndSaveAvatar(photo);
      updateChild(selectedChild.id, { avatarUrl: permanentUri });

      // Sync with backend
      try {
        await bankApi.updateChild(selectedChild.id, { avatarUrl: permanentUri });
      } catch {
        // Keep local change even if backend fails
      }

      haptics.success();
      router.dismiss(2);
    } catch {
      haptics.error();
    } finally {
      setProcessing(false);
    }
  }, [selectedChild, photo, updateChild, router]);

  if (!permission) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[17px] font-sans text-text-secondary">
            {t('common.loading')}
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (!permission.granted) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="camera-off" size={72} color="#e5e5d8" />
          <Text className="text-[17px] font-sans-semibold text-text text-center mt-5">
            {t('modals.cameraAvatar.title', { defaultValue: 'Precisamos de acesso à câmera' })}
          </Text>
          <View className="mt-5">
            <Button
              title={t('common.confirm')}
              onPress={requestPermission}
              variant="primary"
            />
          </View>
          <View className="mt-3">
            <Button
              title={t('common.back')}
              onPress={() => router.back()}
              variant="ghost"
            />
          </View>
        </View>
      </SafeArea>
    );
  }

  if (photo) {
    return (
      <SafeArea edges={['top']}>
        <View className="flex-1 bg-black">
          {/* Circular crop overlay preview */}
          <View className="flex-1 items-center justify-center">
            <View
              className="rounded-full overflow-hidden border-4 border-primary"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            >
              <Image
                source={{ uri: photo }}
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
                contentFit="cover"
              />
            </View>
            <Text className="text-[15px] font-sans text-white/70 mt-4">
              {t('modals.cameraAvatar.previewHint', { defaultValue: 'Pré-visualização da foto' })}
            </Text>
          </View>

          <View className="flex-row gap-4 px-6 pb-10">
            <View className="flex-1">
              <Button
                title={t('modals.cameraAvatar.retake', { defaultValue: 'Tirar outra' })}
                onPress={handleRetake}
                variant="secondary"
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title={t('modals.cameraAvatar.use', { defaultValue: 'Usar foto' })}
                onPress={handleUse}
                variant="primary"
                fullWidth
                loading={processing}
              />
            </View>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['top']}>
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="front"
        >
          {/* Circular overlay guide */}
          <View className="flex-1 items-center justify-center">
            <View
              className="rounded-full border-4 border-white/50"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            />
            <Text className="text-[15px] font-sans text-white/60 mt-4">
              {t('modals.cameraAvatar.guideText', { defaultValue: 'Enquadre seu rosto no círculo' })}
            </Text>
          </View>
        </CameraView>

        {/* Controls */}
        <View className="flex-row items-center justify-center py-8 bg-black">
          <Pressable onPress={() => router.back()} className="absolute left-6">
            <MaterialCommunityIcons name="close" size={34} color="#ffffff" />
          </Pressable>

          <AnimatedPressable
            onPress={handleCapture}
            onPressIn={() => {
              captureScale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
            }}
            onPressOut={() => {
              captureScale.value = withSpring(1, { damping: 10, stiffness: 300 });
            }}
            className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
            style={captureAnimStyle}
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </AnimatedPressable>
        </View>
      </View>
    </SafeArea>
  );
}
