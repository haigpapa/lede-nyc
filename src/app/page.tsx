import AppHeader from '@/components/AppHeader';
import DailyBriefCard from '@/components/DailyBriefCard';
import VibeCard from '@/components/VibeCard';
import BlockMoodCard from '@/components/BlockMoodCard';
import TransitCard from '@/components/TransitCard';
import LedeCard from '@/components/LedeCard';
import ProTeaser from '@/components/ProTeaser';
import UserBar from '@/components/UserBar';
import type { LedeCardData } from '@/types';
import feedJson from '@/data/feed.json';
import { nbTrend, altTrend } from '@/data/trend-data';

const feed = feedJson as LedeCardData[];

// Inject real BigQuery trend data into the first two cards
const feedWithTrends: LedeCardData[] = feed.map((card, i) => ({
  ...card,
  trend: i === 0 ? nbTrend.values : i === 1 ? altTrend.values : undefined,
  trendColor: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : undefined,
}));

const dailyBrief = {
  summary: "Brooklyn is the city's construction engine right now — North Side, Stuyvesant Heights, and East New York each have 10 new building permits, and the outer boroughs are far outpacing Manhattan for new development. Meanwhile, renovation permits are concentrated in the Upper West Side and Chelsea. Seven demolitions are quietly underway in Brooklyn and the Bronx — often the first sign of what's coming next.",
  timestamp: '2025-12-30T12:00:00Z',
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
            <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase mb-3 px-0.5">Block Signals</p>
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
