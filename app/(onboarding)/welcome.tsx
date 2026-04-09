import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { authApi } from '@/src/services/api/auth';
import { bankApi } from '@/src/services/api/bank';
import * as AppleAuthentication from 'expo-apple-authentication';
import { startGoogleSignIn } from '@/src/services/google-auth';
import { startAppleSignIn } from '@/src/services/apple-auth';
import { loginWithPasskey, isPasskeySupported, getPasskeyErrorType } from '@/src/services/passkey';
import { logger, captureError } from '@/src/utils/logger';
import { haptics } from '@/src/utils/haptics';
import { invitationsApi } from '@/src/services/api/invitations';
import { MASCOTS } from '@/src/constants/mascots';
import { MascotVideo } from '@/src/components/mascot/MascotVideo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CARD_SIZE = 160;
const CARD_SPACING = 170;
const AUTO_ADVANCE_MS = 6000;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { inviteCode } = useLocalSearchParams<{ inviteCode?: string }>();
  const { width: screenWidth } = useWindowDimensions();
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
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  // --- Carousel ---
  const carouselOffset = useSharedValue(0);

  const updateActiveIndex = useCallback((idx: number) => {
    setActiveIndex(idx);
  }, []);

  const advanceCarousel = useCallback(() => {
    const next = (activeIndex + 1) % MASCOTS.length;
    carouselOffset.value = withTiming(next, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    updateActiveIndex(next);
  }, [activeIndex, carouselOffset, updateActiveIndex]);

  useEffect(() => {
    autoAdvanceRef.current = setInterval(advanceCarousel, AUTO_ADVANCE_MS);
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [advanceCarousel]);

  const goToSlide = useCallback(
    (idx: number) => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
      carouselOffset.value = withTiming(idx, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      updateActiveIndex(idx);
      autoAdvanceRef.current = setInterval(advanceCarousel, AUTO_ADVANCE_MS);
    },
    [carouselOffset, updateActiveIndex, advanceCarousel],
  );

  // --- Swipe gesture for carousel ---
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX < -50) {
        // Swipe left -> next
        const next = Math.min(activeIndex + 1, MASCOTS.length - 1);
        if (next !== activeIndex) {
          runOnJS(goToSlide)(next);
        }
      } else if (event.translationX > 50) {
        // Swipe right -> previous
        const prev = Math.max(activeIndex - 1, 0);
        if (prev !== activeIndex) {
          runOnJS(goToSlide)(prev);
        }
      }
    });

  // --- Modal animation ---
  const modalProgress = useSharedValue(0);

  const openModal = useCallback(() => {
    haptics.light();
    setShowModal(true);
    modalProgress.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [modalProgress]);

  const closeModal = useCallback(() => {
    modalProgress.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setShowModal(false), 300);
  }, [modalProgress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: modalProgress.value * 0.5,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(modalProgress.value, [0, 1], [600, 0]) }],
  }));

  // --- Enter button animation ---
  const enterScale = useSharedValue(1);
  const enterAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: enterScale.value }],
  }));

  // --- Auth logic (preserved exactly) ---
  const tryAcceptInvite = async () => {
    if (!inviteCode) return;
    try {
      await invitationsApi.acceptInvitation(inviteCode);
    } catch (err: any) {
      logger.warn('[Invite] Accept after login failed', { inviteCode, error: err?.message });
    }
  };

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
      await tryAcceptInvite();

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
      captureError(error, 'GoogleAuth sign-in');
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

  async function handleAppleSignIn() {
    setLoading(true);
    haptics.medium();

    try {
      const result = await startAppleSignIn();
      if (!result) {
        setLoading(false);
        return;
      }

      await setAuth(result.token, result.familyId, 'parent');
      await tryAcceptInvite();

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
      captureError(error, 'AppleAuth sign-in');
      if (error?.isNetworkError || error?.message === 'NETWORK_ERROR') {
        Alert.alert(t('common.error'), t('common.errorNetwork'));
      } else if (error?.status === 500 || error?.status === 503) {
        Alert.alert(t('common.error'), t('auth.appleSignInError'));
      } else {
        Alert.alert(t('common.error'), t('auth.appleSignInError'));
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
      await tryAcceptInvite();

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
        await tryAcceptInvite();

        if (data.isNewUser) {
          router.replace('/(onboarding)/bank-setup');
        } else {
          await setBankName(data.family.name);
          await setCurrency(data.family.currency as 'BRL' | 'USD' | 'EUR');

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
      if (status !== 401 && status !== 409) {
        captureError(error, 'Email/password auth');
      }
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

  // --- Carousel card renderer ---
  const centerX = screenWidth / 2;

  function renderCarouselCards() {
    return MASCOTS.map((mascot, idx) => (
      <CarouselCard
        key={mascot.id}
        index={idx}
        mascot={mascot}
        carouselOffset={carouselOffset}
        centerX={centerX}
        onPress={() => goToSlide(idx)}
      />
    ));
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD600" />

      <View style={{ flex: 1 }}>
        {/* ===== TOP - Yellow section with carousel (takes ~55% of screen) ===== */}
        <View style={{ flex: 55, backgroundColor: '#FFD600', justifyContent: 'center', alignItems: 'center' }}>
          {/* Menu button - absolute top right */}
          <View style={{ position: 'absolute', top: 4, right: 20, zIndex: 60 }}>
            <Pressable
              onPress={() => setShowMenu(!showMenu)}
              hitSlop={12}
              style={{ padding: 6 }}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color="#1a1a0e" />
            </Pressable>

            {/* Dropdown menu */}
            {showMenu && (
              <View
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  paddingVertical: 6,
                  paddingHorizontal: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                  zIndex: 100,
                  minWidth: 210,
                }}
              >
                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    WebBrowser.openBrowserAsync('https://omeubanco.xyz/privacidade');
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                >
                  <Text className="text-[14px] font-sans" style={{ color: '#1a1a0e' }}>
                    Política de privacidade
                  </Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: '#e5e5d8', marginHorizontal: 12 }} />
                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    WebBrowser.openBrowserAsync('https://omeubanco.xyz/termos');
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                >
                  <Text className="text-[14px] font-sans" style={{ color: '#1a1a0e' }}>
                    Termos de uso
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Carousel - centered in yellow area */}
          <GestureDetector gesture={swipeGesture}>
            <View style={{ width: screenWidth, height: CARD_SIZE + 20, overflow: 'visible' }}>
              {renderCarouselCards()}
            </View>
          </GestureDetector>
        </View>

        {/* ===== BOTTOM - White curved section (takes ~45% of screen) ===== */}
        <View
          style={{
            flex: 45,
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            marginTop: -36,
            alignItems: 'center',
            paddingHorizontal: 32,
            justifyContent: 'center',
          }}
        >
          {/* Logo overlapping yellow/white boundary */}
          <View
            style={{
              position: 'absolute',
              top: -36,
              alignSelf: 'center',
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 64, height: 64, borderRadius: 16 }}
              resizeMode="contain"
            />
          </View>

          {/* Content centered in white section */}
          <View style={{ alignItems: 'center', marginTop: 44 }}>
            {/* Carousel indicator dots */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {MASCOTS.map((_, idx) => (
                <Pressable key={idx} onPress={() => goToSlide(idx)}>
                  <View
                    style={{
                      width: activeIndex === idx ? 20 : 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: activeIndex === idx ? '#FFD600' : '#e5e5d8',
                    }}
                  />
                </Pressable>
              ))}
            </View>

            {/* Title */}
            <Text
              className="text-[30px] font-sans-bold"
              style={{
                color: '#1a1a0e',
                textAlign: 'center',
                marginTop: 16,
                lineHeight: 38,
              }}
            >
              Finanças divertidas{'\n'}para toda família
            </Text>

            {/* Subtitle */}
            <Text
              className="text-[17px] font-sans"
              style={{
                color: '#6b6b5a',
                textAlign: 'center',
                marginTop: 8,
                lineHeight: 26,
              }}
            >
              Ensine seus filhos sobre dinheiro{'\n'}de um jeito lúdico e seguro
            </Text>

            {/* Enter button */}
            <AnimatedPressable
              onPress={openModal}
              onPressIn={() => {
                enterScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                enterScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={[
                enterAnimStyle,
                {
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: '#FFD600',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
            >
              <MaterialCommunityIcons name="arrow-right" size={28} color="#1a1a0e" />
            </AnimatedPressable>
          </View>
        </View>
      </View>

      {/* ===== LOGIN MODAL (Bottom Sheet) ===== */}
      {showModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}>
          {/* Backdrop */}
          <Animated.View style={[{ flex: 1, backgroundColor: '#000000' }, backdropStyle]}>
            <Pressable style={{ flex: 1 }} onPress={closeModal} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={[
              sheetStyle,
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '85%',
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={10}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 12, paddingBottom: 16 }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View
                    style={{
                      width: 40,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: '#e5e5d8',
                    }}
                  />
                </View>

                {/* Title */}
                <Text
                  className="text-[22px] font-sans-bold"
                  style={{ color: '#1a1a0e', textAlign: 'center', marginBottom: 24 }}
                >
                  Entrar no Meu Banco
                </Text>

                {/* Email field */}
                <View style={{ marginBottom: 14 }}>
                  <Text className="text-[14px] font-sans-semibold" style={{ color: '#1a1a0e', marginBottom: 8, marginLeft: 2 }}>
                    {t('auth.email')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8f8f5',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#e5e5d8',
                      paddingHorizontal: 16,
                    }}
                  >
                    <MaterialCommunityIcons name="email-outline" size={20} color="#6b6b5a" />
                    <TextInput
                      className="flex-1 text-[16px] font-sans"
                      style={{ color: '#1a1a0e', paddingVertical: 14, marginLeft: 12 }}
                      placeholder={t('auth.emailPlaceholder')}
                      placeholderTextColor="#999"
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

                {/* Password field */}
                <View style={{ marginBottom: 20 }}>
                  <Text className="text-[14px] font-sans-semibold" style={{ color: '#1a1a0e', marginBottom: 8, marginLeft: 2 }}>
                    {t('auth.password')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8f8f5',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#e5e5d8',
                      paddingHorizontal: 16,
                    }}
                  >
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#6b6b5a" />
                    <TextInput
                      className="flex-1 text-[16px] font-sans"
                      style={{ color: '#1a1a0e', paddingVertical: 14, marginLeft: 12 }}
                      placeholder={t('auth.passwordPlaceholder')}
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      editable={!loading}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6b6b5a"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={{
                    backgroundColor: '#1a1a0e',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFD600" />
                  ) : (
                    <Text className="text-[16px] font-sans-bold" style={{ color: '#ffffff' }}>
                      {isLogin ? t('auth.login') : t('auth.register')}
                    </Text>
                  )}
                </Pressable>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#e5e5d8' }} />
                  <Text className="text-[13px] font-sans" style={{ color: '#6b6b5a', marginHorizontal: 14 }}>
                    {t('auth.or')}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#e5e5d8' }} />
                </View>

                {/* Google sign in */}
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f8f5',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e5e5d8',
                    paddingVertical: 14,
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
                  <Text className="text-[15px] font-sans-semibold" style={{ color: '#1a1a0e', marginLeft: 10 }}>
                    {t('onboarding.welcome.googleSignIn')}
                  </Text>
                </Pressable>

                {/* Apple sign in */}
                {appleAuthAvailable && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={14}
                    onPress={handleAppleSignIn}
                    style={{
                      height: 50,
                      marginTop: 10,
                    }}
                  />
                )}

                {/* Passkey sign in */}
                {passkeySupported && (
                  <Pressable
                    onPress={handlePasskeyLogin}
                    disabled={loading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8f8f5',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#e5e5d8',
                      paddingVertical: 14,
                      marginTop: 10,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <MaterialCommunityIcons name="fingerprint" size={22} color="#1a1a0e" />
                    <Text className="text-[15px] font-sans-semibold" style={{ color: '#1a1a0e', marginLeft: 10 }}>
                      {t('auth.loginWithPasskey')}
                    </Text>
                  </Pressable>
                )}

                {/* Toggle login/register */}
                <Pressable
                  onPress={() => setIsLogin(!isLogin)}
                  disabled={loading}
                  style={{ marginTop: 18, alignItems: 'center' }}
                >
                  <Text className="text-[14px] font-sans" style={{ color: '#6b6b5a', textAlign: 'center' }}>
                    {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                  </Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      )}

      {/* Close menu on outside tap */}
      {showMenu && (
        <Pressable
          onPress={() => setShowMenu(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
        />
      )}
    </SafeAreaView>
  );
}

// --- Carousel Card Component ---
interface CarouselCardProps {
  index: number;
  mascot: (typeof MASCOTS)[number];
  carouselOffset: Animated.SharedValue<number>;
  centerX: number;
  onPress: () => void;
}

function CarouselCard({ index, mascot, carouselOffset, centerX, onPress }: CarouselCardProps) {
  const animStyle = useAnimatedStyle(() => {
    const diff = index - carouselOffset.value;
    const translateX = diff * CARD_SPACING + centerX - CARD_SIZE / 2;
    const absD = Math.abs(diff);
    const cardScale = interpolate(absD, [0, 1, 2, 3], [1, 0.7, 0.5, 0.4]);
    const cardOpacity = interpolate(absD, [0, 1, 2, 3], [1, 0.5, 0.25, 0]);

    return {
      transform: [{ translateX }, { scale: cardScale }],
      opacity: cardOpacity,
      zIndex: 10 - Math.round(absD),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          width: CARD_SIZE,
          height: CARD_SIZE,
        },
        animStyle,
      ]}
    >
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <View
          style={{
            width: CARD_SIZE,
            height: CARD_SIZE,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MascotVideo mascot={mascot} size={CARD_SIZE - 24} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
