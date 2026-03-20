import { ImageSourcePropType } from 'react-native';

export interface Mascot {
  id: string;
  name: string;
  emoji: string;
  video: number; // require() returns number
}

export const MASCOTS: Mascot[] = [
  { id: 'dino', name: 'Dino', emoji: '\u{1F995}', video: require('@/assets/characters/dino_loop.mp4') },
  { id: 'spitz', name: 'PomPom', emoji: '\u{1F436}', video: require('@/assets/characters/spitz_loop.mp4') },
  { id: 'unicorn', name: 'Unicórnio', emoji: '\u{1F984}', video: require('@/assets/characters/unicorn_loop.mp4') },
  { id: 'lion', name: 'Leão', emoji: '\u{1F981}', video: require('@/assets/characters/lion_loop.mp4') },
  { id: 'cat', name: 'Gatinho', emoji: '\u{1F431}', video: require('@/assets/characters/cat_loop.mp4') },
  { id: 'fox', name: 'Raposa', emoji: '\u{1F98A}', video: require('@/assets/characters/fox_loop.mp4') },
  { id: 'cow', name: 'Vaquinha', emoji: '\u{1F42E}', video: require('@/assets/characters/cow_loop.mp4') },
  { id: 'giraffe', name: 'Girafa', emoji: '\u{1F992}', video: require('@/assets/characters/giraffe_loop.mp4') },
];

export const DEFAULT_MASCOT_ID = 'dino';

export function getMascotById(id: string | null | undefined): Mascot {
  return MASCOTS.find((m) => m.id === id) ?? MASCOTS[0];
}
