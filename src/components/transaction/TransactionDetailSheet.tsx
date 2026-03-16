import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Transaction } from '@/src/types/transaction';
import { TransactionIcon } from '@/src/components/transaction/TransactionIcon';
import { useCurrency } from '@/src/hooks/useCurrency';
import { formatDate, formatTime } from '@/src/i18n/formatters';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
}

const CREATED_BY_KEYS: Record<string, string> = {
  parent: 'history.createdByParent',
  child: 'history.createdByChild',
  system: 'history.createdBySystem',
};

export const TransactionDetailSheet = forwardRef<BottomSheet, TransactionDetailSheetProps>(
  ({ transaction }, ref) => {
    const { t } = useTranslation();
    const { format, locale } = useCurrency();

    const snapPoints = useMemo(() => ['50%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

    if (!transaction) return null;

    const isWithdrawal = transaction.type === 'withdrawal';
    const amountPrefix = isWithdrawal ? '-' : '+';
    const amountColor = isWithdrawal ? 'text-danger' : 'text-success';

    const rows = [
      {
        icon: 'swap-vertical' as const,
        label: t('history.detailType'),
        value: t(`history.${transaction.type}`),
      },
      {
        icon: 'tag-outline' as const,
        label: t('history.detailCategory'),
        value: t(`categories.${transaction.category}`),
      },
      {
        icon: 'calendar-outline' as const,
        label: t('history.detailDate'),
        value: formatDate(transaction.createdAt, locale),
      },
      {
        icon: 'clock-outline' as const,
        label: t('history.detailTime'),
        value: formatTime(transaction.createdAt, locale),
      },
      {
        icon: 'wallet-outline' as const,
        label: t('history.detailBalanceAfter'),
        value: format(transaction.balanceAfter),
      },
      {
        icon: 'account-outline' as const,
        label: t('history.detailCreatedBy'),
        value: t(CREATED_BY_KEYS[transaction.createdBy] ?? 'history.createdBySystem'),
      },
    ];

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#faf9f0' }}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
          {/* Header */}
          <View className="items-center mb-6">
            <TransactionIcon category={transaction.category} type={transaction.type} size={48} />
            <Text className="text-[18px] font-sans-bold text-text mt-3 text-center">
              {transaction.description || t(`categories.${transaction.category}`)}
            </Text>
            <Text className={`text-[28px] font-sans-bold ${amountColor} mt-1`}>
              {amountPrefix}{format(transaction.amount)}
            </Text>
          </View>

          {/* Detail Rows */}
          <View className="bg-surface rounded-2xl px-4 py-1">
            {rows.map((row, i) => (
              <View
                key={row.label}
                className={`flex-row items-center justify-between py-3.5 ${
                  i < rows.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialCommunityIcons
                    name={row.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={18}
                    color="#6b7280"
                  />
                  <Text className="text-[14px] font-sans text-text-secondary">{row.label}</Text>
                </View>
                <Text className="text-[14px] font-sans-semibold text-text">{row.value}</Text>
              </View>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);
