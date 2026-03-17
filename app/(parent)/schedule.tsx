import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { Badge } from '@/src/components/ui/Badge';
import { useBankStore } from '@/src/stores/useBankStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { currencyToCents, isValidAmount } from '@/src/utils/currency';
import { bankApi } from '@/src/services/api/bank';
import { haptics } from '@/src/utils/haptics';
import type { ScheduledDeposit } from '@/src/types/user';

type Frequency = 'daily' | 'weekly' | 'monthly';

const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

const COUNTRIES = [
  { label: 'Brasil', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { label: 'Portugal', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
  { label: 'EUA (Leste)', timezone: 'America/New_York', flag: '🇺🇸' },
  { label: 'EUA (Oeste)', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { label: 'Reino Unido', timezone: 'Europe/London', flag: '🇬🇧' },
  { label: 'Espanha', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { label: 'Japão', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const schedules = useBankStore((s) => s.schedules);
  const addSchedule = useBankStore((s) => s.addSchedule);
  const updateSchedule = useBankStore((s) => s.updateSchedule);
  const removeSchedule = useBankStore((s) => s.removeSchedule);

  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? '');
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [depositTime, setDepositTime] = useState('00:00');
  const [selectedTimezone, setSelectedTimezone] = useState('America/Sao_Paulo');
  const [showTimezones, setShowTimezones] = useState(false);
  const [loading, setLoading] = useState(false);

  const amountInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const currency = useSettingsStore((s) => s.currency);
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '\u20AC';

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    haptics.heavy();
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const childSchedules = (schedules ?? []).filter(
    (s) => s.childId === selectedChildId && s.status !== 'cancelled',
  );
  const selectedCountry = COUNTRIES.find((c) => c.timezone === selectedTimezone) ?? COUNTRIES[0];

  const handleCreate = useCallback(async () => {
    const numericValue = parseFloat(amountText.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      triggerShake();
      setAmountError(t('validation.amountInvalid', { defaultValue: 'Digite um valor válido.' }));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      amountInputRef.current?.focus();
      return;
    }
    setAmountError('');
    const cents = currencyToCents(numericValue);
    if (!isValidAmount(cents) || !selectedChild) return;

    setLoading(true);

    const scheduleData: ScheduledDeposit = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      familyId: selectedChild.familyId,
      childId: selectedChild.id,
      amount: cents,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      depositTime,
      timezone: selectedTimezone,
      nextRunAt: new Date().toISOString(),
      lastRunAt: null,
      status: 'active',
    };

    try {
      const response = await bankApi.createSchedule(selectedChild.id, {
        amount: cents,
        frequency,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        depositTime,
        timezone: selectedTimezone,
      });
      addSchedule(response.data);
    } catch {
      // Fallback local
      addSchedule(scheduleData);
    }

    setAmountText('');
    setLoading(false);
    haptics.success();
  }, [amountText, selectedChild, frequency, dayOfWeek, dayOfMonth, depositTime, selectedTimezone, addSchedule, t]);

  const handleTogglePause = useCallback(
    async (schedule: ScheduledDeposit) => {
      const newStatus = schedule.status === 'active' ? 'paused' : 'active';
      try {
        const apiCall =
          schedule.status === 'active'
            ? bankApi.pauseSchedule(schedule.childId, schedule.id)
            : bankApi.resumeSchedule(schedule.childId, schedule.id);
        const response = await apiCall;
        updateSchedule(schedule.id, response.data);
      } catch {
        updateSchedule(schedule.id, { status: newStatus } as Partial<ScheduledDeposit>);
      }
      haptics.success();
    },
    [updateSchedule],
  );

  const handleDelete = useCallback(
    (schedule: ScheduledDeposit) => {
      Alert.alert(t('parent.cancelSchedule'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await bankApi.deleteSchedule(schedule.childId, schedule.id);
            } catch { /* fallback */ }
            removeSchedule(schedule.id);
            haptics.success();
          },
        },
      ]);
    },
    [removeSchedule, t],
  );

  const frequencyLabel = (f: Frequency) => {
    const map: Record<Frequency, string> = {
      daily: t('parent.frequencyDaily'),
      weekly: t('parent.frequencyWeekly'),
      monthly: t('parent.frequencyMonthly'),
    };
    return map[f];
  };

  return (
    <SafeArea>
      <Header title={t('parent.scheduleDeposit')} showBack onBack={() => router.back()} />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Child Selector */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-3">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => setSelectedChildId(child.id)}
                    className={`items-center p-3.5 rounded-2xl ${
                      isSelected ? 'bg-primary-50' : 'bg-surface'
                    }`}
                    style={isSelected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 2,
                        }
                    }
                  >
                    <Avatar avatarId={child.avatarUrl ?? undefined} size="sm" />
                    <Text className="text-xs font-sans-medium text-text mt-1">
                      {child.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Amount */}
        <Animated.View style={shakeStyle}>
          <View className="items-center py-6 mb-2">
            <Text className="text-[15px] font-sans-semibold text-text-secondary mb-4">
              {t('parent.amount', { defaultValue: 'Valor' })}
            </Text>
            <View className="flex-row items-center justify-center">
              <Text className="text-[40px] font-sans-bold text-text-secondary mr-1">
                {currencySymbol}
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amountText}
                onChangeText={(text) => {
                  setAmountText(text);
                  setAmountError('');
                }}
                placeholder="0,00"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                autoFocus
                className="text-[48px] font-sans-bold text-text"
                style={{ minWidth: 120, textAlign: 'center', lineHeight: 58, padding: 0 }}
              />
            </View>
            {amountError ? (
              <Text className="text-[14px] font-sans text-danger mt-3">{amountError}</Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Frequency */}
        <Text className="text-[15px] font-sans-semibold text-text mb-3">
          {t('parent.frequency')}
        </Text>
        <View className="flex-row gap-3 mb-6">
          {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => {
            const isSelected = frequency === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                className={`flex-1 py-3.5 rounded-2xl items-center ${
                  isSelected ? 'bg-primary-50' : 'bg-surface'
                }`}
                style={isSelected
                  ? { borderWidth: 2, borderColor: '#FFD600' }
                  : {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    }
                }
              >
                <Text
                  className={`text-[14px] font-sans-semibold ${
                    isSelected ? 'text-text' : 'text-text-secondary'
                  }`}
                >
                  {frequencyLabel(f)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Day of Week */}
        {frequency === 'weekly' && (
          <View className="mb-6">
            <Text className="text-[15px] font-sans-semibold text-text mb-3">
              {t('parent.dayOfWeek')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2.5">
                {DAYS_OF_WEEK.map((day, index) => {
                  const isSelected = dayOfWeek === index;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setDayOfWeek(index)}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? 'bg-primary-50' : 'bg-surface'
                      }`}
                      style={isSelected
                        ? { borderWidth: 2, borderColor: '#FFD600' }
                        : {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 6,
                            elevation: 1,
                          }
                      }
                    >
                      <Text
                        className={`text-[13px] font-sans-medium ${
                          isSelected ? 'text-text' : 'text-text-secondary'
                        }`}
                      >
                        {t(`days.${day}`).slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Day of Month */}
        {frequency === 'monthly' && (
          <View className="mb-6">
            <Text className="text-[15px] font-sans-semibold text-text mb-3">
              {t('parent.dayOfMonth')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const isSelected = dayOfMonth === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setDayOfMonth(day)}
                    className={`w-10 h-10 rounded-xl items-center justify-center ${
                      isSelected ? 'bg-primary' : 'bg-surface'
                    }`}
                    style={!isSelected ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    } : undefined}
                  >
                    <Text
                      className={`text-[14px] font-sans-medium ${
                        isSelected ? 'text-text' : 'text-text-secondary'
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Country / Timezone */}
        <Text className="text-[15px] font-sans-semibold text-text mb-3">
          {t('parent.country', { defaultValue: 'País / Fuso horário' })}
        </Text>
        <Pressable
          onPress={() => setShowTimezones(!showTimezones)}
          className="flex-row items-center justify-between bg-surface rounded-2xl px-5 py-4 mb-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-xl mr-3">{selectedCountry.flag}</Text>
            <Text className="text-[16px] font-sans-medium text-text">
              {selectedCountry.label}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={showTimezones ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#6b6b5a"
          />
        </Pressable>

        {showTimezones && (
          <View className="bg-surface rounded-2xl mb-6 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {COUNTRIES.map((country, idx) => {
              const isSelected = selectedTimezone === country.timezone;
              return (
                <Pressable
                  key={country.timezone}
                  onPress={() => {
                    haptics.selection();
                    setSelectedTimezone(country.timezone);
                    setShowTimezones(false);
                  }}
                  className={`flex-row items-center px-5 py-3.5 ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <Text className="text-lg mr-3">{country.flag}</Text>
                  <Text className={`text-[15px] flex-1 ${
                    isSelected ? 'font-sans-semibold text-text' : 'font-sans text-text-secondary'
                  }`}>
                    {country.label}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={20} color="#FFD600" />
                  )}
                  {idx < COUNTRIES.length - 1 && !isSelected && (
                    <View className="absolute bottom-0 left-14 right-5 h-px bg-border" />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Deposit Time */}
        <Text className="text-[15px] font-sans-semibold text-text mb-3">
          {t('parent.depositTime', { defaultValue: 'Horário do depósito' })}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
          <View className="flex-row gap-2">
            {HOURS.filter((_, i) => i % 2 === 0).map((hour) => {
              const isSelected = depositTime === hour.value;
              return (
                <Pressable
                  key={hour.value}
                  onPress={() => {
                    haptics.selection();
                    setDepositTime(hour.value);
                  }}
                  className={`px-4 py-2.5 rounded-xl ${
                    isSelected ? 'bg-primary' : 'bg-surface'
                  }`}
                  style={!isSelected ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  } : undefined}
                >
                  <Text
                    className={`text-[14px] font-sans-medium ${
                      isSelected ? 'text-text' : 'text-text-secondary'
                    }`}
                  >
                    {hour.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Create button */}
        <View className="mb-9">
          <Button
            title={t('parent.scheduleDeposit')}
            onPress={handleCreate}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon="calendar-plus"
          />
        </View>

        {/* Active Schedules */}
        <Text className="text-[20px] font-sans-bold text-text mb-4">
          {t('parent.manageSchedules')}
        </Text>

        {childSchedules.length === 0 ? (
          <Card>
            <View className="items-center py-8">
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#e5e5d8" />
              <Text className="text-[15px] font-sans text-text-secondary mt-3">
                {t('parent.noSchedules')}
              </Text>
            </View>
          </Card>
        ) : (
          childSchedules.map((schedule) => (
            <Card key={schedule.id} className="mb-3.5">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-[20px] font-sans-bold text-text">
                    {format(schedule.amount)}
                  </Text>
                  <Text className="text-[14px] font-sans text-text-secondary mt-0.5">
                    {frequencyLabel(schedule.frequency)}
                    {schedule.dayOfWeek !== null &&
                      ` · ${t(`days.${DAYS_OF_WEEK[schedule.dayOfWeek]}`)}`}
                    {schedule.dayOfMonth !== null && ` · dia ${schedule.dayOfMonth}`}
                  </Text>
                  <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                    {schedule.depositTime ?? '00:00'} · {
                      COUNTRIES.find((c) => c.timezone === schedule.timezone)?.label ?? schedule.timezone
                    }
                  </Text>
                </View>
                <Badge
                  text={schedule.status === 'active' ? 'Ativo' : 'Pausado'}
                  variant={schedule.status === 'active' ? 'success' : 'warning'}
                />
              </View>
              <View className="flex-row gap-2.5 mt-3">
                <View className="flex-1">
                  <Button
                    title={
                      schedule.status === 'active'
                        ? t('parent.pauseSchedule')
                        : t('parent.resumeSchedule')
                    }
                    onPress={() => handleTogglePause(schedule)}
                    variant="secondary"
                    size="sm"
                    fullWidth
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title={t('common.delete')}
                    onPress={() => handleDelete(schedule)}
                    variant="danger"
                    size="sm"
                    fullWidth
                  />
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeArea>
  );
}
