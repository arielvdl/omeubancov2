import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { SignaturePad } from '@/src/components/onboarding/SignaturePad';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { formatDate } from '@/src/i18n/formatters';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';

interface ContractData {
  id: string;
  content: string;
  parentSignedAt: string | null;
  childSignedAt: string | null;
  hasChildSignature: boolean;
  isActive: boolean;
  createdAt: string;
}

function parseRulesFromContent(content: string): string[] {
  const lines = content.split('\n').filter((l) => l.trim());
  return lines.slice(1);
}

export default function ContractViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bankName = useAuthStore((s) => s.bankName) ?? '';
  const selectedChild = useSelectedChild();
  const setContractRules = useBankStore((s) => s.setContractRules);
  const { locale } = useCurrency();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signSheetRef = useRef<BottomSheet>(null);
  const signSnapPoints = useMemo(() => ['55%'], []);

  const fetchContract = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const { data } = await bankApi.getContract(selectedChild.id);
      setContract(data);
      if (data?.content) {
        const rules = parseRulesFromContent(data.content);
        setContractRules(rules);
      } else {
        setContractRules([]);
      }
    } catch {
      setContract(null);
      setContractRules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChild, setContractRules]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleDelete = useCallback(() => {
    if (!selectedChild) return;
    Alert.alert(
      t('profile.deleteContract'),
      t('profile.deleteContractConfirm', { name: selectedChild.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await bankApi.deleteContract(selectedChild.id);
              haptics.success();
              setContract(null);
              setContractRules([]);
            } catch {
              haptics.error();
              Alert.alert(t('common.error'), t('common.errorGeneric'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [selectedChild, setContractRules, t]);

  const handleOpenSign = useCallback(() => {
    setSignatureData(null);
    signSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSignatureComplete = useCallback((data: string) => {
    setSignatureData(data);
  }, []);

  const handleSignatureClear = useCallback(() => {
    setSignatureData(null);
  }, []);

  const handleConfirmSign = useCallback(async () => {
    if (!selectedChild || !signatureData) return;
    setSigning(true);
    try {
      await bankApi.signContract(selectedChild.id, signatureData);
      haptics.success();
      signSheetRef.current?.close();
      setSignatureData(null);
      await fetchContract();
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setSigning(false);
    }
  }, [selectedChild, signatureData, fetchContract, t]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
    ),
    [],
  );

  const rules = contract?.content ? parseRulesFromContent(contract.content) : [];
  const isSigned = !!(contract?.childSignedAt || contract?.hasChildSignature);

  if (loading) {
    return (
      <SafeArea>
        <Header
          title={t('onboarding.contract.title')}
          showBack
          onBack={() => router.back()}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f5e63d" />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header
        title={t('onboarding.contract.title')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contract Header */}
        <Card className="mb-6 items-center">
          <MaterialCommunityIcons
            name="file-document-outline"
            size={40}
            color="#1a1a0e"
          />
          <Text
            className="text-[22px] font-sans-bold text-text text-center mt-4"
            style={{ lineHeight: 30 }}
          >
            {t('onboarding.contract.contractTitle', { bankName })}
          </Text>
          <Text className="text-[14px] font-sans text-text-secondary text-center mt-2">
            {t('onboarding.contract.contractDescription')}
          </Text>
        </Card>

        {contract && rules.length > 0 ? (
          <>
            {/* Rules */}
            <Card className="mb-6">
              <Text className="text-[15px] font-sans-semibold text-text mb-4">
                {t('onboarding.contract.rulesTitle')} ({rules.length})
              </Text>
              {rules.map((rule, index) => (
                <View
                  key={index}
                  className={`flex-row items-start py-3 ${
                    index < rules.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Text className="text-[15px] font-sans-bold text-primary mr-3 mt-0.5">
                    {index + 1}.
                  </Text>
                  <Text className="text-[15px] font-sans text-text flex-1">
                    {rule}
                  </Text>
                </View>
              ))}
            </Card>

            {/* Signature Status */}
            <Card className="mb-6">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name={isSigned ? 'check-circle' : 'clock-outline'}
                  size={20}
                  color={isSigned ? '#22c55e' : '#f5a623'}
                />
                <Text className="text-[14px] font-sans-medium text-text-secondary ml-2 flex-1">
                  {isSigned && contract.childSignedAt
                    ? t('profile.contractSignedAt', {
                        date: formatDate(contract.childSignedAt, locale),
                      })
                    : t('profile.contractNotSigned')}
                </Text>
              </View>
              {!isSigned && (
                <View className="mt-4">
                  <Button
                    title={t('profile.signContract', { defaultValue: 'Assinar contrato' })}
                    onPress={handleOpenSign}
                    variant="primary"
                    size="md"
                    fullWidth
                    icon="draw-pen"
                  />
                </View>
              )}
            </Card>

            {/* Actions */}
            <View className="gap-3">
              <Button
                title={t('profile.editContract')}
                onPress={() =>
                  router.push({
                    pathname: '/(modals)/contract-edit',
                    params: { mode: 'edit' },
                  })
                }
                variant="secondary"
                fullWidth
                icon="pencil-outline"
              />
              <Button
                title={t('profile.deleteContract')}
                onPress={handleDelete}
                variant="secondary"
                fullWidth
                icon="trash-can-outline"
                loading={deleting}
                disabled={deleting}
              />
            </View>
          </>
        ) : (
          <>
            {/* Empty State */}
            <Card className="mb-6 items-center py-8">
              <MaterialCommunityIcons
                name="file-document-remove-outline"
                size={48}
                color="#6b6b5a"
              />
              <Text className="text-[17px] font-sans-medium text-text-secondary mt-4 text-center">
                {t('profile.noContract')}
              </Text>
            </Card>

            <Button
              title={t('profile.createContract')}
              onPress={() =>
                router.push({
                  pathname: '/(modals)/contract-edit',
                  params: { mode: 'create' },
                })
              }
              variant="primary"
              fullWidth
              icon="file-document-edit-outline"
            />
          </>
        )}
      </ScrollView>

      {/* Signature Bottom Sheet */}
      <BottomSheet
        ref={signSheetRef}
        index={-1}
        snapPoints={signSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#faf9f0' }}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text className="text-[18px] font-sans-bold text-text text-center mb-4">
            {t('profile.signContract', { defaultValue: 'Assinar contrato' })}
          </Text>
          <View className="flex-1">
            <SignaturePad
              onSignatureComplete={handleSignatureComplete}
              onClear={handleSignatureClear}
            />
          </View>
          {signatureData && (
            <View className="mt-4">
              <Button
                title={t('profile.confirmSignature', { defaultValue: 'Confirmar assinatura' })}
                onPress={handleConfirmSign}
                variant="primary"
                size="lg"
                fullWidth
                icon="check"
                loading={signing}
                disabled={signing}
              />
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </SafeArea>
  );
}
