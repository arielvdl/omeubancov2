import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/index.js';
import * as families from './schema/families.js';
import * as children from './schema/children.js';
import * as transactions from './schema/transactions.js';
import * as scheduledDeposits from './schema/scheduled-deposits.js';
import * as contracts from './schema/contracts.js';
import * as devices from './schema/devices.js';
import * as auditLog from './schema/audit-log.js';
import * as guardians from './schema/guardians.js';
import * as familyInvitations from './schema/family-invitations.js';
import * as passkeyCredentials from './schema/passkey-credentials.js';
import * as subscriptions from './schema/subscriptions.js';

const isProduction = env.NODE_ENV === 'production';

const poolConfig = {
  max: isProduction ? 10 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
};

function createPostgresClient() {
  const url = env.DATABASE_URL;

  // Cloud SQL Unix socket: postgresql://user:pass@/db?host=/cloudsql/...
  const socketMatch = url.match(/[?&]host=([^&]+)/);
  if (socketMatch) {
    // Parse credentials and database from URL
    const credMatch = url.match(/\/\/([^:]+):([^@]+)@\/([^?]+)/);
    if (credMatch) {
      return postgres({
        host: socketMatch[1],
        username: credMatch[1],
        password: credMatch[2],
        database: credMatch[3],
        ...poolConfig,
      });
    }
  }

  // Standard TCP connection (local dev)
  return postgres(url, poolConfig);
}

export const queryClient = createPostgresClient();

export const db = drizzle(queryClient, {
  schema: {
    ...families,
    ...children,
    ...transactions,
    ...scheduledDeposits,
    ...contracts,
    ...devices,
    ...auditLog,
    ...guardians,
    ...familyInvitations,
    ...passkeyCredentials,
    ...subscriptions,
  },
});

export type Database = typeof db;
