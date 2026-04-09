import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  setUser: (user: any) => void;
  setAuthenticated: (status: boolean) => void;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ user }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));
