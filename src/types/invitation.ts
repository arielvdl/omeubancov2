export interface Guardian {
  id: string;
  familyId: string;
  name: string;
  roleLabel: string;
  email?: string;
  avatarUrl?: string;
  googlePhoto?: string;
  createdAt: string;
}

export interface FamilyInvitation {
  id: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  deepLink: string;
}

export interface InvitationInfo {
  familyName: string | null;
  status: string;
  expiresAt: string;
}
