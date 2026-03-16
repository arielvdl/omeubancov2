import { create } from 'zustand';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface ParentSessionState {
  isAuthenticated: boolean;
  authenticatedAt: number | null;

  /** Mark session as authenticated (resets timeout). */
  markAuthenticated: () => void;

  /** Clear the session (logout from parent area). */
  clearSession: () => void;

  /**
   * Returns true if parent is authenticated and session has not expired.
   * Automatically clears expired sessions.
   */
  isSessionValid: () => boolean;
}

export const useParentSessionStore = create<ParentSessionState>((set, get) => ({
  isAuthenticated: false,
  authenticatedAt: null,

  markAuthenticated: () => {
    set({ isAuthenticated: true, authenticatedAt: Date.now() });
  },

  clearSession: () => {
    set({ isAuthenticated: false, authenticatedAt: null });
  },

  isSessionValid: () => {
    const { isAuthenticated, authenticatedAt } = get();
    if (!isAuthenticated || !authenticatedAt) return false;

    const elapsed = Date.now() - authenticatedAt;
    if (elapsed > SESSION_TIMEOUT_MS) {
      set({ isAuthenticated: false, authenticatedAt: null });
      return false;
    }

    return true;
  },
}));
