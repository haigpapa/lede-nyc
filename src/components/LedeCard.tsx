'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Sparkline from '@/components/Sparkline';
import { accentMap, type LedeCardData } from '@/types';

/** Format ISO timestamp → "Feb 28, 2026" */
function formatTimestamp(iso: string) {
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default function LedeCard({
    category,
    emoji,
    headline,
    imageSrc,
    bullets,
    accentColor,
    timestamp,
    mapFocus,
    trend,
    trendColor,
    sqlQuery,
    dataWindow,
    provenanceRowCount,
    provenanceSampleId,
}: LedeCardData) {
    const theme = accentMap[accentColor];
    const [showSQL, setShowSQL] = useState(false);

    return (
        <div
            className="relative p-5 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800 overflow-hidden transition-transform motion-reduce:transition-none active:scale-95 motion-reduce:active:scale-100"
            style={{ boxShadow: `0 0 20px -5px ${theme.shadow}` }}
        >
            {/* Accent glow blob */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${theme.bg} blur-3xl rounded-full pointer-events-none`} />

            <div className="flex flex-col gap-3 relative z-10">
                {/* Category row — with sparkline if trend exists */}
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-[0.1em] ${theme.text} uppercase`}>
                        {category} {emoji}
                    </span>
                    {trend && trend.length >= 2 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-mono">12w</span>
                            <Sparkline
                                values={trend}
                                width={64}
                                height={20}
                                color={trendColor ?? '#10b981'}
                                fill
                            />
                        </div>
                    )}
                </div>

                {/* Headline */}
                <h2 className="text-2xl font-bold leading-tight text-white">{headline}</h2>

                {/* Optional image */}
                {imageSrc && (
                    <div className="w-full h-48 rounded-lg overflow-hidden my-2 relative">
                        <Image
                            src={imageSrc}
                            alt={headline}
                            fill
                            className="object-cover"
                            sizes="(max-width: 430px) 100vw, 430px"
                        />
                    </div>
                )}

                {/* Bullets */}
                <ul className="space-y-4 mt-2">
                    {bullets.map((bullet, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className={`w-2 h-2 mt-2 rounded-full ${theme.dot} shrink-0`} aria-hidden="true" />
                            <p className="text-slate-300 text-base leading-relaxed">{bullet}</p>
                        </li>
                    ))}
                </ul>

                {/* Provenance drawer — "Prove it →" */}
                {sqlQuery && (
                    <div className="mt-1">
                        <button
                            onClick={() => setShowSQL(v => !v)}
                            className={`flex items-center gap-1.5 text-xs font-mono font-semibold transition-colors ${showSQL ? theme.text : 'text-zinc-600 hover:text-zinc-400'}`}
                            aria-expanded={showSQL}
                        >
                            <span>{showSQL ? '▼' : '▶'}</span>
                            <span>Prove it →</span>
                        </button>
                        {showSQL && (
                            <div className="mt-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800 overflow-x-auto">

                                {/* Why */}
                                <p className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Why</p>
                                <p className="text-xs text-zinc-300 mb-3">
                                    {provenanceSampleId
                                        ? `${provenanceSampleId} showed a statistically significant spike vs the 90-day average.`
                                        : 'A statistically significant spike was detected vs the 90-day average.'}
                                </p>

                                {/* Proof — SQL */}
                                <p className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Proof</p>
                                <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-words mb-3">
                                    {sqlQuery}
                                </pre>

                                {/* Method */}
                                <p className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Method</p>
                                <p className="text-[10px] font-mono text-zinc-400 mb-2">
                                    7-day count vs 90-day rolling average · threshold: &gt;25% deviation
                                </p>

                                {/* Stats row */}
                                <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-zinc-800">
                                    {provenanceRowCount !== undefined && (
                                        <span className="text-[10px] font-mono text-zinc-600">{provenanceRowCount} anomal{provenanceRowCount === 1 ? 'y' : 'ies'} matched</span>
                                    )}
                                    <span className={`text-[10px] font-mono ${theme.text}`}>
                                        Source: NYC Open Data · BigQuery · lede-nyc-data
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500">{formatTimestamp(timestamp)}</span>
                        {dataWindow && (
                            <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">
                                {dataWindow}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {mapFocus && (
                            <Link
                                href={`/atlas?focus=${encodeURIComponent(mapFocus)}`}
                                className="text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg"
                            >
                                🗺 Map
                            </Link>
                        )}
                        {/* Read More — disabled until article routes are built */}
                        <div className="relative group">
                            <button
                                disabled
                                aria-disabled="true"
                                className={`${theme.btn} text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors opacity-40 cursor-not-allowed`}
                            >
                                Read More
                            </button>
                            <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
                                Full articles coming soon
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
