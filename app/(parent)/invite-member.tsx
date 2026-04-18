import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { invitationsApi } from '@/src/services/api/invitations';
import { haptics } from '@/src/utils/haptics';
import { captureError } from '@/src/utils/logger';
import type { FamilyInvitation } from '@/src/types/invitation';

type InviteAccessLevel = 'admin' | 'member';

export default function InviteMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qrRef = useRef<any>(null);
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [accessLevel, setAccessLevel] = useState<InviteAccessLevel>('member');

  const generateInvite = useCallback(async (level: InviteAccessLevel) => {
    setLoading(true);
    try {
      const res = await invitationsApi.createInvitation(level);
      setInvitation(res.data.invitation);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      const errorData = err?.response?.data;
      if (errorData?.error === 'subscription_required') {
        router.push('/(modals)/paywall');
      } else {
        captureError(err, 'Create invitation');
        Alert.alert(t('common.error'), t('common.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  }, [t, router]);

  useEffect(() => {
    generateInvite('member');
  }, [generateInvite]);

  const revokeCurrentInvitation = async () => {
    if (!invitation) return;
    try {
      await invitationsApi.revokeInvitation(invitation.id);
    } catch (err: any) {
      captureError(err, 'Revoke invitation');
    }
  };

  const handleAccessChange = (level: InviteAccessLevel) => {
    if (level === accessLevel || loading) return;

    if (!invitation) {
      setAccessLevel(level);
      return;
    }

    Alert.alert(
      t('invitation.changeAccessTitle'),
      t('invitation.changeAccessMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setAccessLevel(level);
            await revokeCurrentInvitation();
            await generateInvite(level);
          },
        },
      ],
    );
  };

  const handleCopy = async () => {
    if (!invitation) return;
    await Clipboard.setStringAsync(invitation.deepLink);
    setCopied(true);
    haptics.selection();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!invitation) return;
    try {
      await Share.share({
        message: `${t('invitation.joinFamily')}: ${invitation.deepLink}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleSaveQr = async () => {
    if (!qrRef.current || savingQr) return;
    setSavingQr(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('common.errorGeneric'));
        return;
      }
      qrRef.current.toDataURL(async (base64: string) => {
        try {
          const file = new ExpoFile(Paths.cache, `invite-qr-${Date.now()}.png`);
          await file.write(base64, { encoding: 'base64' });
          await MediaLibrary.saveToLibraryAsync(file.uri);
          haptics.success();
          Alert.alert(t('invitation.qrSaved'));
          await file.delete();
        } catch {
          haptics.error();
          Alert.alert(t('common.error'), t('common.errorGeneric'));
        }
      });
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setSavingQr(false);
    }
  };

  const handleGenerateNew = () => {
    Alert.alert(
      t('invitation.generateNew'),
      t('invitation.revokeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (invitation) {
              try {
                await invitationsApi.revokeInvitation(invitation.id);
              } catch (err: any) {
                captureError(err, 'Revoke invitation');
              }
            }
            generateInvite(accessLevel);
          },
        },
      ],
    );
  };

  const getTimeRemaining = () => {
    if (!invitation) return '';
    const expires = new Date(invitation.expiresAt).getTime();
    const now = Date.now();
    const diff = expires - now;
    if (diff <= 0) return t('invitation.expired');
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return t('invitation.expiresIn', { time: t('invitation.hours', { count: hours }) });
    return t('invitation.expiresIn', { time: t('invitation.minutes', { count: minutes }) });
  };

  return (
    <SafeArea>
      <Header
        title={t('invitation.inviteFamily')}
        showBack
        onBack={() => router.back()}
      />
      <View className="flex-1 px-7 pt-4">
        <Card className="items-center py-8">
          <Text className="text-[15px] font-sans-semibold text-text mb-3">
            {t('invitation.accessType')}
          </Text>
          <View className="flex-row w-full gap-2 mb-6">
            {(['member', 'admin'] as InviteAccessLevel[]).map((level) => {
              const selected = accessLevel === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => handleAccessChange(level)}
                  className={`flex-1 py-3 px-3 rounded-2xl ${
                    selected ? 'bg-primary-50' : 'bg-background-light'
                  }`}
                  style={
                    selected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : { borderWidth: 2, borderColor: 'transparent' }
                  }
                >
                  <Text className="text-[14px] font-sans-bold text-text text-center">
                    {t(level === 'admin' ? 'invitation.accessAdmin' : 'invitation.accessMember')}
                  </Text>
                  <Text className="text-[11px] font-sans text-text-secondary text-center mt-1 leading-4">
                    {t(
                      level === 'admin'
                        ? 'invitation.accessAdminHint'
                        : 'invitation.accessMemberHint',
                    )}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <Text className="text-[15px] font-sans text-text-secondary">
              {t('invitation.generating')}
            </Text>
          ) : invitation ? (
            <>
              <Text className="text-[15px] font-sans text-text-secondary mb-6">
                {t('invitation.scanQr')}
              </Text>

              <View className="bg-white p-5 rounded-2xl mb-4">
                <QRCode
                  value={invitation.deepLink}
                  size={200}
                  getRef={(ref: any) => (qrRef.current = ref)}
                />
              </View>

              <Pressable
                onPress={handleCopy}
                className="bg-background-light py-2.5 px-5 rounded-full mb-2"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-[18px] font-mono font-bold text-text tracking-[4px] text-center">
                  {invitation.inviteCode}
                </Text>
              </Pressable>

              <Text className="text-[13px] font-sans text-text-secondary mb-6">
                {getTimeRemaining()}
              </Text>

              {/* Copy link */}
              <Pressable
                onPress={handleCopy}
                className="flex-row items-center justify-center w-full py-4 px-5 rounded-2xl bg-background-light mb-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <MaterialCommunityIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={20}
                  color="#1a1a14"
                />
                <Text className="text-[15px] font-sans-semibold text-text ml-2">
                  {copied ? t('invitation.linkCopied') : t('invitation.copyLink')}
                </Text>
              </Pressable>

              {/* Share */}
              <Pressable
                onPress={handleShare}
                className="flex-row items-center justify-center w-full py-4 px-5 rounded-2xl bg-primary-50 mb-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#1a1a14" />
                <Text className="text-[15px] font-sans-semibold text-text ml-2">
                  {t('invitation.shareLink')}
                </Text>
              </Pressable>

              {/* Save QR */}
              <Pressable
                onPress={handleSaveQr}
                disabled={savingQr}
                className="flex-row items-center justify-center w-full py-4 px-5 rounded-2xl bg-background-light mb-3"
                style={({ pressed }) => ({ opacity: pressed || savingQr ? 0.7 : 1 })}
              >
                <MaterialCommunityIcons name="download" size={20} color="#1a1a14" />
                <Text className="text-[15px] font-sans-semibold text-text ml-2">
                  {t('invitation.saveQr')}
                </Text>
              </Pressable>

              {/* Generate new */}
              <Pressable
                onPress={handleGenerateNew}
                className="flex-row items-center justify-center w-full py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#6b6b5a" />
                <Text className="text-[13px] font-sans text-text-secondary ml-1.5">
                  {t('invitation.generateNew')}
                </Text>
              </Pressable>
            </>
          ) : null}
        </Card>
      </View>
    </SafeArea>
  );
}
