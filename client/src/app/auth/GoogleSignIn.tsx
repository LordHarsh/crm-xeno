// components/auth/GoogleSignIn.jsx
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/auth-store';

export default function GoogleSignIn() {
  const login = useAuthStore(state => state.login);
  const router = useRouter();
  const googleButtonRef = useRef(null);
  
  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      // Initialize Google Sign-In button
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      
      // Render the button
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', width: 300 }
      );
    };
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  const handleCredentialResponse = async (response) => {
    // Handle Google Sign-In response
    if (response.credential) {
      // Pass ID token to our backend
      const success = await login(response.credential);
      if (success) {
        router.push('/dashboard');
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">Sign in with Google</h2>
      <div ref={googleButtonRef} className="g_id_signin"></div>
    </div>
  );
}