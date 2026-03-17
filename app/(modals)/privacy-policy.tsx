import React from 'react';
import { Text, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      <View className="flex-row items-center mb-3">
        <MaterialCommunityIcons name={icon as any} size={22} color="#6b6b5a" />
        <Text className="text-[18px] font-sans-bold text-text ml-3">{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <Text className="text-[15px] font-sans text-text-secondary leading-6 mb-2">
      {text}
    </Text>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View className="flex-row ml-2 mb-2">
      <Text className="text-[15px] font-sans text-text-secondary mr-2">{'\u2022'}</Text>
      <Text className="text-[15px] font-sans text-text-secondary leading-6 flex-1">{text}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeArea>
      <Header
        title={t('privacy.title')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-sans text-text-secondary mb-6">
          {t('privacy.lastUpdated')}
        </Text>

        {/* Intro */}
        <Section icon="shield-check-outline" title={t('privacy.title')}>
          <Paragraph text={t('privacy.intro')} />
        </Section>

        {/* Data Collected */}
        <Section icon="database-outline" title={t('privacy.dataCollectedTitle')}>
          <BulletItem text={t('privacy.dataCollectedFamily')} />
          <BulletItem text={t('privacy.dataCollectedChildren')} />
          <BulletItem text={t('privacy.dataCollectedFinancial')} />
          <BulletItem text={t('privacy.dataCollectedDevices')} />
        </Section>

        {/* Purpose */}
        <Section icon="target" title={t('privacy.purposeTitle')}>
          <Paragraph text={t('privacy.purposeText')} />
        </Section>

        {/* Legal Basis */}
        <Section icon="scale-balance" title={t('privacy.legalBasisTitle')}>
          <Paragraph text={t('privacy.legalBasisText')} />
        </Section>

        {/* Parental Consent */}
        <Section icon="account-child" title={t('privacy.parentalConsentTitle')}>
          <Paragraph text={t('privacy.parentalConsentText')} />
        </Section>

        {/* Data Retention */}
        <Section icon="clock-outline" title={t('privacy.retentionTitle')}>
          <Paragraph text={t('privacy.retentionText')} />
        </Section>

        {/* Rights */}
        <Section icon="hand-pointing-right" title={t('privacy.rightsTitle')}>
          <BulletItem text={t('privacy.rightsAccess')} />
          <BulletItem text={t('privacy.rightsCorrection')} />
          <BulletItem text={t('privacy.rightsDeletion')} />
          <BulletItem text={t('privacy.rightsPortability')} />
          <BulletItem text={t('privacy.rightsRevocation')} />
        </Section>

        {/* Security */}
        <Section icon="lock-outline" title={t('privacy.securityTitle')}>
          <Paragraph text={t('privacy.securityText')} />
        </Section>

        {/* Children */}
        <Section icon="account-group" title={t('privacy.childrenTitle')}>
          <Paragraph text={t('privacy.childrenText')} />
        </Section>

        {/* Contact */}
        <Section icon="email-outline" title={t('privacy.contactTitle')}>
          <Paragraph text={t('privacy.contactText')} />
        </Section>
      </ScrollView>
    </SafeArea>
  );
}
