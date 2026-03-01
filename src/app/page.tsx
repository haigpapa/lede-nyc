import AppHeader from '@/components/AppHeader';
import DailyBriefCard from '@/components/DailyBriefCard';
import VibeCard from '@/components/VibeCard';
import BlockMoodCard from '@/components/BlockMoodCard';
import TransitCard from '@/components/TransitCard';
import FeedSection from '@/components/FeedSection';
import UserBar from '@/components/UserBar';
import type { FeedPayload } from '@/types';
import feedJson from '@/data/feed.json';

const { meta, cards: feedCards } = feedJson as unknown as FeedPayload;

// Derive daily brief from first card's bullets — no more hardcoded content
const dailyBrief = {
  summary: feedCards[0]?.bullets.join(' ') ?? 'Pipeline running — NYC construction briefing coming at 6am.',
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

          {/* Feed cards — sorted by user's borough via FeedSection client component */}
          <FeedSection cards={feedCards} dataWindow={meta.dataWindow} />
        </div>
      </main>
    </>
  );
}
