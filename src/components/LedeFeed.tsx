'use client';

import LedeCard from './LedeCard';
import feedData from '@/data/feed.json';
import type { LedeCardData } from '@/types';

const ledeData = feedData as LedeCardData[];

export default function LedeFeed() {
    return (
        <div className="bg-[#09090b] text-slate-100 antialiased min-h-screen font-sans">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-zinc-800">

                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center bg-[#09090b]/80 backdrop-blur-md p-4 justify-between border-b border-zinc-800">
                    <h1 className="text-xl font-bold tracking-tight">
                        <span className="text-white">Lede</span>
                        <span className="text-zinc-500">.nyc</span>
                    </h1>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                    </span>
                </header>

                {/* Feed */}
                <main className="flex-1 p-4 space-y-4">
                    {ledeData.map((data, index) => (
                        <LedeCard key={index} {...data} />
                    ))}
                </main>

            </div>
        </div>
    );
}
