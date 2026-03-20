import { Paths, File, Directory } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

function getWishlistDir(): Directory {
  return new Directory(Paths.document, 'wishlist');
}

/**
 * Compress and save wishlist photo locally.
 * - Resize to max 600px width (grid ~170px * 3x retina = 510px)
 * - JPEG at 60% quality (~60-120KB from a typical phone camera)
 * - Saves to persistent local storage for instant display
 */
export async function processAndSaveWishPhoto(sourceUri: string): Promise<string> {
  const processed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 600 } }],
    { compress: 0.6, format: SaveFormat.JPEG },
  );

  const wishDir = getWishlistDir();
  wishDir.create({ idempotent: true });

  const filename = `wish_${Date.now()}.jpg`;
  const source = new File(processed.uri);
  const destination = new File(wishDir, filename);
  source.copy(destination);

  return destination.uri;
}

/**
 * Remove a local wishlist photo when no longer needed.
 */
export function removeLocalWishPhoto(localUri: string): void {
  try {
    const file = new File(localUri);
    file.delete();
  } catch {
    // File may not exist, ignore
  }
}
