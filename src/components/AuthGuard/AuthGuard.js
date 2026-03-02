'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Same logic as former middleware: cookie-based auth redirects without using middleware (for Vercel deploy compatibility).
const AUTH_PATHS = ['/', '/login', '/verify', '/forgot-password', '/signup'];

function isAppPath(pathname) {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const currentPath = pathname || '/';
    const shouldCheck = AUTH_PATHS.includes(currentPath) || isAppPath(currentPath);
    if (!shouldCheck) return;

    const authStatusCookie = Cookies.get('authStatus');

    if (currentPath === '/verify') {
      if (!authStatusCookie) {
        router.replace('/login');
      }
      return;
    }

    if (authStatusCookie) {
      try {
        const authStatus = JSON.parse(authStatusCookie);
        if (authStatus.status === 'awaiting_verification') {
          router.replace('/verify');
        }
      } catch (_) {
        // ignore parse errors
      }
    }
  }, [pathname, router]);

  return children;
}
