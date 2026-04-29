import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut } from '@react-native-firebase/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  setUser: (user: any) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (status: boolean) => void;
  setAuth: (user: any, token: string) => void;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  login: () => set({ isAuthenticated: true }),
  logout: async () => {
      try {
          await signOut(getAuth());
      } catch (err) {
          console.error('[Auth Store] Sign out error:', err);
      }
      // Actively purge from permanent hardware storage so RootNavigator doesn't resume session on cold start
      await AsyncStorage.removeItem('mandali_token');
      await AsyncStorage.removeItem('mandali_user');
      set({ isAuthenticated: false, user: null, token: null });
  },
}));
