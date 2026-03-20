import { useAudioPlayer } from 'expo-audio';

const coinSound = require('@/assets/sounds/coin.mp3');

export function useCoinSound() {
  const player = useAudioPlayer(coinSound);

  return {
    play: () => {
      player.seekTo(0);
      player.play();
    },
  };
}
