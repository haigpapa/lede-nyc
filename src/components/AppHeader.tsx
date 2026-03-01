'use client';

import { useNeighborhood } from '@/context/NeighborhoodContext';

interface AppHeaderProps {
    /** Override label — used on pages like Diligence that have their own context */
    overrideLabel?: string;
}

function getEditionTime() {
    return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York',
    });
}

export default function AppHeader({ overrideLabel }: AppHeaderProps) {
    const { profile } = useNeighborhood();

    const neighborhoodLabel = overrideLabel
        ?? (profile ? `${profile.displayName}, ${profile.borough}` : 'New York City');

    return (
        <header className="sticky top-0 z-50 flex items-center bg-[#09090b]/95 backdrop-blur-md px-4 py-3 justify-between border-b border-zinc-800/70">
            {/* Masthead */}
            <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-bold tracking-tight leading-none">
                    <span className="text-white">Lede</span>
                    <span className="text-emerald-400">.</span>
                    <span className="text-zinc-500">nyc</span>
                </h1>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wide uppercase">
                    {neighborhoodLabel}
                </span>
            </div>

            {/* Edition stamp — calm, authoritative */}
            <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">
                    NYC Edition
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                    {getEditionTime()} ET
                </span>
            </div>
        </header>
    );
}
