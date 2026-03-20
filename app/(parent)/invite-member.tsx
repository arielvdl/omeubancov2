import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { invitationsApi } from '@/src/services/api/invitations';
import { haptics } from '@/src/utils/haptics';
import type { FamilyInvitation } from '@/src/types/invitation';

export default function InviteMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invitationsApi.createInvitation();
      setInvitation(res.data.invitation);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      const errorData = err?.response?.data;
      if (errorData?.error === 'subscription_required') {
        router.push('/(modals)/paywall');
      } else {
        Alert.alert(t('common.error'), t('common.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  }, [t, router]);

  useEffect(() => {
    generateInvite();
  }, [generateInvite]);

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
              } catch {
                // ignore
              }
            }
            generateInvite();
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
          {loading ? (
            <Text className="text-[15px] font-sans text-text-secondary">
              {t('invitation.generating')}
            </Text>
          ) : invitation ? (
            <>
              <Text className="text-[15px] font-sans text-text-secondary mb-6">
                {t('invitation.scanQr')}
              </Text>

              <View className="bg-white p-5 rounded-2xl mb-6">
                <QRCode value={invitation.deepLink} size={200} />
              </View>

              <Text className="text-[13px] font-sans-semibold text-text-secondary mb-2 tracking-widest">
                {invitation.inviteCode}
              </Text>

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
