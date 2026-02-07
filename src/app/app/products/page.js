'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/app/setting');
    }, [router]);
    return null;
}
