'use client';

import { useState } from 'react';

interface ProTeaserProps {
    /** Title shown in the blurred preview */
    title?: string;
    /** Subtitle shown in the blurred preview */
    subtitle?: string;
    /** Category label shown in the teaser */
    category?: string;
    /** The gate reason — shown in the upgrade prompt */
    gateLabel?: string;
}

/**
 * Freemium gate card — shows a blurred preview of premium content
 * with a soft "Upgrade to Lede Pro" prompt.
 *
 * Used in the feed to surface premium signal teasers without hard-blocking.
 */
export default function ProTeaser({
    title = 'Landlord Health Score',
    subtitle = '14 buildings flagged in your neighborhood this month',
    category = 'Building Intelligence',
    gateLabel = 'Historical data & landlord scoring',
}: ProTeaserProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="relative rounded-xl border border-zinc-800 overflow-hidden">
            {/* Blurred preview layer */}
            <div className="p-4 select-none pointer-events-none" aria-hidden="true">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-amber-400/70">
                        {category}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-zinc-600 bg-amber-500/10 border border-amber-800/40 px-2 py-0.5 rounded-full">
                        PRO
                    </span>
                </div>

                {/* Blurred content */}
                <div className="blur-[5px] opacity-40 space-y-2.5">
                    <p className="text-white font-bold text-base leading-snug">{title}</p>
                    <p className="text-zinc-400 text-sm leading-relaxed">{subtitle}</p>

                    {/* Fake score gauge */}
                    <div className="flex items-center gap-3 mt-3">
                        <div className="w-16 h-16 rounded-full border-4 border-amber-500/60 flex items-center justify-center">
                            <span className="text-lg font-bold text-amber-400">62</span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <div className="h-2 bg-zinc-700 rounded-full w-full" />
                            <div className="h-2 bg-zinc-700 rounded-full w-3/4" />
                            <div className="h-2 bg-zinc-700 rounded-full w-1/2" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Frosted gate overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-zinc-950/70 to-zinc-950/95 flex flex-col items-center justify-end p-4 pb-5">
                <div className="w-full max-w-xs text-center">
                    <p className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1">
                        Lede Pro
                    </p>
                    <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
                    <p className="text-zinc-400 text-[11px] leading-snug mb-3">
                        {gateLabel} — available with a Pro subscription.
                    </p>
                    <button className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-colors">
                        Upgrade to Lede Pro — $9.99/mo
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="mt-2 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
