import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { bankApi } from '@/src/services/api/bank';
import { captureError, logger } from '@/src/utils/logger';

export interface FamilySessionPayload {
  token: string;
  family: {
    id: string;
    name: string;
    currency: 'BRL' | 'USD' | 'EUR';
  };
  guardianId?: string;
  roleLabel?: string;
  guardianAccessLevel?: 'admin' | 'member';
}

// Ativa uma sessão em outra família (aceite de convite ou troca):
// auth + hidratação de filhos/família + RevenueCat + assinatura.
export async function activateFamilySession(payload: FamilySessionPayload): Promise<void> {
  const { token, family, guardianId, roleLabel, guardianAccessLevel } = payload;
  const auth = useAuthStore.getState();

  await auth.setAuth(
    token,
    family.id,
    'parent',
    undefined,
    guardianId,
    roleLabel,
    guardianAccessLevel,
  );
  await auth.setBankName(family.name);
  await auth.setCurrency(family.currency);
  await auth.setOnboardingComplete(true);

  try {
    const [childrenRes, familyRes] = await Promise.all([
      bankApi.getChildren(),
      bankApi.getFamily(),
    ]);

    if (familyRes.data) {
      useBankStore.getState().setFamily(familyRes.data);
    }
    useBankStore.getState().setChildren(childrenRes.data ?? []);
    if (childrenRes.data?.length > 0) {
      useBankStore.getState().setSelectedChild(childrenRes.data[0].id);
    }
    useBankStore.getState().setHydrated(true);
  } catch (err) {
    useBankStore.getState().setFamily({
      id: family.id,
      name: family.name,
      currency: family.currency,
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      createdAt: new Date().toISOString(),
    });
    useBankStore.getState().setHydrated(false);
    captureError(err, 'Family session hydrate');
  }

  // RevenueCat: identidade = familyId (assinatura é por família)
  const isExpoGo = Constants.appOwnership === 'expo';
  if (!isExpoGo && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logIn(family.id);
    } catch (err) {
      logger.warn('[FamilySession] RevenueCat logIn failed', err);
    }
  }

  try {
    const { useSubscriptionStore } = await import('@/src/stores/useSubscriptionStore');
    useSubscriptionStore.getState().reset();
    await Promise.all([
      useSubscriptionStore.getState().loadSubscription(),
      useSubscriptionStore.getState().loadLimits(),
    ]);
  } catch {
    // Assinatura não é crítica para a troca
  }
}
