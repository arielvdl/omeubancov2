import React, { useRef, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/src/components/ui/Button';

interface SignaturePadProps {
  onSignatureComplete: (data: string) => void;
  onClear: () => void;
}

interface PathData {
  d: string;
}

export function SignaturePad({ onSignatureComplete, onClear }: SignaturePadProps) {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const hasSignature = paths.length > 0 || currentPath.length > 0;

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    onClear();
  }, [onClear]);

  const handleSign = useCallback(() => {
    const allPaths = currentPath
      ? [...paths, { d: currentPath }]
      : paths;
    const svgData = allPaths.map((p) => p.d).join(' ');
    const base64 = btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">${allPaths.map((p) => `<path d="${p.d}" stroke="#1a1a0e" stroke-width="2" fill="none"/>`).join('')}</svg>`,
    );
    onSignatureComplete(base64);
  }, [paths, currentPath, onSignatureComplete]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => {
      const x = Math.round(event.x);
      const y = Math.round(event.y);
      setCurrentPath(`M${x},${y}`);
    })
    .onUpdate((event) => {
      const x = Math.round(event.x);
      const y = Math.round(event.y);
      setCurrentPath((prev) => `${prev} L${x},${y}`);
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths((prev) => [...prev, { d: currentPath }]);
        setCurrentPath('');
      }
    })
    .minDistance(1);

  return (
    <View className="flex-1">
      <Text className="text-sm font-sans-medium text-text-secondary text-center mb-2">
        {t('onboarding.signature.subtitle', { defaultValue: 'Use o dedo para assinar abaixo.' })}
      </Text>

      <View className="bg-surface border-2 border-dashed border-border rounded-xl overflow-hidden mb-4"
        style={{ height: 200 }}
      >
        <GestureDetector gesture={panGesture}>
          <View className="flex-1">
            <Svg width="100%" height="100%" viewBox="0 0 300 200">
              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={path.d}
                  stroke="#1a1a0e"
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke="#1a1a0e"
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {!hasSignature && (
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-base font-sans text-gray-300">
                  {t('onboarding.signature.title', { defaultValue: 'Desenhe sua assinatura' })}
                </Text>
              </View>
            )}
          </View>
        </GestureDetector>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            title={t('onboarding.signature.clear')}
            onPress={handleClear}
            variant="secondary"
            fullWidth
          />
        </View>
        <View className="flex-1">
          <Button
            title={t('onboarding.signature.confirmSignature')}
            onPress={handleSign}
            variant="primary"
            disabled={!hasSignature}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}
