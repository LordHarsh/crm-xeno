// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get auth cookie
    const authCookie = request.cookies.get('auth-storage');
    const { pathname } = request.nextUrl;
    console.log('Middleware running on path:', pathname);
    console.log('Auth cookie exists:', !!authCookie);

    if (pathname === '/') {
        const url = new URL('/auth/signin', request.url);
        return NextResponse.redirect(url);
    }

    // Get token from cookie if available
    let isAuthenticated = false;

    if (authCookie?.value) {
        try {
            // Parse the JSON stored in the cookie
            const parsedValue = JSON.parse(decodeURIComponent(authCookie.value));
            console.log('Parsed cookie state:', parsedValue);

            // Check if token exists in the parsed value      // Try different possible paths to find the token
            // It could be directly at parsedValue.token or nested in state based on how Zustand persist works
            isAuthenticated = !!(parsedValue?.state?.token || parsedValue?.token);
            console.log('Is authenticated from cookie:', isAuthenticated);
        } catch (error) {
            console.error('Error parsing auth cookie:', error);
        }
    }
    // Define public paths that don't require authentication
    const isPublicPath = pathname === '/' || pathname.startsWith('/auth');

    // If the user is not authenticated and trying to access a protected route
    if (!isAuthenticated && !isPublicPath) {
        const url = new URL('/auth/signin', request.url);
        return NextResponse.redirect(url);
    }

    // If the user is authenticated and trying to access auth routes
    if (isAuthenticated && isPublicPath && pathname !== '/') {
        const url = new URL('/dashboard', request.url);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

// Configure paths that should trigger this middleware
export const config = {
    matcher: [
        // Match all routes except:
        // - API routes (/api/*)
        // - Static files (/_next/*, /favicon.ico, etc)
        // - Public files (/public/*)
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
