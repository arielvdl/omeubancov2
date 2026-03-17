import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi, uploadApi } from '@/src/services/api/bank';
import { AVATARS } from '@/src/constants/avatars';
import { haptics } from '@/src/utils/haptics';
import { processAndSaveAvatar } from '@/src/utils/avatar';

export default function AvatarPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const updateChild = useBankStore((s) => s.updateChild);

  const [selectedAvatarId, setSelectedAvatarId] = useState(
    selectedChild?.avatarUrl ?? AVATARS[0].id,
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!selectedChild) return;
    setSaving(true);

    try {
      let avatarValue = photoUri ?? selectedAvatarId;

      // Upload photo to cloud storage if it's a local file
      if (photoUri) {
        try {
          const { data } = await uploadApi.uploadAvatar(photoUri);
          avatarValue = data.url;
        } catch (uploadErr) {
          console.error('[Avatar] Upload failed:', uploadErr);
          Alert.alert(t('common.error'), t('common.errorGeneric'));
          setSaving(false);
          return;
        }
      }

      updateChild(selectedChild.id, { avatarUrl: avatarValue });

      // Sync with backend
      try {
        await bankApi.updateChild(selectedChild.id, { avatarUrl: avatarValue });
      } catch {
        // Keep local change even if backend fails
      }

      haptics.success();
      router.back();
    } finally {
      setSaving(false);
    }
  }, [selectedChild, selectedAvatarId, photoUri, updateChild, router]);

  const handleTakePhoto = useCallback(() => {
    haptics.light();
    router.push('/(modals)/camera-avatar');
  }, [router]);

  const handlePickFromGallery = useCallback(async () => {
    haptics.light();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('common.error'),
        t('modals.avatarPicker.galleryPermission', {
          defaultValue: 'Precisamos de acesso a sua galeria de fotos.',
        }),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const permanentUri = await processAndSaveAvatar(result.assets[0].uri);
      setPhotoUri(permanentUri);
      setSelectedAvatarId('');
      haptics.success();
    } catch {
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    }
  }, [t]);

  return (
    <SafeArea>
      <Header
        title={t('modals.avatarPicker.title')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
      >
        <Text className="text-[17px] font-sans text-text-secondary text-center mb-8">
          {t('modals.avatarPicker.subtitle')}
        </Text>

        {/* Photo preview (if selected from gallery) */}
        {photoUri && (
          <View className="items-center mb-7">
            <View className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary">
              <Avatar imageUri={photoUri} size="xl" />
            </View>
            <Pressable
              onPress={() => {
                setPhotoUri(null);
                setSelectedAvatarId(AVATARS[0].id);
              }}
              className="mt-2"
            >
              <Text className="text-[15px] font-sans-medium text-danger">
                {t('common.remove')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Avatar Grid */}
        <View className="flex-row flex-wrap justify-center gap-4 mb-9">
          {AVATARS.map((avatar) => {
            const isSelected = !photoUri && selectedAvatarId === avatar.id;
            return (
              <Pressable
                key={avatar.id}
                onPress={() => {
                  haptics.selection();
                  setSelectedAvatarId(avatar.id);
                  setPhotoUri(null);
                }}
                className={`rounded-full p-1.5 ${
                  isSelected ? 'border-3 border-primary bg-primary-50' : 'border-2 border-transparent'
                }`}
                style={isSelected ? { borderWidth: 3, borderColor: '#FFD600' } : {}}
              >
                <Avatar avatarId={avatar.id} size="lg" />
              </Pressable>
            );
          })}
        </View>

        {/* Photo actions */}
        <View className="gap-3.5 mb-6">
          <Button
            title={t('modals.avatarPicker.pickFromGallery', { defaultValue: 'Escolher da galeria' })}
            onPress={handlePickFromGallery}
            variant="secondary"
            fullWidth
            icon="image-outline"
          />
          <Button
            title={t('modals.avatarPicker.takePhoto', { defaultValue: 'Tirar foto' })}
            onPress={handleTakePhoto}
            variant="secondary"
            fullWidth
            icon="camera-outline"
          />
        </View>

        <Button
          title={t('modals.avatarPicker.confirm', { defaultValue: t('common.confirm') })}
          onPress={handleConfirm}
          variant="primary"
          size="lg"
          fullWidth
          icon="check"
          loading={saving}
        />
      </ScrollView>
    </SafeArea>
  );
}
