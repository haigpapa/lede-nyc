'use client';

/**
 * FeedSection — Block Signals feed
 *
 * Borough-first sort: the user's borough cards always appear first.
 * Sections are framed as resident questions, not taxonomies.
 * Sparklines injected on first two cards.
 */

import LedeCard from './LedeCard';
import ProTeaser from './ProTeaser';
import type { LedeCardData } from '@/types';
import { useNeighborhood } from '@/context/NeighborhoodContext';
import { nbTrend, altTrend } from '@/data/trend-data';

interface FeedSectionProps {
    cards: LedeCardData[];
    dataWindow: string;
}

// Resident question labels keyed by card index in the sorted list
// These replace the generic "Block Signals" taxonomy
const SECTION_QUESTIONS = [
    { question: 'Can I sleep this week?',      sub: 'Noise · permits · nightlife complaints' },
    { question: 'Is my building OK?',           sub: 'HPD violations · heat · water outages' },
    { question: 'Will my commute break?',       sub: 'Subway incidents · construction near stations' },
    { question: 'Why is the sidewalk cursed?',  sub: 'Scaffolding · street works · closures' },
];

export default function FeedSection({ cards, dataWindow }: FeedSectionProps) {
    const { profile } = useNeighborhood();
    const userBorough = profile?.borough ?? null;

    // Borough-first sort: always lead with the user's borough
    const sortedCards = userBorough
        ? [
            ...cards.filter(c => c.borough === userBorough),
            ...cards.filter(c => c.borough !== userBorough),
          ]
        : cards;

    // Inject trend sparklines into the first two cards
    const cardsWithTrends: LedeCardData[] = sortedCards.map((card, i) => ({
        ...card,
        dataWindow: card.dataWindow ?? dataWindow,
        trend:      i === 0 ? nbTrend.values  : i === 1 ? altTrend.values : undefined,
        trendColor: i === 0 ? '#10b981'        : i === 1 ? '#f59e0b'       : undefined,
    }));

    const boroughLabel = userBorough
        ? userBorough.charAt(0) + userBorough.slice(1).toLowerCase()
        : 'NYC';

    return (
        <div className="pt-1">

            {/* Section header */}
            <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-xs font-bold tracking-[0.12em] text-zinc-500 uppercase">
                    {boroughLabel} Signal Feed
                </p>
                {userBorough && (
                    <span className="text-[10px] font-mono text-emerald-700 border border-emerald-900/40 bg-emerald-950/30 px-2 py-0.5 rounded-full">
                        {boroughLabel} first
                    </span>
                )}
            </div>

            <div className="space-y-6">
                {cardsWithTrends.map((card, index) => {
                    const section = SECTION_QUESTIONS[index] ?? null;
                    return (
                        <div key={index}>
                            {/* Resident question framing above card */}
                            {section && (
                                <div className="mb-2 px-0.5">
                                    <p className="text-xs font-semibold text-zinc-300 leading-snug">
                                        {section.question}
                                    </p>
                                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                                        {section.sub}
                                    </p>
                                </div>
                            )}

                            <LedeCard {...card} />

                            {/* Freemium teaser injected after first card */}
                            {index === 0 && (
                                <div className="mt-4">
                                    <ProTeaser
                                        title="Building Risk Receipt"
                                        subtitle="12 violations flagged at addresses near you this month"
                                        category="Lease Diligence"
                                        gateLabel="Full HPD/DOB history · Landlord score · Scaffold risk"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
