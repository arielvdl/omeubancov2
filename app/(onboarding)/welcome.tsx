import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { authApi } from '@/src/services/api/auth';
import { bankApi } from '@/src/services/api/bank';
import { startGoogleSignIn } from '@/src/services/google-auth';
import { loginWithPasskey, isPasskeySupported, getPasskeyErrorType } from '@/src/services/passkey';
import { logger } from '@/src/utils/logger';
import { haptics } from '@/src/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBankName = useAuthStore((s) => s.setBankName);
  const setCurrency = useAuthStore((s) => s.setCurrency);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported);
  }, []);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  async function handleGoogleSignIn() {
    setLoading(true);
    haptics.medium();

    try {
      const result = await startGoogleSignIn();
      if (!result) {
        setLoading(false);
        return;
      }
      if (result.error) throw new Error(result.error);

      await setAuth(result.token, result.familyId, 'parent');

      if (result.isNewUser) {
        router.replace('/(onboarding)/bank-setup');
      } else {
        await setBankName(result.familyName);
        await setCurrency(result.currency as 'BRL' | 'USD' | 'EUR');

        const childrenRes = await bankApi.getChildren();
        useBankStore.getState().setHydrated(true);
        if (childrenRes.data?.length > 0) {
          useBankStore.getState().setChildren(childrenRes.data);
          useBankStore.getState().setSelectedChild(childrenRes.data[0].id);
          await setOnboardingComplete(true);
          router.replace('/(tabs)');
        } else {
          router.replace('/(onboarding)/bank-setup');
        }
      }
    } catch (error: any) {
      haptics.error();
      console.error('[GoogleAuth] Sign-in error:', error);
      if (error?.isNetworkError || error?.message === 'NETWORK_ERROR') {
        Alert.alert(t('common.error'), t('common.errorNetwork'));
      } else if (error?.status === 500 || error?.status === 503) {
        Alert.alert(t('common.error'), t('auth.googleServerError'));
      } else {
        Alert.alert(t('common.error'), t('auth.googleSignInError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setLoading(true);
    haptics.medium();
    try {
      const result = await loginWithPasskey();
      if (!result) {
        setLoading(false);
        return;
      }

      await setAuth(result.token, result.familyId, 'parent', undefined, result.guardianId, result.roleLabel);

      if (result.isNewUser) {
        router.replace('/(onboarding)/bank-setup');
      } else {
        await setBankName(result.familyName);
        await setCurrency(result.currency as 'BRL' | 'USD' | 'EUR');

        const [childrenRes, familyRes] = await Promise.all([
          bankApi.getChildren(),
          bankApi.getFamily(),
        ]);

        if (familyRes.data) {
          useBankStore.getState().setFamily(familyRes.data);
        }

        useBankStore.getState().setHydrated(true);
        if (childrenRes.data?.length > 0) {
          useBankStore.getState().setChildren(childrenRes.data);
          useBankStore.getState().setSelectedChild(childrenRes.data[0].id);
          await setOnboardingComplete(true);
          router.replace('/(tabs)');
        } else {
          router.replace('/(onboarding)/bank-setup');
        }
      }
    } catch (error: any) {
      haptics.error();
      const errorType = getPasskeyErrorType(error);
      logger.error('[PasskeyLogin] Login failed', {
        errorType,
        error: error?.error,
        message: error?.message,
        serverMessage: error?.response?.data?.message,
      });

      switch (errorType) {
        case 'cancelled':
          // User cancelled, no alert needed
          break;
        case 'no_credentials':
          Alert.alert(t('common.error'), t('auth.passkeyNoCredentials'));
          break;
        case 'not_supported':
          Alert.alert(t('common.error'), t('auth.passkeyNotSupported'));
          break;
        case 'server':
          Alert.alert(t('common.error'), t('auth.passkeyServerError'));
          break;
        default:
          Alert.alert(t('common.error'), t('auth.passkeyError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    haptics.medium();

    try {
      if (isLogin) {
        const { data } = await authApi.login({ email: email.trim(), password });

        await setAuth(data.token, data.family.id, 'parent');

        if (data.isNewUser) {
          router.replace('/(onboarding)/bank-setup');
        } else {
          await setBankName(data.family.name);
          await setCurrency(data.family.currency as 'BRL' | 'USD' | 'EUR');

          // Load children and family data before navigating
          const [childrenRes, familyRes] = await Promise.all([
            bankApi.getChildren(),
            bankApi.getFamily(),
          ]);

          if (familyRes.data) {
            useBankStore.getState().setFamily(familyRes.data);
          }

          useBankStore.getState().setHydrated(true);
          if (childrenRes.data?.length > 0) {
            useBankStore.getState().setChildren(childrenRes.data);
            useBankStore.getState().setSelectedChild(childrenRes.data[0].id);
            await setOnboardingComplete(true);
            router.replace('/(tabs)');
          } else {
            // User exists but has no children — go through onboarding
            router.replace('/(onboarding)/bank-setup');
          }
        }
      } else {
        const { data } = await authApi.register({
          email: email.trim(),
          password,
          bankName: 'O Meu Banco',
          currency: 'BRL',
          locale: 'pt-BR',
          timezone: 'America/Sao_Paulo',
        });

        await setAuth(data.token, data.family.id, 'parent');
        router.replace('/(onboarding)/bank-setup');
      }
    } catch (error: any) {
      haptics.error();
      const status = error?.response?.status;
      if (status === 401) {
        Alert.alert(t('common.error'), t('auth.invalidCredentials'));
      } else if (status === 409) {
        Alert.alert(t('common.error'), t('auth.emailAlreadyExists'));
      } else {
        Alert.alert(t('common.error'), t('common.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#FFD600' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD600" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-8">
            <View className="items-center mb-10">
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 120, height: 120, borderRadius: 24 }}
                resizeMode="contain"
              />
              <Text className="text-[16px] font-sans text-center mt-4" style={{ lineHeight: 24, color: '#1a1a0e' }}>
                {t('onboarding.welcome.appDescription')}
              </Text>
            </View>

            <View className="w-full mb-7">
              <View className="mb-5">
                <Text className="text-[14px] font-sans-semibold mb-2 ml-1" style={{ color: '#1a1a0e' }}>
                  {t('auth.email')}
                </Text>
                <View className="flex-row items-center rounded-2xl px-5" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color="#555"
                  />
                  <TextInput
                    className="flex-1 text-[16px] font-sans py-4 ml-3"
                    style={{ color: '#1a1a0e' }}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-[14px] font-sans-semibold mb-2 ml-1" style={{ color: '#1a1a0e' }}>
                  {t('auth.password')}
                </Text>
                <View className="flex-row items-center rounded-2xl px-5" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color="#555"
                  />
                  <TextInput
                    className="flex-1 text-[16px] font-sans py-4 ml-3"
                    style={{ color: '#1a1a0e' }}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#555"
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <AnimatedPressable
              onPress={handleSubmit}
              onPressIn={() => {
                scale.value = withSpring(0.96, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              onPressOut={() => {
                scale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              disabled={loading}
              className="w-full flex-row items-center justify-center rounded-3xl"
              style={[
                animatedStyle,
                {
                  backgroundColor: '#1a1a0e',
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFD600" />
              ) : (
                <Text className="text-[17px] font-sans-bold" style={{ color: '#ffffff' }}>
                  {isLogin ? t('auth.login') : t('auth.register')}
                </Text>
              )}
            </AnimatedPressable>

            <Pressable
              onPress={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="mt-4"
            >
              <Text className="text-[14px] font-sans text-center" style={{ color: '#1a1a0e' }}>
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
              </Text>
            </Pressable>

            <View className="flex-row items-center w-full mt-6 mb-4">
              <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
              <Text className="mx-4 text-[13px] font-sans" style={{ color: '#1a1a0e' }}>
                {t('auth.or')}
              </Text>
              <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex-row items-center justify-center rounded-2xl"
              style={{
                backgroundColor: '#ffffff',
                paddingVertical: 14,
                paddingHorizontal: 24,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
              <Text className="text-[15px] font-sans-semibold ml-3" style={{ color: '#1a1a0e' }}>
                {t('onboarding.welcome.googleSignIn')}
              </Text>
            </Pressable>

            {passkeySupported && (
              <Pressable
                onPress={handlePasskeyLogin}
                disabled={loading}
                className="w-full flex-row items-center justify-center rounded-2xl mt-3"
                style={{
                  backgroundColor: '#ffffff',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <MaterialCommunityIcons name="fingerprint" size={22} color="#1a1a14" />
                <Text className="text-[15px] font-sans-semibold ml-3" style={{ color: '#1a1a0e' }}>
                  {t('auth.loginWithPasskey')}
                </Text>
              </Pressable>
            )}

            <Text className="text-[15px] font-sans text-center mt-6 px-4" style={{ lineHeight: 22, color: '#1a1a0e' }}>
              {t('onboarding.welcome.terms')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
