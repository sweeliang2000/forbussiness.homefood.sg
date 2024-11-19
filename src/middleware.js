import { NextResponse } from 'next/server';

export function middleware(request) {
    return handleAuthStatus(request);
}

// Helper function to check authStatus and handle redirection
function handleAuthStatus(request) {
    const currentPath = new URL(request.url).pathname;
    const authStatusCookie = request.cookies.get('authStatus');

    // Prevent redirect loop for '/verify'
    if (currentPath === '/verify') {
        if (!authStatusCookie) {
            return NextResponse.redirect(new URL('/login', request.url));
        };
        console.log('Skipping middleware for /verify');
        return NextResponse.next();
    }

    if (authStatusCookie) {
        try {
            const authStatus = JSON.parse(authStatusCookie.value);

            if (authStatus.status === 'awaiting_verification') {
                return NextResponse.redirect(new URL('/verify', request.url));
            }
        } catch (error) {
            console.error('Error parsing authStatus cookie:', error);
        }
    }

    // Allow the request to proceed if no redirection is needed
    return NextResponse.next();
}

// Match all routes
export const config = {
    matcher: [
        '/', 
        '/login', 
        '/forgot-password',
        '/signup',
        '/app/:path*'
    ],
};
