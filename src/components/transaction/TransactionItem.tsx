import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '@/src/types/transaction';
import { TransactionIcon } from '@/src/components/transaction/TransactionIcon';
import { useCurrency } from '@/src/hooks/useCurrency';
import { formatRelativeDate } from '@/src/i18n/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showIcon?: boolean;
}

export function TransactionItem({ transaction, onPress, showIcon = true }: TransactionItemProps) {
  const { t } = useTranslation();
  const { format, locale } = useCurrency();

  const isWithdrawal = transaction.type === 'withdrawal';
  const amountPrefix = isWithdrawal ? '-' : '+';
  const amountColor = isWithdrawal ? 'text-danger' : 'text-success';
  const categoryLabel = t(`categories.${transaction.category}`);

  return (
    <Pressable
      onPress={() => onPress?.(transaction)}
      className="flex-row items-center py-4 px-1 active:opacity-70"
    >
      {showIcon && (
        <TransactionIcon category={transaction.category} type={transaction.type} />
      )}
      <View className={`flex-1 ${showIcon ? 'ml-4' : ''}`}>
        <Text className="text-[17px] font-sans-semibold text-text" numberOfLines={2}>
          {transaction.description || categoryLabel}
        </Text>
        <Text className="text-[14px] font-sans text-text-secondary mt-1" numberOfLines={1}>
          {categoryLabel} · {formatRelativeDate(transaction.createdAt, locale)}
        </Text>
      </View>
      <Text className={`text-[17px] font-sans-bold ${amountColor} ml-3`}>
        {amountPrefix}{format(transaction.amount)}
      </Text>
    </Pressable>
  );
}
