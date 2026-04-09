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
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const player = useVideoPlayer(mascot.video, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  // Keep video alive: monitor status and force replay if it stops
  useEffect(() => {
    const statusSub = player.addListener('statusChange', (ev: any) => {
      if (ev.status === 'idle' || ev.status === 'error') {
        // Video stopped unexpectedly — replay
        try {
          player.play();
        } catch {}
      }
    });

    // Periodic check every 2s as ultimate fallback
    retryRef.current = setInterval(() => {
      try {
        if (!player.playing) {
          player.play();
        }
      } catch {}
    }, 2000);

    return () => {
      statusSub.remove();
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [player]);

  // Resume on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        try { player.play(); } catch {}
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
