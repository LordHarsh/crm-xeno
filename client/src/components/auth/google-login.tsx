// src/components/auth/google-login.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function GoogleLogin() {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { login } = useAuthStore();
  const router = useRouter();
  
  useEffect(() => {
    // Load Google's script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (!window.google || !googleButtonRef.current) return;
      
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
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
      document.body.removeChild(script);
    };
  }, []);
  
  const handleCredentialResponse = async (response: any) => {
    if (response.credential) {
      const success = await login(response.credential);
      if (success) {
        router.push('/dashboard');
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={googleButtonRef} className="flex justify-center"></div>
    </div>
  );
}