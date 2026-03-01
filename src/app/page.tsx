import AppHeader from '@/components/AppHeader';
import DailyBriefCard from '@/components/DailyBriefCard';
import VibeCard from '@/components/VibeCard';
import BlockMoodCard from '@/components/BlockMoodCard';
import TransitCard from '@/components/TransitCard';
import LedeCard from '@/components/LedeCard';
import ProTeaser from '@/components/ProTeaser';
import UserBar from '@/components/UserBar';
import type { LedeCardData, FeedPayload } from '@/types';
import feedJson from '@/data/feed.json';
import { nbTrend, altTrend } from '@/data/trend-data';

const { meta, cards: feedCards } = feedJson as unknown as FeedPayload;

// Inject real BigQuery trend data into the first two cards
// Also forward dataWindow from meta into every card
const feedWithTrends: LedeCardData[] = feedCards.map((card, i) => ({
  ...card,
  dataWindow: card.dataWindow ?? meta.dataWindow,
  trend: i === 0 ? nbTrend.values : i === 1 ? altTrend.values : undefined,
  trendColor: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : undefined,
}));

// Derive daily brief from first card's bullets — no more hardcoded content
const dailyBrief = {
  summary: feedCards[0]?.bullets.join(' ') ?? 'Pipeline running — Manhattan construction briefing coming at 6am.',
  timestamp: meta.generatedAt,
};

export default function BriefPage() {
  return (
    <>
      <AppHeader />
      <UserBar />
      <main className="flex-1 pb-24">
        <div className="p-4 space-y-4">
          <DailyBriefCard summary={dailyBrief.summary} timestamp={dailyBrief.timestamp} />
          <VibeCard />
        </div>

        {/* Block Mood — full-width section */}
        <BlockMoodCard />

        <div className="p-4 space-y-4">
          {/* Transit */}
          <TransitCard />

          {/* Feed cards */}
          <div className="pt-1">
            <p className="text-xs font-bold tracking-[0.12em] text-zinc-500 uppercase mb-3 px-0.5">Block Signals</p>
            <div className="space-y-4">
              {feedWithTrends.map((card, index) => (
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
        </div>
      </main>
    </>
  );
}
