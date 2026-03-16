import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { useParentAuth } from '@/src/hooks/useParentAuth';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { haptics } from '@/src/utils/haptics';

const MIN_PIN = 4;
const MAX_PIN = 6;

type Step = 'verify' | 'math' | 'new-pin' | 'confirm-pin' | 'success';

function generateMathChallenge(): { question: string; answer: number } {
  const type = Math.floor(Math.random() * 3);

  if (type === 0) {
    const a = Math.floor(Math.random() * 400) + 100;
    const b = Math.floor(Math.random() * 90) + 11;
    return { question: `${a} × ${b}`, answer: a * b };
  }

  if (type === 1) {
    const b = Math.floor(Math.random() * 40) + 12;
    const quotient = Math.floor(Math.random() * 80) + 20;
    const a = b * quotient;
    return { question: `${a} ÷ ${b}`, answer: quotient };
  }

  const a = Math.floor(Math.random() * 300) + 100;
  const b = Math.floor(Math.random() * 300) + 100;
  const c = Math.floor(Math.random() * 8) + 2;
  return { question: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
}

export default function ChangePinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { biometricAvailable, authenticateWithBiometrics } = useParentAuth();
  const mathChallengeEnabled = useAuthStore((s) => s.mathChallengeEnabled);
  const setMasterPin = useAuthStore((s) => s.setMasterPin);

  const [step, setStep] = useState<Step>('verify');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');

  const challenge = useMemo(() => generateMathChallenge(), []);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const handleBiometric = useCallback(async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      haptics.success();
      setStep('new-pin');
    } else {
      haptics.error();
      setError(t('parent.changePin.biometricFailed', { defaultValue: 'Biometria falhou. Tente outro método.' }));
    }
  }, [authenticateWithBiometrics, t]);

  const handleMathVerify = useCallback(() => {
    const userAnswer = parseInt(mathAnswer, 10);
    if (userAnswer === challenge.answer) {
      haptics.success();
      setError('');
      setStep('new-pin');
    } else {
      haptics.error();
      triggerShake();
      setError(t('parent.changePin.wrongAnswer', { defaultValue: 'Resposta incorreta. Tente novamente.' }));
      setMathAnswer('');
    }
  }, [mathAnswer, challenge.answer, t, triggerShake]);

  const handleNewPinConfirm = useCallback(() => {
    if (newPin.length < MIN_PIN) return;
    setError('');
    setStep('confirm-pin');
  }, [newPin]);

  const handleSavePin = useCallback(async () => {
    if (confirmPin !== newPin) {
      haptics.error();
      triggerShake();
      setError(t('onboarding.masterPin.mismatch'));
      setConfirmPin('');
      return;
    }

    await setMasterPin(confirmPin);
    haptics.success();
    setStep('success');
  }, [confirmPin, newPin, setMasterPin, t, triggerShake]);

  const renderVerifyStep = () => (
    <Animated.View entering={FadeIn.duration(300)} className="gap-5">
      <Card>
        <View className="items-center py-4">
          <MaterialCommunityIcons name="shield-check-outline" size={56} color="#1a1a0e" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('parent.changePin.verifyTitle', { defaultValue: 'Verificação de identidade' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center px-4">
            {t('parent.changePin.verifySubtitle', { defaultValue: 'Confirme sua identidade antes de alterar o PIN.' })}
          </Text>
        </View>
      </Card>

      {biometricAvailable && (
        <Button
          title={t('parent.changePin.useBiometric', { defaultValue: 'Usar reconhecimento facial' })}
          onPress={handleBiometric}
          variant="primary"
          size="lg"
          fullWidth
          icon="face-recognition"
        />
      )}

      {mathChallengeEnabled && (
        <Button
          title={t('parent.changePin.useMath', { defaultValue: 'Resolver cálculo matemático' })}
          onPress={() => { setError(''); setStep('math'); }}
          variant="secondary"
          size="lg"
          fullWidth
          icon="calculator-variant-outline"
        />
      )}

      {error ? (
        <Text className="text-[14px] font-sans text-danger text-center">{error}</Text>
      ) : null}
    </Animated.View>
  );

  const renderMathStep = () => (
    <Animated.View entering={FadeIn.duration(300)} className="gap-5">
      <Card>
        <View className="items-center py-4">
          <MaterialCommunityIcons name="calculator-variant-outline" size={56} color="#1a1a0e" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('parent.changePin.mathTitle', { defaultValue: 'Desafio matemático' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center px-4">
            {t('parent.changePin.mathSubtitle', { defaultValue: 'Resolva o cálculo abaixo para continuar.' })}
          </Text>
        </View>

        <View className="bg-background-light rounded-2xl py-6 px-4 mt-4 items-center">
          <Text className="text-[32px] font-sans-bold text-text">
            {challenge.question} = ?
          </Text>
        </View>

        <Animated.View style={shakeStyle} className="mt-5">
          <TextInput
            value={mathAnswer}
            onChangeText={(text) => {
              setMathAnswer(text.replace(/[^0-9-]/g, ''));
              setError('');
            }}
            placeholder={t('parent.changePin.mathPlaceholder', { defaultValue: 'Digite sua resposta' })}
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            className="bg-background-light rounded-2xl py-4 px-5 text-[20px] font-sans-semibold text-text text-center"
            autoFocus
          />
        </Animated.View>

        {error ? (
          <Text className="text-[14px] font-sans text-danger text-center mt-3">{error}</Text>
        ) : null}
      </Card>

      <Button
        title={t('common.confirm')}
        onPress={handleMathVerify}
        variant="primary"
        size="lg"
        fullWidth
        icon="check"
        disabled={!mathAnswer}
      />

      <Button
        title={t('common.back')}
        onPress={() => { setStep('verify'); setError(''); setMathAnswer(''); }}
        variant="ghost"
        size="md"
        fullWidth
      />
    </Animated.View>
  );

  const renderNewPinStep = () => (
    <Animated.View entering={FadeIn.duration(300)} className="gap-5">
      <Card>
        <View className="items-center py-4">
          <MaterialCommunityIcons name="lock-reset" size={56} color="#1a1a0e" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('parent.changePin.newPinTitle', { defaultValue: 'Novo PIN' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center">
            {t('onboarding.masterPin.hint')}
          </Text>
        </View>

        <TextInput
          value={newPin}
          onChangeText={(text) => {
            const clean = text.replace(/[^0-9]/g, '').slice(0, MAX_PIN);
            setNewPin(clean);
            setError('');
          }}
          placeholder={t('onboarding.masterPin.placeholder')}
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={MAX_PIN}
          className="bg-background-light rounded-2xl py-4 px-5 text-[20px] font-sans-semibold text-text text-center mt-4"
          autoFocus
        />

        <View className="flex-row justify-center gap-2 mt-4">
          {Array.from({ length: MAX_PIN }, (_, i) => (
            <View
              key={i}
              className={`rounded-full ${i < newPin.length ? 'bg-primary' : 'bg-gray-200'}`}
              style={{ width: 14, height: 14, borderRadius: 7 }}
            />
          ))}
        </View>
      </Card>

      <Button
        title={t('common.next')}
        onPress={handleNewPinConfirm}
        variant="primary"
        size="lg"
        fullWidth
        icon="arrow-right"
        disabled={newPin.length < MIN_PIN}
      />
    </Animated.View>
  );

  const renderConfirmPinStep = () => (
    <Animated.View entering={FadeIn.duration(300)} className="gap-5">
      <Card>
        <View className="items-center py-4">
          <MaterialCommunityIcons name="lock-check-outline" size={56} color="#1a1a0e" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('parent.changePin.confirmPinTitle', { defaultValue: 'Confirme o novo PIN' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center">
            {t('parent.changePin.confirmPinSubtitle', { defaultValue: 'Digite novamente para confirmar.' })}
          </Text>
        </View>

        <Animated.View style={shakeStyle}>
          <TextInput
            value={confirmPin}
            onChangeText={(text) => {
              const clean = text.replace(/[^0-9]/g, '').slice(0, MAX_PIN);
              setConfirmPin(clean);
              setError('');
            }}
            placeholder={t('onboarding.masterPin.confirm')}
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={MAX_PIN}
            className="bg-background-light rounded-2xl py-4 px-5 text-[20px] font-sans-semibold text-text text-center mt-4"
            autoFocus
          />
        </Animated.View>

        <View className="flex-row justify-center gap-2 mt-4">
          {Array.from({ length: MAX_PIN }, (_, i) => (
            <View
              key={i}
              className={`rounded-full ${i < confirmPin.length ? 'bg-primary' : 'bg-gray-200'}`}
              style={{ width: 14, height: 14, borderRadius: 7 }}
            />
          ))}
        </View>

        {error ? (
          <Text className="text-[14px] font-sans text-danger text-center mt-3">{error}</Text>
        ) : null}
      </Card>

      <Button
        title={t('parent.changePin.save', { defaultValue: 'Salvar novo PIN' })}
        onPress={handleSavePin}
        variant="primary"
        size="lg"
        fullWidth
        icon="content-save-check-outline"
        disabled={confirmPin.length < MIN_PIN}
      />

      <Button
        title={t('common.back')}
        onPress={() => { setStep('new-pin'); setConfirmPin(''); setError(''); }}
        variant="ghost"
        size="md"
        fullWidth
      />
    </Animated.View>
  );

  const renderSuccessStep = () => (
    <Animated.View entering={FadeIn.duration(400)} className="gap-5 items-center">
      <Card>
        <View className="items-center py-8">
          <View
            className="bg-primary-50 rounded-full items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            <MaterialCommunityIcons name="check-bold" size={44} color="#1a1a0e" />
          </View>
          <Text className="text-[22px] font-sans-bold text-text mt-5 text-center">
            {t('parent.changePin.successTitle', { defaultValue: 'PIN alterado!' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center px-4">
            {t('parent.changePin.successSubtitle', { defaultValue: 'Seu novo PIN de responsável foi salvo com segurança.' })}
          </Text>
        </View>
      </Card>

      <Button
        title={t('common.done')}
        onPress={() => router.back()}
        variant="primary"
        size="lg"
        fullWidth
        icon="check"
      />
    </Animated.View>
  );

  return (
    <SafeArea>
      <Header
        title={t('parent.changePin.title', { defaultValue: 'Alterar PIN' })}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'verify' && renderVerifyStep()}
        {step === 'math' && renderMathStep()}
        {step === 'new-pin' && renderNewPinStep()}
        {step === 'confirm-pin' && renderConfirmPinStep()}
        {step === 'success' && renderSuccessStep()}
      </ScrollView>
    </SafeArea>
  );
}
