import { db, queryClient } from '../db/index.js';
import { families } from '../db/schema/families.js';
import { hashPassword } from '../auth/index.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    console.error('SEED_EMAIL and SEED_PASSWORD environment variables are required');
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(families)
    .where(eq(families.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`User ${email} already exists, skipping.`);
  } else {
    const passwordHash = await hashPassword(password);

    const [family] = await db
      .insert(families)
      .values({
        name: 'O Meu Banco',
        email,
        masterPasswordHash: passwordHash,
        currency: 'BRL',
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      })
      .returning();

    console.log(`Created user: ${email} (family ID: ${family.id})`);
  }

  await queryClient.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
