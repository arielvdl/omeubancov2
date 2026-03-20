import React, { forwardRef, useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { PinchGestureHandler, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { Transaction } from '@/src/types/transaction';
import { TransactionIcon } from '@/src/components/transaction/TransactionIcon';
import { useCurrency } from '@/src/hooks/useCurrency';
import { formatDate, formatTime } from '@/src/i18n/formatters';
import { haptics } from '@/src/utils/haptics';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CREATED_BY_KEYS: Record<string, string> = {
  parent: 'history.createdByParent',
  child: 'history.createdByChild',
  system: 'history.createdBySystem',
};

export const TransactionDetailSheet = forwardRef<BottomSheet, TransactionDetailSheetProps>(
  ({ transaction }, ref) => {
    const { t } = useTranslation();
    const { format, locale } = useCurrency();
    const [imageFullscreen, setImageFullscreen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [thumbLayout, setThumbLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const thumbRef = useRef<View>(null);

    // Fullscreen animation values
    const animProgress = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);

    // Pinch-to-zoom values
    const pinchScale = useSharedValue(1);
    const baseScale = useSharedValue(1);

    const thumbStyle = useAnimatedStyle(() => ({
      opacity: animProgress.value > 0.1 ? 0 : 1,
    }));

    const fullscreenImageStyle = useAnimatedStyle(() => {
      const targetW = SCREEN_W;
      const targetH = SCREEN_W;
      const startW = thumbLayout.w || targetW;
      const startH = thumbLayout.h || targetH;
      const startX = thumbLayout.x || 0;
      const startY = thumbLayout.y || 0;
      const targetX = 0;
      const targetY = (SCREEN_H - targetH) / 2;

      const p = animProgress.value;
      const w = startW + (targetW - startW) * p;
      const h = startH + (targetH - startH) * p;
      const x = startX + (targetX - startX) * p;
      const y = startY + (targetY - startY) * p;
      const radius = 12 * (1 - p);

      return {
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        transform: [{ scale: pinchScale.value }],
      };
    });

    const backdropStyle = useAnimatedStyle(() => ({
      ...({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
      } as const),
      opacity: backdropOpacity.value,
    }));

    const closeButtonStyle = useAnimatedStyle(() => ({
      opacity: animProgress.value,
    }));

    const openFullscreen = useCallback(() => {
      if (!thumbRef.current) return;
      thumbRef.current.measureInWindow((x, y, w, h) => {
        setThumbLayout({ x, y, w, h });
        pinchScale.value = 1;
        baseScale.value = 1;
        setImageFullscreen(true);
        backdropOpacity.value = withTiming(0.95, { duration: 150, easing: Easing.out(Easing.cubic) });
        animProgress.value = withSpring(1, { damping: 18, stiffness: 320 });
      });
    }, [animProgress, backdropOpacity, pinchScale, baseScale]);

    const closeFullscreen = useCallback(() => {
      pinchScale.value = withTiming(1, { duration: 120 });
      backdropOpacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) });
      animProgress.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(setImageFullscreen)(false);
      });
    }, [animProgress, backdropOpacity, pinchScale]);

    const onPinchGestureEvent = useCallback(
      (event: PinchGestureHandlerGestureEvent) => {
        const newScale = baseScale.value * event.nativeEvent.scale;
        pinchScale.value = Math.max(1, Math.min(newScale, 5));
      },
      [pinchScale, baseScale],
    );

    const onPinchEnd = useCallback(() => {
      baseScale.value = pinchScale.value;
      if (pinchScale.value < 1.1) {
        pinchScale.value = withSpring(1, { damping: 15 });
        baseScale.value = 1;
      }
    }, [pinchScale, baseScale]);

    const saveToGallery = useCallback(async () => {
      if (!transaction?.receiptUrl || saving) return;
      setSaving(true);
      haptics.light();
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('common.error', { defaultValue: 'Erro' }),
            t('history.galleryPermission', { defaultValue: 'Permita o acesso à galeria nas configurações.' }),
          );
          setSaving(false);
          return;
        }
        const ext = transaction.receiptUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const localUri = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${ext}`;
        const { uri } = await FileSystem.downloadAsync(transaction.receiptUrl, localUri);
        await MediaLibrary.saveToLibraryAsync(uri);
        haptics.medium();
        Alert.alert(
          t('history.imageSaved', { defaultValue: 'Salvo!' }),
          t('history.imageSavedDesc', { defaultValue: 'Imagem salva na galeria.' }),
        );
      } catch {
        Alert.alert(
          t('common.error', { defaultValue: 'Erro' }),
          t('history.imageSaveError', { defaultValue: 'Não foi possível salvar a imagem.' }),
        );
      } finally {
        setSaving(false);
      }
    }, [transaction?.receiptUrl, saving, t]);

    const snapPoints = useMemo(() => [transaction?.receiptUrl ? '75%' : '50%'], [transaction?.receiptUrl]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

    if (!transaction) return null;

    const isWithdrawal = transaction.type === 'withdrawal';
    const amountPrefix = isWithdrawal ? '-' : '+';
    const amountColor = isWithdrawal ? 'text-danger' : 'text-success';

    const rows = [
      {
        icon: 'swap-vertical' as const,
        label: t('history.detailType'),
        value: t(`history.${transaction.type}`),
      },
      {
        icon: 'tag-outline' as const,
        label: t('history.detailCategory'),
        value: t(`categories.${transaction.category}`),
      },
      {
        icon: 'calendar-outline' as const,
        label: t('history.detailDate'),
        value: formatDate(transaction.createdAt, locale),
      },
      {
        icon: 'clock-outline' as const,
        label: t('history.detailTime'),
        value: formatTime(transaction.createdAt, locale),
      },
      {
        icon: 'wallet-outline' as const,
        label: t('history.detailBalanceAfter'),
        value: format(transaction.balanceAfter),
      },
      {
        icon: 'account-outline' as const,
        label: t('history.detailCreatedBy'),
        value: t(CREATED_BY_KEYS[transaction.createdBy] ?? 'history.createdBySystem'),
      },
      ...(transaction.description
        ? [
            {
              icon: 'text-short' as const,
              label: t('history.detailReason', { defaultValue: 'Motivo' }),
              value: transaction.description,
            },
          ]
        : []),
    ];

    return (
      <>
        <BottomSheet
          ref={ref}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: '#faf9f0' }}
          handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
            {/* Header */}
            <View className="items-center mb-6 pt-2">
              <TransactionIcon category={transaction.category} type={transaction.type} size={48} />
              <Text className="text-[18px] font-sans-bold text-text mt-3 text-center">
                {transaction.description || t(`categories.${transaction.category}`)}
              </Text>
              <Text className={`text-[28px] font-sans-bold ${amountColor} mt-1`}>
                {amountPrefix}{format(transaction.amount)}
              </Text>
            </View>

            {/* Receipt Image — 1:1 aspect, fully visible */}
            {transaction.receiptUrl && (
              <Animated.View ref={thumbRef} style={[{ marginBottom: 16 }, thumbStyle]}>
                <TouchableOpacity activeOpacity={0.85} onPress={openFullscreen}>
                  <Image
                    source={{ uri: transaction.receiptUrl }}
                    style={{
                      width: '100%',
                      aspectRatio: 1,
                      borderRadius: 12,
                    }}
                    resizeMode="contain"
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 20,
                      padding: 6,
                    }}
                  >
                    <MaterialCommunityIcons name="magnify-plus-outline" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Detail Rows */}
            <View className="bg-surface rounded-2xl px-4 py-1">
              {rows.map((row, i) => (
                <View
                  key={row.label}
                  className={`flex-row items-center justify-between py-3.5 ${
                    i < rows.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <MaterialCommunityIcons
                      name={row.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={18}
                      color="#6b7280"
                    />
                    <Text className="text-[14px] font-sans text-text-secondary">{row.label}</Text>
                  </View>
                  <Text className="text-[14px] font-sans-semibold text-text">{row.value}</Text>
                </View>
              ))}
            </View>
          </BottomSheetScrollView>
        </BottomSheet>

        {/* Fullscreen Image Viewer with Pinch-to-Zoom */}
        {imageFullscreen && transaction.receiptUrl && (
          <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={closeFullscreen}>
            <View style={{ flex: 1 }}>
              <Animated.View style={backdropStyle} />

              <TouchableOpacity
                activeOpacity={1}
                onPress={closeFullscreen}
                style={{ flex: 1 }}
              >
                <PinchGestureHandler
                  onGestureEvent={onPinchGestureEvent}
                  onEnded={onPinchEnd}
                >
                  <Animated.View style={{ flex: 1 }}>
                    <Animated.Image
                      source={{ uri: transaction.receiptUrl }}
                      style={fullscreenImageStyle}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </TouchableOpacity>

              {/* Top bar: close + download */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 60,
                    left: 20,
                    right: 20,
                    zIndex: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                  closeButtonStyle,
                ]}
              >
                <TouchableOpacity
                  onPress={closeFullscreen}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    padding: 8,
                  }}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveToGallery}
                  disabled={saving}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    padding: 8,
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <MaterialCommunityIcons name="download" size={24} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}
      </>
    );
  },
);
