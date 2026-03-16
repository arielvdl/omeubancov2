export interface Avatar {
  id: string;
  name: string;
  emoji: string;
  backgroundColor: string;
}

export const AVATARS: Avatar[] = [
  { id: 'lion', name: 'Leao', emoji: '\u{1F981}', backgroundColor: '#FEF3C7' },
  { id: 'bear', name: 'Urso', emoji: '\u{1F43B}', backgroundColor: '#FDE68A' },
  { id: 'rabbit', name: 'Coelho', emoji: '\u{1F430}', backgroundColor: '#DBEAFE' },
  { id: 'cat', name: 'Gato', emoji: '\u{1F431}', backgroundColor: '#FCE7F3' },
  { id: 'dog', name: 'Cachorro', emoji: '\u{1F436}', backgroundColor: '#D1FAE5' },
  { id: 'fox', name: 'Raposa', emoji: '\u{1F98A}', backgroundColor: '#FFEDD5' },
  { id: 'panda', name: 'Panda', emoji: '\u{1F43C}', backgroundColor: '#F3F4F6' },
  { id: 'unicorn', name: 'Unicornio', emoji: '\u{1F984}', backgroundColor: '#EDE9FE' },
  { id: 'dolphin', name: 'Golfinho', emoji: '\u{1F42C}', backgroundColor: '#CFFAFE' },
  { id: 'butterfly', name: 'Borboleta', emoji: '\u{1F98B}', backgroundColor: '#E0E7FF' },
  { id: 'star', name: 'Estrela', emoji: '\u2B50', backgroundColor: '#FEF9C3' },
  { id: 'rocket', name: 'Foguete', emoji: '\u{1F680}', backgroundColor: '#FEE2E2' },
];

export const DEFAULT_AVATAR_ID = 'lion';

export function getAvatarById(id: string): Avatar | undefined {
  return AVATARS.find((avatar) => avatar.id === id);
}

export function getDefaultAvatar(): Avatar {
  return AVATARS[0];
}
