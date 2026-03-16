import type { Context, Next } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    locale: string;
  }
}

export async function localeMiddleware(c: Context, next: Next): Promise<void> {
  const acceptLanguage = c.req.header('Accept-Language');
  let locale = 'pt-BR';

  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, qStr] = lang.trim().split(';q=');
        const q = qStr ? parseFloat(qStr) : 1.0;
        return { code: code.trim(), q };
      })
      .sort((a, b) => b.q - a.q);

    const supported = ['pt-BR', 'pt', 'en-US', 'en', 'es'];
    for (const pref of preferred) {
      const match = supported.find(
        (s) => s.toLowerCase() === pref.code.toLowerCase() || s.startsWith(pref.code.split('-')[0])
      );
      if (match) {
        locale = match;
        break;
      }
    }
  }

  c.set('locale', locale);
  await next();
}
