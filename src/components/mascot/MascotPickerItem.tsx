import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Mascot } from '@/src/constants/mascots';

interface MascotPickerItemProps {
  mascot: Mascot;
  isActive: boolean;
  onSelect: () => void;
}

export function MascotPickerItem({ mascot, isActive, onSelect }: MascotPickerItemProps) {
  const player = useVideoPlayer(mascot.video, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  return (
    <Pressable
      onPress={onSelect}
      style={{
        width: 100,
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 10,
        borderRadius: 20,
        backgroundColor: isActive ? '#FEF9C3' : '#f5f5f0',
        borderWidth: isActive ? 2.5 : 0,
        borderColor: '#FFD600',
      }}
    >
      <View style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden' }}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          allowsExternalPlayback={false}
          style={{ width: 80, height: 80, backgroundColor: 'transparent' }}
        />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          marginTop: 6,
          color: isActive ? '#1a1a14' : '#6b6b5a',
        }}
      >
        {mascot.name}
      </Text>
      {isActive && (
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color="#FFD600"
          style={{ position: 'absolute', top: 4, right: 4 }}
        />
      )}
    </Pressable>
  );
}
