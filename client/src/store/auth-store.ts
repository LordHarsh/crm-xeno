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

// Custom cookie storage for SSR compatibility  
const cookieStorage = {
  getItem: (name: string): string | null => {
    // Handle both client and server side
    if (typeof window === 'undefined') {
      return null; // Server-side, will be handled by middleware directly
    }
    
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1];
      
    if (!value) return null;
    return decodeURIComponent(value);
  },
  
  setItem: (name: string, value: string) => {
    // Only set cookies client-side
    if (typeof window !== 'undefined') {
      // Set cookie that's accessible from both JS and http-only middleware
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Strict`;
    }
  },
  
  removeItem: (name: string) => {
    // Only remove cookies client-side
    if (typeof window !== 'undefined') {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  },
});

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
        isAuthenticated: () => {
        // Check if we have a user object
        const hasUser = !!get().user;
        
        // For client-side, we can just check the user object
        if (typeof window !== 'undefined') {
          return hasUser;
        }
        
        // For server-side or middleware, we'd need to check the token from cookies directly
        // But this function should primarily be used client-side
        return hasUser;
      },
    }),{
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
      storage: {
        getItem: (name) => {
          // Handle both client and server side
          if (typeof window === 'undefined') {
            return null;
          }
          
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
            
          if (!value) return null;
          return JSON.parse(decodeURIComponent(value));
        },
        
        setItem: (name, value) => {
          // Only set cookies client-side
          if (typeof window !== 'undefined') {
            // Set cookie that's accessible from both JS and http-only middleware
            document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=2592000; SameSite=Strict`;
          }
        },
        
        removeItem: (name) => {
          // Only remove cookies client-side
          if (typeof window !== 'undefined') {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        }
      }
    }
  )
);