'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNeighborhood } from '@/context/NeighborhoodContext';

/**
 * Wraps the app shell. Redirects to /onboard if no neighborhood profile is stored.
 * Skips the check when already on /onboard to avoid a redirect loop.
 */
export default function OnboardGate({ children }: { children: ReactNode }) {
    const { isOnboarded } = useNeighborhood();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isOnboarded && pathname !== '/onboard') {
            router.replace('/onboard');
        }
    }, [isOnboarded, pathname, router]);

    // Show nothing while redirecting to avoid flash
    if (!isOnboarded && pathname !== '/onboard') return null;

    return <>{children}</>;
}
