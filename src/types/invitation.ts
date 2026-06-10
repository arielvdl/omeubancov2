export interface Guardian {
  id: string;
  familyId: string;
  name: string;
  roleLabel: string;
  accessLevel: 'admin' | 'member';
  email?: string;
  avatarUrl?: string;
  googlePhoto?: string;
  createdAt: string;
}

export interface FamilyInvitation {
  id: string;
  inviteCode: string;
  accessLevel: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  deepLink: string;
}

export interface InvitationInfo {
  familyId?: string;
  familyName: string | null;
  accessLevel?: 'admin' | 'member';
  status: string;
  expiresAt: string;
}
