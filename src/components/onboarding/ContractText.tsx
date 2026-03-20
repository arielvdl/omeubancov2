import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ContractRule {
  id: string;
  text: string;
}

interface ContractTextProps {
  bankName: string;
  rules: ContractRule[];
  onRulesChange: (rules: ContractRule[]) => void;
}

const PRESET_RULES_PT = [
  'Se arrumar o quarto toda semana, ganha R$ 5,00',
  'Se tirar nota boa na prova, ganha R$ 10,00',
  'Se gastar sem pedir, perde R$ 3,00',
  'Se ajudar nas tarefas de casa, ganha R$ 2,00',
  'Saques precisam ser conversados com os pais',
  'Se economizar por 1 mês, ganha um bônus de R$ 15,00',
  'Não emprestar dinheiro do banco sem permissão',
  'Se mentir sobre o uso do dinheiro, perde R$ 5,00',
];

const PRESET_RULES_EN = [
  'If you clean your room every week, you earn $5.00',
  'If you get a good grade, you earn $10.00',
  'If you spend without asking, you lose $3.00',
  'If you help with house chores, you earn $2.00',
  'Withdrawals must be discussed with parents',
  'If you save for 1 month, you get a $15.00 bonus',
  "Don't lend bank money without permission",
  'If you lie about money use, you lose $5.00',
];

export function ContractText({ bankName, rules, onRulesChange }: ContractTextProps) {
  const { t, i18n } = useTranslation();
  const [newRuleText, setNewRuleText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const presets = i18n.language.startsWith('pt') ? PRESET_RULES_PT : PRESET_RULES_EN;

  const addRule = (text: string) => {
    if (!text.trim()) return;
    const newRule: ContractRule = {
      id: Date.now().toString(),
      text: text.trim(),
    };
    onRulesChange([...rules, newRule]);
    setNewRuleText('');
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter((r) => r.id !== id));
  };

  const startEdit = (rule: ContractRule) => {
    setEditingId(rule.id);
    setEditText(rule.text);
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    onRulesChange(rules.map((r) => (r.id === editingId ? { ...r, text: editText.trim() } : r)));
    setEditingId(null);
    setEditText('');
  };

  const addPreset = (preset: string) => {
    const alreadyExists = rules.some((r) => r.text === preset);
    if (!alreadyExists) {
      addRule(preset);
    }
  };

  return (
    <View>
      {/* Contract title */}
      <View className="bg-surface rounded-2xl border border-border p-4 mb-5">
        <Text className="text-xl font-sans-bold text-text text-center mb-1">
          {t('onboarding.contract.contractTitle', { bankName })}
        </Text>
        <Text className="text-sm font-sans text-text-secondary text-center">
          {t('onboarding.contract.contractDescription')}
        </Text>
      </View>

      {/* Current rules */}
      {rules.length > 0 && (
        <View className="bg-surface rounded-2xl border border-border p-4 mb-5">
          <Text className="text-base font-sans-semibold text-text mb-3">
            {t('onboarding.contract.rulesTitle')} ({rules.length})
          </Text>
          {rules.map((rule, index) => (
            <View key={rule.id} className="mb-3">
              {editingId === rule.id ? (
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-background-light rounded-lg px-3 py-2 text-base font-sans text-text border border-primary"
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={saveEdit}
                    autoFocus
                  />
                  <Pressable onPress={saveEdit} className="ml-2 p-2">
                    <MaterialCommunityIcons name="check" size={20} color="#22c55e" />
                  </Pressable>
                  <Pressable onPress={() => setEditingId(null)} className="p-2">
                    <MaterialCommunityIcons name="close" size={20} color="#6b6b5a" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-start">
                  <Text className="text-base font-sans-bold text-primary mr-2 mt-0.5">
                    {index + 1}.
                  </Text>
                  <Text className="text-base font-sans text-text flex-1">{rule.text}</Text>
                  <Pressable onPress={() => startEdit(rule)} className="p-1 ml-1">
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#6b6b5a" />
                  </Pressable>
                  <Pressable onPress={() => removeRule(rule.id)} className="p-1">
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Add custom rule */}
      <View className="bg-surface rounded-2xl border border-border p-4 mb-5">
        <Text className="text-base font-sans-semibold text-text mb-2">
          {t('onboarding.contract.addCustomRule')}
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 bg-background-light rounded-lg px-3 py-2.5 text-base font-sans text-text border border-border"
            placeholder={t('onboarding.contract.customRulePlaceholder')}
            placeholderTextColor="#6b6b5a"
            value={newRuleText}
            onChangeText={setNewRuleText}
            onSubmitEditing={() => addRule(newRuleText)}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => addRule(newRuleText)}
            className="ml-2 bg-primary rounded-lg p-2.5"
            disabled={!newRuleText.trim()}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#1a1a0e" />
          </Pressable>
        </View>
      </View>

      {/* Preset examples */}
      <View className="bg-surface rounded-2xl border border-border p-4">
        <Pressable
          onPress={() => setShowPresets(!showPresets)}
          className="flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#FFD600" />
            <Text className="text-base font-sans-semibold text-text ml-2">
              {t('onboarding.contract.presetTitle')}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={showPresets ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b6b5a"
          />
        </Pressable>

        {showPresets && (
          <View className="mt-3">
            <Text className="text-sm font-sans text-text-secondary mb-3">
              {t('onboarding.contract.presetDescription')}
            </Text>
            {presets.map((preset, index) => {
              const isAdded = rules.some((r) => r.text === preset);
              return (
                <Pressable
                  key={index}
                  onPress={() => !isAdded && addPreset(preset)}
                  className={`flex-row items-center py-2.5 px-3 rounded-lg mb-2 ${
                    isAdded ? 'bg-primary/10' : 'bg-background-light'
                  }`}
                  disabled={isAdded}
                >
                  <MaterialCommunityIcons
                    name={isAdded ? 'check-circle' : 'plus-circle-outline'}
                    size={18}
                    color={isAdded ? '#22c55e' : '#FFD600'}
                  />
                  <Text
                    className={`text-base font-sans ml-2 flex-1 ${
                      isAdded ? 'text-text-secondary' : 'text-text'
                    }`}
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
