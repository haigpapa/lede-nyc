'use client';

import { useNeighborhood } from '@/context/NeighborhoodContext';

interface AppHeaderProps {
    /** Override label — used on pages like Diligence that have their own context */
    overrideLabel?: string;
}

export default function AppHeader({ overrideLabel }: AppHeaderProps) {
    const { profile } = useNeighborhood();

    const neighborhoodLabel = overrideLabel
        ?? (profile ? `${profile.displayName}, ${profile.borough}` : '—');

    return (
        <header className="sticky top-0 z-50 flex items-center bg-[#09090b]/90 backdrop-blur-md px-4 py-3 justify-between border-b border-zinc-800">
            <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight leading-none">
                    <span className="text-white">Lede</span>
                    <span className="text-emerald-400">.</span>
                    <span className="text-zinc-500">nyc</span>
                </h1>
                <span className="text-xs text-zinc-500 mt-0.5 font-mono">{neighborhoodLabel}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                    Live
                </span>
            </div>
        </header>
    );
}
