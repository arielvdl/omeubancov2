import React from 'react';
import { View } from 'react-native';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center gap-3 py-6">
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        let dotClass = 'h-3 rounded-full';

        if (isActive) {
          dotClass += ' bg-primary w-10';
        } else if (isCompleted) {
          dotClass += ' bg-primary w-3';
        } else {
          dotClass += ' bg-transparent border-2 border-gray-300 w-3';
        }

        return <View key={step} className={dotClass} />;
      })}
    </View>
  );
}
