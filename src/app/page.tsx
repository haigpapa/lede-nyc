import AppHeader from '@/components/AppHeader';
import NeighborhoodVerdict from '@/components/NeighborhoodVerdict';
import DailyBriefCard from '@/components/DailyBriefCard';
import VibeCard from '@/components/VibeCard';
import BlockMoodCard from '@/components/BlockMoodCard';
import TransitCard from '@/components/TransitCard';
import FeedSection from '@/components/FeedSection';
import UserBar from '@/components/UserBar';
import type { FeedPayload } from '@/types';
import feedJson from '@/data/feed.json';

const { meta, cards: feedCards } = feedJson as unknown as FeedPayload;

const dailyBrief = {
  summary: feedCards[0]?.bullets.join(' ') ?? 'Pipeline running — NYC briefing incoming at 6am.',
  timestamp: meta.generatedAt,
};

export default function BriefPage() {
  return (
    <>
      <AppHeader />
      <UserBar />
      <main className="flex-1 pb-24">

        {/* ── Hero verdict — answers "what's the state of my area?" instantly ── */}
        <div className="pt-3 pb-1">
          <NeighborhoodVerdict />
        </div>

        {/* ── Vibe Vector — 3-axis Growth / Disruption / Friction with time toggle ── */}
        <div className="px-4 pt-3">
          <VibeCard />
        </div>

        {/* ── Block Mood — 7-day activity vs 30d baseline ── */}
        <div className="pt-3">
          <BlockMoodCard />
        </div>

        <div className="p-4 space-y-4">
          {/* Daily brief + audio playback */}
          <DailyBriefCard summary={dailyBrief.summary} timestamp={dailyBrief.timestamp} />

          {/* Transit */}
          <TransitCard />

          {/* Borough-first feed with resident question framing */}
          <FeedSection cards={feedCards} dataWindow={meta.dataWindow} />
        </div>
      </main>
    </>
  );
}
