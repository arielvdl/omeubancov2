import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { Card } from '@/src/components/ui/Card';
import { PaywallPrompt } from '@/src/components/ui/PaywallPrompt';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';
import { AVATARS, DEFAULT_AVATAR_ID } from '@/src/constants/avatars';
import { isValidName, sanitizeInput } from '@/src/utils/validation';
import { haptics } from '@/src/utils/haptics';
import { processAndSaveAvatar } from '@/src/utils/avatar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddChildrenScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const onboardingChildren = useBankStore((s) => s.onboardingChildren);
  const addOnboardingChild = useBankStore((s) => s.addOnboardingChild);
  const removeOnboardingChild = useBankStore((s) => s.removeOnboardingChild);
  const existingChildren = useBankStore((s) => s.children);
  const maxChildren = useSubscriptionStore((s) => s.limits.maxChildren);
  const loadLimits = useSubscriptionStore((s) => s.loadLimits);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  // Conta filhos já criados no servidor + os enfileirados no onboarding
  const atChildLimit =
    existingChildren.length + onboardingChildren.length >= maxChildren;

  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

  const handleAddChild = useCallback(() => {
    if (atChildLimit) {
      haptics.warning();
      setShowForm(false);
      return;
    }
    const sanitized = sanitizeInput(childName);
    if (!isValidName(sanitized)) {
      setNameError(t('validation.nameTooShort'));
      haptics.warning();
      return;
    }
    setNameError('');

    const id = `child_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    addOnboardingChild({
      id,
      name: sanitized,
      avatarId: photoUri ?? selectedAvatarId,
      signatureData: null,
    });

    haptics.success();
    setChildName('');
    setSelectedAvatarId(DEFAULT_AVATAR_ID);
    setPhotoUri(null);
    setShowForm(false);
  }, [atChildLimit, childName, selectedAvatarId, photoUri, addOnboardingChild, t]);

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

  const handleTakePhoto = useCallback(async () => {
    haptics.light();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('common.error'),
        t('modals.cameraAvatar.title', {
          defaultValue: 'Precisamos de acesso à câmera',
        }),
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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

  const handleRemoveChild = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        t('onboarding.addChildren.removeChild'),
        name,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              haptics.medium();
              removeOnboardingChild(id);
            },
          },
        ],
      );
    },
    [removeOnboardingChild, t],
  );

  const handleNext = () => {
    if (onboardingChildren.length === 0) {
      haptics.warning();
      Alert.alert('', t('onboarding.addChildren.noChildren'));
      return;
    }
    haptics.success();
    router.push('/(onboarding)/contract-intro');
  };

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={3} totalSteps={6} />

        <View className="items-center mt-9 mb-9">
          <Text className="text-[30px] font-sans-bold text-text text-center" style={{ lineHeight: 40 }}>
            {t('onboarding.addChildren.title')}
          </Text>
          <Text className="text-[17px] font-sans text-text-secondary text-center mt-3.5" style={{ lineHeight: 26 }}>
            {t('onboarding.addChildren.subtitle')}
          </Text>
        </View>

        {onboardingChildren.map((child) => (
          <Card key={child.id} className="mb-3.5">
            <View className="flex-row items-center">
              <Avatar avatarId={child.avatarId} size="md" />
              <Text className="text-[17px] font-sans-semibold text-text ml-3.5 flex-1">
                {child.name}
              </Text>
              <Pressable
                onPress={() => handleRemoveChild(child.id, child.name)}
                hitSlop={12}
              >
                <MaterialCommunityIcons name="close-circle" size={26} color="#ef4444" />
              </Pressable>
            </View>
          </Card>
        ))}

        {showForm ? (
          <Card className="mb-6">
            <Input
              label={t('onboarding.addChildren.childName')}
              value={childName}
              onChangeText={setChildName}
              placeholder={t('onboarding.addChildren.childNamePlaceholder')}
              error={nameError}
              icon="account-outline"
              maxLength={50}
            />

            <Text className="text-[15px] font-sans-semibold text-text mb-3">
              {t('onboarding.addChildren.selectAvatar')}
            </Text>

            {/* Horizontal avatar scroll */}
            <View className="mx-[-28px] mb-5">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
              >
                {/* Gallery button */}
                <Pressable
                  onPress={handlePickFromGallery}
                  className={`items-center justify-center w-16 h-16 rounded-full ${
                    photoUri ? 'border-2 border-primary' : 'border-2 border-dashed border-text-secondary'
                  }`}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: photoUri ? undefined : '#F3F4F6',
                  })}
                >
                  {photoUri ? (
                    <Avatar imageUri={photoUri} size="md" />
                  ) : (
                    <MaterialCommunityIcons name="image-plus" size={24} color="#6b6b5a" />
                  )}
                </Pressable>

                {/* Camera button */}
                <Pressable
                  onPress={handleTakePhoto}
                  className="items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-text-secondary"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: '#F3F4F6',
                  })}
                >
                  <MaterialCommunityIcons name="camera-outline" size={24} color="#6b6b5a" />
                </Pressable>

                {/* Avatar emojis */}
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
                      className="rounded-full"
                      style={{
                        borderWidth: 2,
                        borderColor: isSelected ? '#FFD600' : 'transparent',
                        padding: 2,
                      }}
                    >
                      <Avatar avatarId={avatar.id} size="md" />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setShowForm(false);
                    setChildName('');
                    setNameError('');
                    setPhotoUri(null);
                    setSelectedAvatarId(DEFAULT_AVATAR_ID);
                  }}
                  variant="secondary"
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  title={t('common.add')}
                  onPress={handleAddChild}
                  variant="primary"
                  fullWidth
                  icon="check"
                />
              </View>
            </View>
          </Card>
        ) : atChildLimit ? (
          <PaywallPrompt feature="add_child" />
        ) : (
          <Button
            title={t('onboarding.addChildren.addChild')}
            onPress={() => setShowForm(true)}
            variant="secondary"
            fullWidth
            icon="account-plus-outline"
          />
        )}

        <View className="mt-11">
          <Button
            title={t('common.next')}
            onPress={handleNext}
            variant="primary"
            size="lg"
            fullWidth
            disabled={onboardingChildren.length === 0}
            icon="arrow-right"
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}
