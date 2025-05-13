// src/app/auth/signin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import GoogleLogin from '@/components/auth/google-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  const { isAuthenticated, initialize, isLoading } = useAuthStore();
  const router = useRouter();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  useEffect(() => {
    if (!isLoading && isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex items-center justify-center bg-muted/20">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mini CRM Platform</CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleLogin />
        </CardContent>
      </Card>
    </div>
  );
}