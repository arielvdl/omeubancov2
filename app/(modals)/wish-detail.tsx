import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Modal, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { DesireLevelPicker } from '@/src/components/wishlist/DesireLevelPicker';
import { ConfettiEffect } from '@/src/components/effects/ConfettiEffect';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { wishlistApi } from '@/src/services/api/wishlist';
import { haptics } from '@/src/utils/haptics';
import * as MediaLibrary from 'expo-media-library';
import { Paths, File, Directory } from 'expo-file-system';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export default function WishDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { format } = useCurrency();
  const selectedChild = useSelectedChild();

  const items = useWishlistStore((s) => s.items);
  const updateItem = useWishlistStore((s) => s.updateItem);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const setGoal = useWishlistStore((s) => s.setGoal);

  // Track the resolved ID — temp items get swapped for server items
  const [resolvedId, setResolvedId] = useState(id);
  const item = items.find((i) => i.id === resolvedId);

  // When a temp item is swapped for a server item, the temp ID disappears.
  // Detect this and find the replacement item (most recently added for this child).
  useEffect(() => {
    if (!item && resolvedId?.startsWith('temp_') && selectedChild) {
      const replacement = items
        .filter((i) => i.childId === selectedChild.id && !i.id.startsWith('temp_'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (replacement) {
        setResolvedId(replacement.id);
      }
    }
  }, [item, resolvedId, items, selectedChild]);

  // Editable fields
  const [name, setName] = useState(item?.name ?? '');
  const [priceText, setPriceText] = useState(
    item?.priceCents != null ? String(item.priceCents / 100) : ''
  );
  const [desireLevel, setDesireLevel] = useState(item?.desireLevel ?? 2);
  const [note, setNote] = useState(item?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [conquered, setConquered] = useState(false);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);

  // Conquered animation
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  const successTextStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
  }));

  useEffect(() => {
    if (conquered) {
      successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      successOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [conquered, successScale, successOpacity]);

  // Sync fields when item changes
  useEffect(() => {
    if (item) {
      setName(item.name ?? '');
      setPriceText(item.priceCents != null ? String(item.priceCents / 100) : '');
      setDesireLevel(item.desireLevel);
      setNote(item.note ?? '');
    }
  }, [item?.id]);

  const handleSave = useCallback(async () => {
    if (!item || !selectedChild) return;
    setSaving(true);
    const priceCents = priceText ? Math.round(parseFloat(priceText.replace(',', '.')) * 100) : null;
    try {
      const res = await wishlistApi.update(selectedChild.id, item.id, {
        name: name || null,
        note: note || null,
        priceCents,
        desireLevel,
      });
      updateItem(item.id, res.data?.data ?? { name: name || null, note: note || null, priceCents, desireLevel });
      haptics.success();
      router.back();
    } catch {
      haptics.error();
    } finally {
      setSaving(false);
    }
  }, [item, selectedChild, name, priceText, note, desireLevel, updateItem, router]);

  const handleConquer = useCallback(async () => {
    if (!item || !selectedChild) return;
    try {
      await wishlistApi.conquer(selectedChild.id, item.id);
      updateItem(item.id, { status: 'conquered', conqueredAt: new Date().toISOString() });
      haptics.success();
      setConquered(true);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 2500);
    } catch {
      haptics.error();
    }
  }, [item, selectedChild, updateItem, router]);

  const handleArchive = useCallback(async () => {
    if (!item || !selectedChild) return;
    Alert.alert(
      t('wishlist.archiveTitle'),
      t('wishlist.archiveMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await wishlistApi.archive(selectedChild.id, item.id);
              updateItem(item.id, { status: 'archived' });
              haptics.light();
              router.back();
            } catch {
              haptics.error();
            }
          },
        },
      ]
    );
  }, [item, selectedChild, updateItem, router, t]);

  const handleSetGoal = useCallback(async () => {
    if (!item || !selectedChild) return;
    // Check max 5 goals
    const currentGoals = items.filter(
      (i) => i.childId === selectedChild.id && i.status === 'active' && i.priceCents != null && i.priceCents > 0
    );
    if (currentGoals.length >= 5) {
      Alert.alert(t('wishlist.maxGoalsTitle'), t('wishlist.maxGoalsMessage'));
      return;
    }
    try {
      await wishlistApi.setGoal(selectedChild.id, item.id);
      updateItem(item.id, { isGoal: true });
      setGoal({ ...item, isGoal: true });
      haptics.success();
    } catch {
      haptics.error();
    }
  }, [item, selectedChild, items, updateItem, setGoal, t]);

  const handleUndoConquer = useCallback(async () => {
    if (!item || !selectedChild) return;
    Alert.alert(
      t('wishlist.undoConquer'),
      t('wishlist.undoConquerConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await wishlistApi.update(selectedChild.id, item.id, { status: 'active' });
              updateItem(item.id, { status: 'active', conqueredAt: null });
              haptics.success();
              router.back();
            } catch {
              haptics.error();
            }
          },
        },
      ]
    );
  }, [item, selectedChild, updateItem, router, t]);

  const handleDelete = useCallback(async () => {
    if (!item || !selectedChild) return;
    Alert.alert(
      t('wishlist.deleteConfirmTitle'),
      t('wishlist.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wishlistApi.remove(selectedChild.id, item.id);
              removeItem(item.id);
              haptics.light();
              router.back();
            } catch {
              haptics.error();
            }
          },
        },
      ]
    );
  }, [item, selectedChild, removeItem, router, t]);

  if (!item) {
    return (
      <SafeArea>
        <Header title="" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-[15px] font-sans text-text-secondary">
            {t('common.loading')}
          </Text>
        </View>
      </SafeArea>
    );
  }

  // Conquered celebration
  if (conquered) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <ConfettiEffect />
          <Animated.View style={successIconStyle} className="items-center">
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
            >
              <MaterialCommunityIcons name="trophy" size={72} color="#22c55e" />
            </View>
          </Animated.View>
          <Animated.View style={successTextStyle} className="items-center">
            <Text className="text-[28px] font-sans-bold text-text text-center mb-3">
              {t('wishlist.conqueredSuccess')}
            </Text>
            {item.name && (
              <Text className="text-[18px] font-sans-semibold text-text-secondary text-center">
                {item.name}
              </Text>
            )}
          </Animated.View>
        </View>
      </SafeArea>
    );
  }

  const formattedDate = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isActive = item.status === 'active';
  const hasPrice = item.priceCents != null && item.priceCents > 0;

  return (
    <SafeArea>
      <Header
        title={item.name || t('wishlist.noName')}
        showBack
        onBack={() => router.back()}
        rightAction={
          isActive ? (
            <Pressable onPress={handleDelete} hitSlop={12}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo — cropped center, tap to fullscreen */}
          <Pressable onPress={() => setPhotoFullscreen(true)}>
            <Image
              source={{ uri: item.photoUrl }}
              style={{ width: '100%', height: 320 }}
              contentFit="cover"
              transition={300}
              cachePolicy="disk"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              placeholderContentFit="cover"
            />

            {/* Conquered badge overlay */}
            {item.status === 'conquered' && (
              <View className="absolute inset-0 bg-black/30 items-center justify-center">
                <View className="bg-green-500 rounded-full p-4">
                  <MaterialCommunityIcons name="check" size={40} color="#ffffff" />
                </View>
              </View>
            )}

            {/* Expand hint */}
            <View className="absolute bottom-3 right-3 bg-black/40 rounded-full p-2">
              <MaterialCommunityIcons name="arrow-expand" size={18} color="#ffffff" />
            </View>
          </Pressable>

          {/* Fullscreen photo viewer */}
          <PhotoFullscreenModal
            visible={photoFullscreen}
            photoUri={item.photoUrl}
            onClose={() => setPhotoFullscreen(false)}
          />

          {/* Content */}
          <View className="px-7 pt-6" style={{ gap: 4 }}>
            {/* Date */}
            <Text className="text-[13px] font-sans text-text-secondary mb-4">
              {formattedDate}
            </Text>

            {/* Desire level */}
            <View className="mb-6">
              <Text className="text-[15px] font-sans-semibold text-text mb-3">
                {t('wishlist.howMuch')}
              </Text>
              <DesireLevelPicker
                value={desireLevel}
                onChange={async (level) => {
                  setDesireLevel(level);
                  if (!selectedChild || item.id.startsWith('temp_')) return;
                  try {
                    await wishlistApi.update(selectedChild.id, item.id, { desireLevel: level });
                    updateItem(item.id, { desireLevel: level });
                  } catch { /* silent */ }
                }}
              />
            </View>

            {/* Name input */}
            <Input
              label={t('wishlist.nameLabel')}
              value={name}
              onChangeText={setName}
              placeholder={t('wishlist.namePlaceholder')}
              icon="tag-outline"
              maxLength={200}
            />

            {/* Price input */}
            <Input
              label={t('wishlist.priceLabel')}
              value={priceText}
              onChangeText={setPriceText}
              placeholder="0,00"
              icon="currency-usd"
              keyboardType="decimal-pad"
            />

            {/* Goal tip — show when price is filled but not yet a goal */}
            {isActive && !item.isGoal && priceText.length > 0 && (
              <Pressable
                onPress={() => Alert.alert(t('wishlist.goalHelpTitle'), t('wishlist.goalHelpMessage'))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFF9E0',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 16,
                  gap: 10,
                }}
              >
                <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#b38f00" />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#8a6d00' }}>
                  {t('wishlist.goalTip')}
                </Text>
                <MaterialCommunityIcons name="help-circle-outline" size={18} color="#b38f00" />
              </Pressable>
            )}

            {/* Note input */}
            <Input
              label={t('wishlist.noteLabel')}
              value={note}
              onChangeText={setNote}
              placeholder={t('wishlist.notePlaceholder')}
              icon="text"
              maxLength={500}
              multiline
            />

            {/* Set as goal — above save when item has price */}
            {isActive && !item.isGoal && hasPrice && (
              <View style={{ marginBottom: 6 }}>
                <Button
                  title={t('wishlist.setAsGoal')}
                  variant="secondary"
                  onPress={handleSetGoal}
                  icon="flag"
                  fullWidth
                />
              </View>
            )}

            {/* Save button */}
            <Button
              title={t('common.save')}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />

            {/* Action buttons for active items */}
            {isActive && (
              <View style={{ gap: 10, marginTop: 16 }}>
                {/* Conquered */}
                <Button
                  title={t('wishlist.conquered')}
                  onPress={handleConquer}
                  icon="check-circle"
                  fullWidth
                />

                {/* Archive — "don't want anymore" */}
                <Button
                  title={t('wishlist.dontWant')}
                  variant="secondary"
                  onPress={handleArchive}
                  icon="close-circle-outline"
                  fullWidth
                />
              </View>
            )}

            {/* Undo conquer — for conquered items */}
            {item.status === 'conquered' && (
              <View style={{ marginTop: 16 }}>
                <Button
                  title={t('wishlist.undoConquer')}
                  variant="secondary"
                  onPress={handleUndoConquer}
                  icon="undo"
                  fullWidth
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

// --- Fullscreen photo viewer with pinch-to-zoom + download ---

function PhotoFullscreenModal({
  visible,
  photoUri,
  onClose,
}: {
  visible: boolean;
  photoUri: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset on open
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, { damping: 15 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4, { damping: 15 });
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      // If zoomed out, snap back
      if (savedScale.value <= 1) {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        scale.value = withSpring(1, { damping: 15 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5, { damping: 15 });
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleDownload = useCallback(async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('wishlist.galleryPermission'));
        setSaving(false);
        return;
      }

      let fileUri = photoUri;

      // Remote URL — download to local cache first
      if (photoUri.startsWith('http')) {
        const tmpDir = new Directory(Paths.cache, 'wish-download');
        tmpDir.create({ idempotent: true });
        const downloaded = await File.downloadFileAsync(photoUri, tmpDir, { idempotent: true });
        fileUri = downloaded.uri;
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);
      haptics.success();
      Alert.alert(t('common.success'), t('wishlist.downloadSuccess'));
    } catch (err: any) {
      haptics.error();
      Alert.alert(t('common.error'), err?.message || t('common.errorGeneric'));
    } finally {
      setSaving(false);
    }
  }, [photoUri, t]);

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {/* Zoomable image */}
        <GestureDetector gesture={composed}>
          <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, imageStyle]}>
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={300}
              cachePolicy="disk"
            />
          </Animated.View>
        </GestureDetector>

        {/* Top bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={handleDownload}
            hitSlop={12}
            disabled={saving}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, opacity: saving ? 0.5 : 1 }}
          >
            <MaterialCommunityIcons name="download" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
