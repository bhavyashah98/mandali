import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  logout: async () => {
      // Actively purge from permanent hardware storage so RootNavigator doesn't resume session on cold start
      await AsyncStorage.removeItem('mandali_token');
      await AsyncStorage.removeItem('mandali_user');
      set({ isAuthenticated: false, user: null });
  },
}));
