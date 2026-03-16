import { Paths, File, Directory } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

function getAvatarsDir(): Directory {
  return new Directory(Paths.document, 'avatars');
}

export async function processAndSaveAvatar(sourceUri: string): Promise<string> {
  // Compress and resize
  const processed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 400 } }],
    { compress: 0.7, format: SaveFormat.JPEG },
  );

  // Ensure avatars directory exists (idempotent to avoid race conditions)
  const avatarsDir = getAvatarsDir();
  avatarsDir.create({ idempotent: true });

  // Copy to permanent location
  const filename = `avatar_${Date.now()}.jpg`;
  const source = new File(processed.uri);
  const destination = new File(avatarsDir, filename);
  source.copy(destination);

  return destination.uri;
}

export function isPhotoUri(value?: string | null): boolean {
  if (!value) return false;
  return (
    value.startsWith('file://') ||
    value.startsWith('content://') ||
    value.startsWith('ph://') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image')
  );
}
