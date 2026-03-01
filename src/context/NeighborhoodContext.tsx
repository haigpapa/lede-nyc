'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface NeighborhoodProfile {
    displayName: string;   // "Hell's Kitchen"
    borough: string;       // "Manhattan"
    zip: string;           // "10036"
    rawInput: string;      // what the user typed
    lat?: number;
    lng?: number;
    interests: string[];   // ["transit", "noise", "construction"]
    onboardedAt: string;   // ISO timestamp
}

interface NeighborhoodContextValue {
    profile: NeighborhoodProfile | null;
    setProfile: (p: NeighborhoodProfile) => void;
    clearProfile: () => void;
    isOnboarded: boolean;
}

const NeighborhoodContext = createContext<NeighborhoodContextValue | null>(null);

const STORAGE_KEY = 'lede_neighborhood_v1';

export function NeighborhoodProvider({ children }: { children: ReactNode }) {
    const [profile, setProfileState] = useState<NeighborhoodProfile | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setProfileState(JSON.parse(stored));
        } catch {
            // ignore parse errors
        }
        setHydrated(true);
    }, []);

    function setProfile(p: NeighborhoodProfile) {
        setProfileState(p);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
    }

    function clearProfile() {
        setProfileState(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }

    // Don't render children until hydrated to prevent flicker
    if (!hydrated) return null;

    return (
        <NeighborhoodContext.Provider value={{
            profile,
            setProfile,
            clearProfile,
            isOnboarded: profile !== null,
        }}>
            {children}
        </NeighborhoodContext.Provider>
    );
}

export function useNeighborhood() {
    const ctx = useContext(NeighborhoodContext);
    if (!ctx) throw new Error('useNeighborhood must be used inside NeighborhoodProvider');
    return ctx;
}
