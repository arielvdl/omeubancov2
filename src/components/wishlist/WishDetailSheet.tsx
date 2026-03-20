import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui/Button';
import { DesireLevelPicker } from './DesireLevelPicker';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { wishlistApi } from '@/src/services/api/wishlist';
import { haptics } from '@/src/utils/haptics';
import type { WishItem } from '@/src/types/wishlist';

interface WishDetailSheetProps {
  item: WishItem | null;
  onDismiss?: () => void;
}

export const WishDetailSheet = forwardRef<BottomSheet, WishDetailSheetProps>(
  ({ item, onDismiss }, ref) => {
    const { t } = useTranslation();
    const { format, locale } = useCurrency();
    const selectedChild = useSelectedChild();
    const updateItem = useWishlistStore((s) => s.updateItem);
    const removeItem = useWishlistStore((s) => s.removeItem);
    const setGoal = useWishlistStore((s) => s.setGoal);
    const snapPoints = useMemo(() => ['85%'], []);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editNote, setEditNote] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editDesireLevel, setEditDesireLevel] = useState(2);

    const startEditing = useCallback(() => {
      if (!item) return;
      setEditName(item.name ?? '');
      setEditNote(item.note ?? '');
      setEditPrice(item.priceCents != null ? String(item.priceCents / 100) : '');
      setEditDesireLevel(item.desireLevel);
      setIsEditing(true);
    }, [item]);

    const handleSave = useCallback(async () => {
      if (!item || !selectedChild) return;
      const priceCents = editPrice ? Math.round(parseFloat(editPrice) * 100) : null;
      try {
        const res = await wishlistApi.update(selectedChild.id, item.id, {
          name: editName || null,
          note: editNote || null,
          priceCents,
          desireLevel: editDesireLevel,
        });
        updateItem(item.id, res.data?.data ?? {
          name: editName || null,
          note: editNote || null,
          priceCents,
          desireLevel: editDesireLevel,
        });
        setIsEditing(false);
        haptics.success();
      } catch {
        haptics.error();
      }
    }, [item, selectedChild, editName, editNote, editPrice, editDesireLevel, updateItem]);

    const handleConquer = useCallback(async () => {
      if (!item || !selectedChild) return;
      try {
        await wishlistApi.conquer(selectedChild.id, item.id);
        updateItem(item.id, { status: 'conquered', conqueredAt: new Date().toISOString() });
        haptics.success();
        (ref as React.RefObject<BottomSheet>)?.current?.close();
      } catch {
        haptics.error();
      }
    }, [item, selectedChild, updateItem, ref]);

    const handleArchive = useCallback(async () => {
      if (!item || !selectedChild) return;
      try {
        await wishlistApi.archive(selectedChild.id, item.id);
        updateItem(item.id, { status: 'archived' });
        haptics.light();
        (ref as React.RefObject<BottomSheet>)?.current?.close();
      } catch {
        haptics.error();
      }
    }, [item, selectedChild, updateItem, ref]);

    const handleSetGoal = useCallback(async () => {
      if (!item || !selectedChild) return;
      try {
        await wishlistApi.setGoal(selectedChild.id, item.id);
        updateItem(item.id, { isGoal: true });
        setGoal({ ...item, isGoal: true });
        haptics.success();
      } catch {
        haptics.error();
      }
    }, [item, selectedChild, updateItem, setGoal]);

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
                (ref as React.RefObject<BottomSheet>)?.current?.close();
              } catch {
                haptics.error();
              }
            },
          },
        ]
      );
    }, [item, selectedChild, removeItem, ref, t]);

    if (!item) return null;

    const formattedDate = new Date(item.createdAt).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onDismiss}
        backgroundStyle={{ backgroundColor: '#ffffff', borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: '#d4d4c8', width: 40 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Photo */}
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: '100%', height: 280 }}
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
          />

          <View className="px-6 pt-5" style={{ gap: 16 }}>
            {isEditing ? (
              <>
                {/* Edit mode */}
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('wishlist.namePlaceholder')}
                  className="text-[20px] font-sans-bold text-text border-b border-border pb-2"
                  placeholderTextColor="#a3a393"
                />
                <TextInput
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  className="text-[18px] font-sans-semibold text-primary-700 border-b border-border pb-2"
                  placeholderTextColor="#a3a393"
                />
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-sans-medium text-text-secondary">
                    {t('wishlist.howMuch')}
                  </Text>
                  <DesireLevelPicker value={editDesireLevel} onChange={setEditDesireLevel} />
                </View>
                <TextInput
                  value={editNote}
                  onChangeText={setEditNote}
                  placeholder={t('wishlist.notePlaceholder')}
                  multiline
                  className="text-[15px] font-sans text-text border border-border rounded-xl p-3 min-h-[80px]"
                  placeholderTextColor="#a3a393"
                  textAlignVertical="top"
                />
                <View className="flex-row" style={{ gap: 12 }}>
                  <View className="flex-1">
                    <Button
                      title={t('common.cancel')}
                      variant="secondary"
                      onPress={() => setIsEditing(false)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title={t('common.save')}
                      onPress={handleSave}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* View mode */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-[22px] font-sans-bold text-text flex-1" numberOfLines={2}>
                    {item.name || t('wishlist.noName')}
                  </Text>
                  <Pressable onPress={startEditing} hitSlop={8} style={{ padding: 8 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={22} color="#6b6b5a" />
                  </Pressable>
                </View>

                {item.priceCents != null && (
                  <Text className="text-[20px] font-sans-bold text-primary-700">
                    {format(item.priceCents)}
                  </Text>
                )}

                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <DesireLevelPicker
                    value={item.desireLevel}
                    onChange={async (level) => {
                      if (!selectedChild) return;
                      try {
                        await wishlistApi.update(selectedChild.id, item.id, { desireLevel: level });
                        updateItem(item.id, { desireLevel: level });
                        haptics.selection();
                      } catch { /* silent */ }
                    }}
                  />
                  <Text className="text-[13px] font-sans text-text-secondary">
                    {formattedDate}
                  </Text>
                </View>

                {item.note && (
                  <Text className="text-[15px] font-sans text-text-secondary">
                    {item.note}
                  </Text>
                )}

                {/* Action buttons */}
                <View style={{ gap: 10, marginTop: 8 }}>
                  {item.status === 'active' && (
                    <>
                      <Button
                        title={t('wishlist.conquered')}
                        onPress={handleConquer}
                        icon="check-circle"
                      />
                      {!item.isGoal && item.priceCents != null && (
                        <Button
                          title={t('wishlist.setAsGoal')}
                          variant="secondary"
                          onPress={handleSetGoal}
                          icon="flag"
                        />
                      )}
                      <Button
                        title={t('wishlist.dontWant')}
                        variant="ghost"
                        onPress={handleArchive}
                      />
                    </>
                  )}
                  <Button
                    title={t('wishlist.deleteItem')}
                    variant="danger"
                    onPress={handleDelete}
                  />
                </View>
              </>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
