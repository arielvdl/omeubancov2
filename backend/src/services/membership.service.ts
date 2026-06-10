import { familyRepo } from '../repositories/family.repo.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import type { TokenPayload } from '../auth/index.js';

// Identidade da pessoa por trás de um token: dona de família (linha em
// families) ou guardian (linha em guardians). Multi-família: a mesma
// identidade (email/google_email) pode aparecer em várias famílias.
export interface Identity {
  email: string | null;
  googleEmail: string | null;
  name: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  googleName: string | null;
  googlePhoto: string | null;
}

export interface FamilyMembership {
  familyId: string;
  familyName: string;
  currency: string;
  role: 'owner' | 'guardian';
  guardianId?: string;
  accessLevel?: string;
  roleLabel?: string;
}

export const membershipService = {
  async getIdentityForUser(
    user: Pick<TokenPayload, 'familyId' | 'guardianId'>
  ): Promise<Identity | null> {
    if (user.guardianId) {
      const guardian = await guardianRepo.findById(user.guardianId);
      if (!guardian || guardian.status !== 'active') return null;
      return {
        email: guardian.email,
        googleEmail: guardian.googleEmail,
        name: guardian.name,
        passwordHash: guardian.passwordHash,
        avatarUrl: guardian.avatarUrl,
        googleName: guardian.googleName,
        googlePhoto: guardian.googlePhoto,
      };
    }

    const family = await familyRepo.findById(user.familyId);
    if (!family) return null;
    return {
      email: family.email,
      googleEmail: family.googleEmail,
      // families.name é o nome do banco, não da pessoa — googleName é o
      // melhor proxy disponível para donos.
      name: family.googleName ?? family.name,
      passwordHash: family.masterPasswordHash,
      avatarUrl: null,
      googleName: family.googleName,
      googlePhoto: family.googlePhoto,
    };
  },

  async listFamilies(identity: {
    email?: string | null;
    googleEmail?: string | null;
  }): Promise<FamilyMembership[]> {
    const memberships = new Map<string, FamilyMembership>();

    const ownerFamilies = [
      identity.email ? await familyRepo.findByEmail(identity.email) : undefined,
      identity.googleEmail
        ? await familyRepo.findByGoogleEmail(identity.googleEmail)
        : undefined,
    ];
    for (const family of ownerFamilies) {
      if (family) {
        memberships.set(family.id, {
          familyId: family.id,
          familyName: family.name,
          currency: family.currency,
          role: 'owner',
        });
      }
    }

    const guardianRows = [
      ...(identity.email ? await guardianRepo.findAllActiveByEmail(identity.email) : []),
      ...(identity.googleEmail
        ? await guardianRepo.findAllActiveByGoogleEmail(identity.googleEmail)
        : []),
    ];
    for (const guardian of guardianRows) {
      if (memberships.has(guardian.familyId)) continue; // dona prevalece
      const family = await familyRepo.findById(guardian.familyId);
      if (!family) continue;
      memberships.set(family.id, {
        familyId: family.id,
        familyName: family.name,
        currency: family.currency,
        role: 'guardian',
        guardianId: guardian.id,
        accessLevel: guardian.accessLevel,
        roleLabel: guardian.roleLabel,
      });
    }

    return [...memberships.values()];
  },
};
