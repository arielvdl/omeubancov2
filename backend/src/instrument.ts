import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.3,
  environment: process.env.NODE_ENV || 'development',
  // Desativado por segurança: campanha de abuso contra apps com Sentry
  // (erros forçados explorando a ingestão de eventos)
  enabled: false,
});

export { Sentry };
