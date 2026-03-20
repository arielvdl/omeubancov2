import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { wishlistApi, wishlistUploadApi } from '@/src/services/api/wishlist';
import { processAndSaveWishPhoto } from '@/src/utils/wishlist-image';
import type { WishItem } from '@/src/types/wishlist';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WishCameraScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const addItem = useWishlistStore((s) => s.addItem);
  const updateItem = useWishlistStore((s) => s.updateItem);

  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleSave = useCallback(async () => {
    if (!selectedChild || !photo) return;
    setSaving(true);

    try {
      // 1. Compress & save locally (~5MB raw → ~100-200KB JPEG)
      const localUri = await processAndSaveWishPhoto(photo);

      // 2. Add to store immediately with local URI → instant gallery display
      const tempId = `temp_${Date.now()}`;
      const optimisticItem: WishItem = {
        id: tempId,
        childId: selectedChild.id,
        photoUrl: localUri,
        name: null,
        priceCents: null,
        desireLevel: 2,
        status: 'active',
        isGoal: false,
        sortOrder: 0,
        conqueredAt: null,
        note: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addItem(optimisticItem);
      haptics.success();
      router.back();

      // 3. Upload compressed file to GCS in background
      const uploadRes = await wishlistUploadApi.uploadPhoto(localUri);
      const remoteUrl = uploadRes.data.url;

      // 4. Create wish item on server with remote URL
      const res = await wishlistApi.create(selectedChild.id, {
        photoUrl: remoteUrl,
        desireLevel: 2,
      });

      // 5. Swap temp item for the real server item
      if (res.data?.data) {
        const serverItem = res.data.data as WishItem;
        // Keep local URI for display (already cached), update ID and server fields
        useWishlistStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === tempId ? { ...serverItem, photoUrl: localUri } : i
          ),
        }));
      }
    } catch (err: any) {
      haptics.error();
      // Remove optimistic item on failure
      useWishlistStore.setState((state) => ({
        items: state.items.filter((i) => !i.id.startsWith('temp_')),
      }));
      const msg = err?.response?.data?.error
        || err?.response?.data?.message
        || err?.message
        || t('common.errorGeneric');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  }, [selectedChild, photo, addItem, updateItem, router, t]);

  // Permission loading
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

  // Permission not granted
  if (!permission.granted) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="camera-off" size={72} color="#e5e5d8" />
          <Text className="text-[17px] font-sans-semibold text-text text-center mt-5">
            {t('wishlist.cameraPermission')}
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

  // Photo preview
  if (photo) {
    return (
      <SafeArea edges={['top']}>
        <View className="flex-1 bg-black">
          <View className="flex-1">
            <Image
              source={{ uri: photo }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>

          <View className="flex-row gap-4 px-6 pb-10 pt-4 bg-black">
            <View className="flex-1">
              <Pressable
                onPress={handleRetake}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#1a1a0e' }}>
                  {t('wishlist.retake')}
                </Text>
              </Pressable>
            </View>
            <View className="flex-1">
              <Button
                title={t('wishlist.savePhoto')}
                onPress={handleSave}
                variant="primary"
                fullWidth
                loading={saving}
              />
            </View>
          </View>
        </View>
      </SafeArea>
    );
  }

  // Camera view
  return (
    <SafeArea edges={['top']}>
      <View className="flex-1 bg-black">
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing="back"
          />
          {/* Guide overlay — camera viewfinder/crosshair */}
          <View className="flex-1 items-center justify-center" pointerEvents="none">
            <View style={{ width: 240, height: 240, position: 'relative' }}>
              {/* Top-left corner */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 3, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderTopLeftRadius: 8 }} />
              {/* Top-right corner */}
              <View style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 3, borderRightWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderTopRightRadius: 8 }} />
              {/* Bottom-left corner */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderBottomLeftRadius: 8 }} />
              {/* Bottom-right corner */}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 3, borderRightWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderBottomRightRadius: 8 }} />
              {/* Center crosshair */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 }}>
                <MaterialCommunityIcons name="crosshairs" size={24} color="rgba(255,255,255,0.4)" />
              </View>
            </View>
            <Text className="text-[15px] font-sans text-white/60 mt-5">
              {t('wishlist.cameraGuide')}
            </Text>
          </View>
        </View>

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
