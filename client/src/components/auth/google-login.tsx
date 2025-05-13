// src/components/auth/google-login.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Define types for Google authentication
interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  // Add other properties if needed
}

// Define Google Sign-In API types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            cancel_on_tap_outside: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type: string;
              theme: string;
              size: string;
              shape: string;
              text: string;
              logo_alignment: string;
              width: number;
            }
          ) => void;
        };
      };
    };
  }
}

export default function GoogleLogin() {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { login } = useAuthStore();
  const router = useRouter();
  
  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    if (response.credential) {
      const success = await login(response.credential);
      if (success) {
        router.push('/dashboard');
      }
    }
  }, [login, router]);
  
  useEffect(() => {
    // Load Google's script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (!window.google || !googleButtonRef.current) return;
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Google Client ID is not defined in environment variables');
        return;
      }
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: true,
      });
      
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { 
          type: 'standard', 
          theme: 'outline', 
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'center',
          width: 280
        }
      );
    };
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleCredentialResponse]);
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={googleButtonRef} className="flex justify-center"></div>
    </div>
  );
}