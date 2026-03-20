export type WishItemStatus = 'active' | 'conquered' | 'archived';

export interface WishItem {
  id: string;
  childId: string;
  photoUrl: string;
  name: string | null;
  priceCents: number | null;
  desireLevel: number; // 1, 2, or 3
  status: WishItemStatus;
  isGoal: boolean;
  sortOrder: number;
  conqueredAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWishItemPayload {
  photoUrl: string;
  name?: string;
  priceCents?: number;
  desireLevel?: number;
  note?: string;
}

export interface UpdateWishItemPayload {
  name?: string | null;
  priceCents?: number | null;
  desireLevel?: number;
  status?: WishItemStatus;
  note?: string | null;
  sortOrder?: number;
}
