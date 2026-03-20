import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Mascot } from '@/src/constants/mascots';

interface MascotVideoProps {
  mascot: Mascot;
  size?: number;
}

export function MascotVideo({ mascot, size = 180 }: MascotVideoProps) {
  const appState = useRef(AppState.currentState);

  const player = useVideoPlayer(mascot.video, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        player.play();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="contain"
      allowsExternalPlayback={false}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
    />
  );
}
