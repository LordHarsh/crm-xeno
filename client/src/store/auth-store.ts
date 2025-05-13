// src/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { toast } from 'react-hot-toast';

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (googleToken: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      
      initialize: async () => {
        const token = get().token;
        if (!token) return;
        
        set({ isLoading: true });
        
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`,
            { token }
          );
          
          if (response.data.valid) {
            set({ user: response.data.user, isLoading: false });
          } else {
            set({ user: null, token: null, isLoading: false });
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          set({ user: null, token: null, isLoading: false });
        }
      },
      
      login: async (googleToken: string) => {
        set({ isLoading: true });
        
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
            { token: googleToken }
          );
          
          const { token, user } = response.data;
          set({ token, user, isLoading: false });
          
          toast.success(`Welcome, ${user.name}!`);
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          toast.error('Authentication failed. Please try again.');
          set({ isLoading: false });
          return false;
        }
      },
      
      logout: () => {
        set({ user: null, token: null });
        toast.success('Logged out successfully');
      },
      
      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);