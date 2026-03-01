'use client';

import { recentDailyCounts, rollingAvg30d } from '@/data/trend-data';

// ── Mood Classification ───────────────────────────────────────────────────────
type MoodId = 'industrious' | 'festive' | 'transitional' | 'settled' | 'quiet';

interface Mood {
    id: MoodId;
    label: string;
    emoji: string;
    description: string;
    color: string;
    bg: string;
}

const MOODS: Record<MoodId, Mood> = {
    industrious: { id: 'industrious', label: 'Industrious', emoji: '🔨', description: 'High construction activity — cranes up, permits flying.', color: '#f59e0b', bg: 'bg-amber-950/40 border-amber-900/40' },
    festive: { id: 'festive', label: 'Festive', emoji: '🎉', description: 'Unusual civic activity — community events or street closures.', color: '#a78bfa', bg: 'bg-violet-950/40 border-violet-900/40' },
    transitional: { id: 'transitional', label: 'Transitional', emoji: '🔄', description: 'Mixed signals — some blocks building, others quiet.', color: '#38bdf8', bg: 'bg-sky-950/40 border-sky-900/40' },
    settled: { id: 'settled', label: 'Settled', emoji: '🏠', description: 'Near-average activity. Steady, nothing surprising.', color: '#10b981', bg: 'bg-emerald-950/40 border-emerald-900/40' },
    quiet: { id: 'quiet', label: 'Quiet', emoji: '😴', description: 'Low permit activity. Block is resting.', color: '#6b7280', bg: 'bg-zinc-900/40 border-zinc-800' },
};

function classifyMood(recentAvg: number, baseline: number): MoodId {
    const ratio = recentAvg / baseline;
    if (ratio > 1.5) return 'industrious';
    if (ratio > 1.15) return 'transitional';
    if (ratio > 0.85) return 'settled';
    if (ratio > 0.5) return 'festive';  // unusually low + community displacement
    return 'quiet';
}

function getDayLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function BlockMoodCard() {
    // Calculate 7-day average from real data
    const recent = recentDailyCounts.slice(-7);
    const sum7d = recent.reduce((a, b) => a + b.total, 0);
    const avg7d = sum7d / recent.length;
    const moodId = classifyMood(avg7d, rollingAvg30d);
    const mood = MOODS[moodId];

    // WoW delta: last 7 days vs previous 7 days
    const prev7d = recentDailyCounts.slice(-14, -7).reduce((a, b) => a + b.total, 0);
    const delta = sum7d - prev7d;
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

    // Bar chart data — last 7 days
    const barMax = Math.max(...recent.map(d => d.total), 1);

    return (
        <div className={`mx-4 rounded-xl border p-4 ${mood.bg}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Block Mood</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl">{mood.emoji}</span>
                        <h3 className="text-white font-bold text-lg leading-none">{mood.label}</h3>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-mono" style={{ color: mood.color }}>{sum7d}</p>
                    <p className="text-[10px] font-mono text-zinc-500">permits / 7d</p>
                    <p className={`text-[11px] font-semibold font-mono mt-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {deltaStr} WoW
                    </p>
                </div>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">{mood.description}</p>

            {/* Mini bar chart — last 7 days */}
            <div className="flex items-end gap-1 h-8">
                {recent.map((day) => {
                    const pct = day.total / barMax;
                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                                className="w-full rounded-sm transition-all motion-reduce:transition-none"
                                style={{ height: `${Math.max(pct * 28, 2)}px`, backgroundColor: mood.color + (day.total === 0 ? '30' : '90') }}
                            />
                            <span className="text-[8px] text-zinc-600">{getDayLabel(day.date)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Baseline indicator */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-600">30d baseline: {rollingAvg30d.toFixed(1)}/day</span>
                <span className="text-[10px] font-mono" style={{ color: mood.color }}>
                    {avg7d > rollingAvg30d ? '↑' : '↓'} {Math.abs(((avg7d / rollingAvg30d) - 1) * 100).toFixed(0)}% vs avg
                </span>
            </div>
        </div>
    );
}
