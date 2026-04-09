import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/src/stores/useSettingsStore';

interface ContractRule {
  id: string;
  text: string;
}

interface ContractTextProps {
  bankName: string;
  rules: ContractRule[];
  onRulesChange: (rules: ContractRule[]) => void;
}

interface PresetCategory {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  rules: string[];
}

function getCurrencySymbol(currency: string): string {
  if (currency === 'BRL') return 'R$';
  if (currency === 'USD') return '$';
  return '€';
}

function buildPresetCategories(lang: string, sym: string): PresetCategory[] {
  const isPt = lang.startsWith('pt');

  return [
    {
      key: isPt ? 'Poupança e Metas' : 'Savings & Goals',
      icon: 'piggy-bank-outline',
      color: '#22c55e',
      rules: isPt ? [
        `Guardar pelo menos 20% da mesada toda semana`,
        `Se economizar por 1 mês sem gastar, ganha um bônus de ${sym} 10,00`,
        `Definir uma meta de poupança e alcançá-la ganha uma recompensa especial`,
        `Antes de comprar algo, esperar 3 dias para decidir se realmente quer`,
      ] : [
        `Save at least 20% of allowance every week`,
        `If you save for 1 month without spending, you get a ${sym} 10.00 bonus`,
        `Setting a savings goal and reaching it earns a special reward`,
        `Before buying something, wait 3 days to decide if you really want it`,
      ],
    },
    {
      key: isPt ? 'Tarefas e Recompensas' : 'Chores & Rewards',
      icon: 'star-outline',
      color: '#FFD600',
      rules: isPt ? [
        `Arrumar o quarto toda manhã: ${sym} 2,00 por semana`,
        `Ajudar a preparar o jantar: ${sym} 1,50 por vez`,
        `Cuidar do pet (água, comida, passeio): ${sym} 3,00 por semana`,
        `Ajudar com a louça ou a roupa: ${sym} 1,00 por vez`,
        `Manter a mochila e materiais organizados: ${sym} 2,00 por semana`,
      ] : [
        `Make bed every morning: ${sym} 2.00 per week`,
        `Help prepare dinner: ${sym} 1.50 each time`,
        `Take care of the pet (water, food, walk): ${sym} 3.00 per week`,
        `Help with dishes or laundry: ${sym} 1.00 each time`,
        `Keep backpack and school supplies organized: ${sym} 2.00 per week`,
      ],
    },
    {
      key: isPt ? 'Estudos e Aprendizado' : 'Studies & Learning',
      icon: 'school-outline',
      color: '#3b82f6',
      rules: isPt ? [
        `Ler um livro por mês: ${sym} 5,00 de bônus`,
        `Tirar nota acima da média na prova: ${sym} 5,00 de bônus`,
        `Completar a lição de casa todos os dias da semana sem lembrete`,
        `Aprender algo novo e ensinar para a família: ${sym} 3,00`,
      ] : [
        `Read one book per month: ${sym} 5.00 bonus`,
        `Score above average on a test: ${sym} 5.00 bonus`,
        `Complete homework every day of the week without reminders`,
        `Learn something new and teach the family: ${sym} 3.00`,
      ],
    },
    {
      key: isPt ? 'Responsabilidade Financeira' : 'Financial Responsibility',
      icon: 'shield-check-outline',
      color: '#8b5cf6',
      rules: isPt ? [
        `Conversar com os pais antes de gastar mais de ${sym} 5,00`,
        `Anotar todos os gastos da semana no app`,
        `Não emprestar dinheiro sem combinar com os pais`,
        `Saques do banco devem ser combinados em família`,
        `Se perder dinheiro por descuido, não será reposto`,
      ] : [
        `Talk to parents before spending more than ${sym} 5.00`,
        `Record all weekly expenses in the app`,
        `Don't lend money without discussing with parents`,
        `Bank withdrawals must be agreed upon as a family`,
        `If money is lost due to carelessness, it won't be replaced`,
      ],
    },
    {
      key: isPt ? 'Generosidade' : 'Generosity',
      icon: 'heart-outline',
      color: '#ec4899',
      rules: isPt ? [
        `Separar uma parte da mesada para ajudar alguém ou doar`,
        `Escolher uma causa para apoiar a cada 3 meses`,
        `Presentear um amigo ou familiar com algo feito à mão conta como doação`,
      ] : [
        `Set aside part of the allowance to help someone or donate`,
        `Choose a cause to support every 3 months`,
        `Gifting a friend or family member something handmade counts as a donation`,
      ],
    },
  ];
}

export function ContractText({ bankName, rules, onRulesChange }: ContractTextProps) {
  const { t, i18n } = useTranslation();
  const currency = useSettingsStore((s) => s.currency);
  const [newRuleText, setNewRuleText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const sym = getCurrencySymbol(currency);
  const categories = buildPresetCategories(i18n.language, sym);

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
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.key;
              return (
                <View key={cat.key} className="mb-3">
                  <Pressable
                    onPress={() => setExpandedCategory(isExpanded ? null : cat.key)}
                    className="flex-row items-center py-2.5 px-3 rounded-xl bg-background-light"
                  >
                    <MaterialCommunityIcons name={cat.icon} size={20} color={cat.color} />
                    <Text className="text-[15px] font-sans-semibold text-text ml-2 flex-1">
                      {cat.key}
                    </Text>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#6b6b5a"
                    />
                  </Pressable>
                  {isExpanded && (
                    <View className="mt-1.5 ml-2">
                      {cat.rules.map((preset, index) => {
                        const isAdded = rules.some((r) => r.text === preset);
                        return (
                          <Pressable
                            key={index}
                            onPress={() => !isAdded && addPreset(preset)}
                            className={`flex-row items-center py-2.5 px-3 rounded-lg mb-1.5 ${
                              isAdded ? 'bg-primary/10' : 'bg-surface'
                            }`}
                            disabled={isAdded}
                          >
                            <MaterialCommunityIcons
                              name={isAdded ? 'check-circle' : 'plus-circle-outline'}
                              size={18}
                              color={isAdded ? '#22c55e' : cat.color}
                            />
                            <Text
                              className={`text-[14px] font-sans ml-2 flex-1 ${
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
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
