'use client';

/**
 * NeighborhoodVerdict — Homepage hero
 *
 * Answers ONE question instantly: what's the state of your area right now?
 * Verdict: CALM / WATCH / FRICTION
 * Then shows 3 chips explaining why, and a coverage confidence badge.
 *
 * Borough-aware: uses the user's stored profile (zip + borough) so residents
 * in Brooklyn, Queens, the Bronx, and Staten Island get their local context —
 * not Manhattan defaults.
 */

import { useNeighborhood } from '@/context/NeighborhoodContext';

type VerdictLevel = 'CALM' | 'WATCH' | 'FRICTION';

interface Signal {
    icon: string;
    label: string;
    level: 'ok' | 'warn' | 'alert';
    value: string;
}

interface VerdictConfig {
    verdict: VerdictLevel;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    tagline: string;
    emoji: string;
}

const VERDICT_CONFIG: Record<VerdictLevel, VerdictConfig> = {
    CALM: {
        verdict: 'CALM',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-900/60',
        dotColor: 'bg-emerald-400',
        tagline: 'Conditions are stable. No major signals.',
        emoji: '◉',
    },
    WATCH: {
        verdict: 'WATCH',
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-900/60',
        dotColor: 'bg-amber-400',
        tagline: 'Elevated activity. Worth keeping an eye on.',
        emoji: '◈',
    },
    FRICTION: {
        verdict: 'FRICTION',
        color: 'text-rose-400',
        bgColor: 'bg-rose-950/40',
        borderColor: 'border-rose-900/60',
        dotColor: 'bg-rose-400',
        tagline: 'Multiple disruptions active in your area.',
        emoji: '◆',
    },
};

const SIGNAL_COLOR: Record<Signal['level'], string> = {
    ok:    'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
    warn:  'text-amber-400  border-amber-900/50  bg-amber-950/30',
    alert: 'text-rose-400   border-rose-900/50   bg-rose-950/30',
};

const SIGNAL_DOT: Record<Signal['level'], string> = {
    ok:   'bg-emerald-400',
    warn:  'bg-amber-400',
    alert: 'bg-rose-400',
};

// Borough-specific signal data (simulated — replace with real API data)
// In production this would be fetched server-side keyed by zip/borough
const BOROUGH_SIGNALS: Record<string, { verdict: VerdictLevel; signals: Signal[]; coverage: 'High' | 'Medium' | 'Low' }> = {
    MANHATTAN: {
        verdict: 'WATCH',
        coverage: 'High',
        signals: [
            { icon: '🔥', label: 'Heat/Hot Water',      level: 'warn',  value: '23 complaints' },
            { icon: '🔊', label: 'Nightlife Noise',      level: 'warn',  value: 'Elevated 10pm–2am' },
            { icon: '🏗️', label: 'Active Scaffolding',   level: 'ok',    value: '4 sites near you' },
        ],
    },
    BROOKLYN: {
        verdict: 'WATCH',
        coverage: 'High',
        signals: [
            { icon: '🏗️', label: 'Construction Load',    level: 'warn',  value: '31 active permits' },
            { icon: '🔊', label: 'Night Noise',           level: 'ok',    value: 'Normal levels' },
            { icon: '🔥', label: 'Heat/Hot Water',        level: 'warn',  value: '18 complaints' },
        ],
    },
    QUEENS: {
        verdict: 'CALM',
        coverage: 'Medium',
        signals: [
            { icon: '🔥', label: 'Heat/Hot Water',        level: 'ok',    value: '7 complaints' },
            { icon: '🔊', label: 'Noise Reports',         level: 'ok',    value: 'Below average' },
            { icon: '🏗️', label: 'Construction Activity', level: 'ok',    value: 'Seasonal baseline' },
        ],
    },
    BRONX: {
        verdict: 'FRICTION',
        coverage: 'Medium',
        signals: [
            { icon: '🔥', label: 'Heat/Hot Water',        level: 'alert', value: '47 HPD complaints' },
            { icon: '🏗️', label: 'Demolition Orders',     level: 'warn',  value: '3 active DOB orders' },
            { icon: '🔊', label: 'Noise Complaints',      level: 'warn',  value: '+34% vs 30d avg' },
        ],
    },
    'STATEN ISLAND': {
        verdict: 'CALM',
        coverage: 'Low',
        signals: [
            { icon: '🔥', label: 'Heat/Hot Water',        level: 'ok',    value: '4 complaints' },
            { icon: '🔊', label: 'Noise',                 level: 'ok',    value: 'Quiet this week' },
            { icon: '🏗️', label: 'Construction',          level: 'ok',    value: 'Low activity' },
        ],
    },
};

const DEFAULT_DATA = BOROUGH_SIGNALS['MANHATTAN'];

interface Props { className?: string }

export default function NeighborhoodVerdict({ className = '' }: Props) {
    const { profile } = useNeighborhood();

    const borough = profile?.borough?.toUpperCase() as keyof typeof BOROUGH_SIGNALS | undefined;
    const data = (borough && BOROUGH_SIGNALS[borough]) ? BOROUGH_SIGNALS[borough] : DEFAULT_DATA;
    const cfg  = VERDICT_CONFIG[data.verdict];

    const displayBorough = profile?.borough
        ? profile.borough.charAt(0) + profile.borough.slice(1).toLowerCase()
        : 'Your Area';
    const displayZip = profile?.zip ? ` · ${profile.zip}` : '';

    const coverageColor = data.coverage === 'High' ? 'text-emerald-500' : data.coverage === 'Medium' ? 'text-amber-500' : 'text-zinc-500';

    return (
        <div className={`mx-4 rounded-2xl border overflow-hidden ${cfg.bgColor} ${cfg.borderColor} ${className}`}>

            {/* Top bar: location + time */}
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500">📍</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                        {displayBorough}{displayZip}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono ${coverageColor}`}>
                        Coverage: {data.coverage}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600">· Today</span>
                </div>
            </div>

            {/* Verdict */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} animate-pulse`} />
                    <span className={`text-3xl font-black tracking-tighter leading-none ${cfg.color}`}>
                        {data.verdict}
                    </span>
                </div>
            </div>
            <p className="px-4 pb-3 text-xs text-zinc-500 font-mono">{cfg.tagline}</p>

            {/* Divider */}
            <div className="mx-4 h-px bg-zinc-800/60" />

            {/* 3-chip signals */}
            <div className="px-4 py-3 flex flex-col gap-2">
                {data.signals.map((sig) => (
                    <div
                        key={sig.label}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 border ${SIGNAL_COLOR[sig.level]}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{sig.icon}</span>
                            <span className="text-xs font-semibold text-zinc-300">{sig.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${SIGNAL_DOT[sig.level]}`} />
                            <span className="text-[10px] font-mono text-zinc-400">{sig.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer: "Why this verdict?" drawer hint */}
            <button className="w-full text-center pb-3 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
                Why this verdict? ↓
            </button>
        </div>
    );
}
