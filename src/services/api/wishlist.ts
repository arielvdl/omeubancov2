import { apiClient } from './client';
import type { CreateWishItemPayload, UpdateWishItemPayload } from '@/src/types/wishlist';

export const wishlistApi = {
  getByChild: (childId: string) =>
    apiClient.get(`/children/${childId}/wishlist`),

  getGoal: (childId: string) =>
    apiClient.get(`/children/${childId}/wishlist/goal`),

  create: (childId: string, data: CreateWishItemPayload) =>
    apiClient.post(`/children/${childId}/wishlist`, data),

  update: (childId: string, itemId: string, data: UpdateWishItemPayload) =>
    apiClient.put(`/children/${childId}/wishlist/${itemId}`, data),

  conquer: (childId: string, itemId: string) =>
    apiClient.post(`/children/${childId}/wishlist/${itemId}/conquer`),

  archive: (childId: string, itemId: string) =>
    apiClient.post(`/children/${childId}/wishlist/${itemId}/archive`),

  setGoal: (childId: string, itemId: string) =>
    apiClient.post(`/children/${childId}/wishlist/${itemId}/goal`),

  remove: (childId: string, itemId: string) =>
    apiClient.delete(`/children/${childId}/wishlist/${itemId}`),

  reorder: (childId: string, items: { id: string; sortOrder: number }[]) =>
    apiClient.post(`/children/${childId}/wishlist/reorder`, { items }),
};

export const wishlistUploadApi = {
  uploadPhoto: (fileUri: string) => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() ?? 'wish.jpg';
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
    return apiClient.post<{ url: string }>('/upload/wishlist', formData, {
      timeout: 30000,
    });
  },
};
