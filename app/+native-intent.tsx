const INVITE_CODE_PATTERN = /^[a-z0-9]{6,12}$/i;

function normalizeInviteCode(value: string | undefined): string | null {
  if (!value) return null;
  const code = decodeURIComponent(value).trim();
  return INVITE_CODE_PATTERN.test(code) ? code.toUpperCase() : null;
}

function invitePath(code: string): string {
  return `/${code}`;
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'omeubanco://app');
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'invite') {
      const code = normalizeInviteCode(segments[0]);
      if (code) return invitePath(code);
    }

    if (segments[0]?.toLowerCase() === 'invite') {
      const code = normalizeInviteCode(segments[1]);
      if (code) return invitePath(code);
    }

    return path;
  } catch {
    return path;
  }
}
