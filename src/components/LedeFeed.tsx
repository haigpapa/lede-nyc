'use client';

import LedeCard from './LedeCard';
import feedJson from '@/data/feed.json';
import type { FeedPayload } from '@/types';
import { useNeighborhood } from '@/context/NeighborhoodContext';

const feedPayload = feedJson as unknown as FeedPayload;

/** Format ISO timestamp → relative time: "just now", "3h ago", "2d ago" */
function formatRelativeTime(iso: string): string {
    try {
        const diffMs = Date.now() - new Date(iso).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 2) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays === 1) return 'yesterday';
        return `${diffDays}d ago`;
    } catch {
        return '';
    }
}

export default function LedeFeed() {
    const { meta, cards: allCards } = feedPayload;
    const { profile } = useNeighborhood();

    // Sort: user's borough cards first, then the rest
    const userBorough = profile?.borough ?? null;
    const cards = userBorough
        ? [
            ...allCards.filter(c => c.borough === userBorough),
            ...allCards.filter(c => c.borough !== userBorough),
          ]
        : allCards;

    return (
        <div className="bg-[#09090b] text-slate-100 antialiased min-h-screen font-sans">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-zinc-800">

                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center bg-[#09090b]/80 backdrop-blur-md p-4 justify-between border-b border-zinc-800">
                    <h1 className="text-xl font-bold tracking-tight">
                        <span className="text-white">Lede</span>
                        <span className="text-zinc-500">.nyc</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                            Updated {formatRelativeTime(meta.generatedAt)}
                        </span>
                    </div>
                </header>

                {/* Feed */}
                <main className="flex-1 p-4 space-y-4">
                    {/* Borough context chip when sorted */}
                    {userBorough && (
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider px-0.5">
                            Showing {userBorough} first · then all NYC
                        </p>
                    )}
                    {cards.map((data, index) => (
                        <LedeCard key={index} {...data} />
                    ))}
                </main>

            </div>
        </div>
    );
}
