'use client';

import LedeCard from './LedeCard';
import ProTeaser from './ProTeaser';
import type { LedeCardData } from '@/types';
import { useNeighborhood } from '@/context/NeighborhoodContext';
import { nbTrend, altTrend } from '@/data/trend-data';

interface FeedSectionProps {
    cards: LedeCardData[];
    dataWindow: string;
}

export default function FeedSection({ cards, dataWindow }: FeedSectionProps) {
    const { profile } = useNeighborhood();
    const userBorough = profile?.borough ?? null;

    // Sort: user's borough cards first, then the rest
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
        trend: i === 0 ? nbTrend.values : i === 1 ? altTrend.values : undefined,
        trendColor: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : undefined,
    }));

    return (
        <div className="pt-1">
            <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-xs font-bold tracking-[0.12em] text-zinc-500 uppercase">Block Signals</p>
                {userBorough && (
                    <p className="text-[10px] font-mono text-zinc-600">{userBorough} first</p>
                )}
            </div>
            <div className="space-y-4">
                {cardsWithTrends.map((card, index) => (
                    <div key={index}>
                        <LedeCard {...card} />
                        {/* Freemium teaser injected after first feed card */}
                        {index === 0 && (
                            <div className="mt-4">
                                <ProTeaser
                                    title="Landlord Health Score"
                                    subtitle="14 buildings flagged in your neighborhood this month"
                                    category="Building Intelligence"
                                    gateLabel="Historical violation data & landlord scoring"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
