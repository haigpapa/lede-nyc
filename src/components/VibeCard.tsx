'use client';

/**
 * VibeCard — 3-axis Vibe Vector
 *
 * Three signals rendered as stacked bars with trend arrows:
 *   Growth     (Emerald) — New buildings, civic engagement
 *   Disruption (Rose)    — Demolitions, complaints, heat/noise
 *   Friction   (Amber)   — Alterations, scaffolding, street work
 *
 * 7 / 30 / 365 day time toggle on each axis.
 * Tap the card header to see "Why this moved."
 */

import { useState } from 'react';
import { useNeighborhood } from '@/context/NeighborhoodContext';

type Window = '7d' | '30d' | '365d';

interface AxisData {
    value: number;       // 0–100 current
    prev: number;        // value in previous equivalent window (for trend)
    label: string;
    description: string; // what drives this axis
}

interface WindowData {
    growth: AxisData;
    disruption: AxisData;
    friction: AxisData;
}

// Borough-specific vibe data per time window
// In production: fetched from API keyed by borough + window
const BOROUGH_VIBE: Record<string, Record<Window, WindowData>> = {
    MANHATTAN: {
        '7d':  { growth: { value: 62, prev: 55, label: 'Growth',     description: '9 new buildings permitted' }, disruption: { value: 58, prev: 49, label: 'Disruption', description: '23 heat/noise complaints' }, friction: { value: 71, prev: 68, label: 'Friction',   description: 'Scaffolding + 14 alt permits' } },
        '30d': { growth: { value: 57, prev: 50, label: 'Growth',     description: '31 new buildings this month' }, disruption: { value: 54, prev: 52, label: 'Disruption', description: '89 complaints (mixed)' }, friction: { value: 68, prev: 61, label: 'Friction',   description: '52 alteration permits' } },
        '365d':{ growth: { value: 61, prev: 48, label: 'Growth',     description: 'Construction boom YoY' }, disruption: { value: 51, prev: 56, label: 'Disruption', description: 'Complaints down YoY' }, friction: { value: 65, prev: 72, label: 'Friction',   description: 'Scaffold count falling' } },
    },
    BROOKLYN: {
        '7d':  { growth: { value: 74, prev: 60, label: 'Growth',     description: '14 new buildings permitted' }, disruption: { value: 45, prev: 48, label: 'Disruption', description: '18 complaints — below avg' }, friction: { value: 63, prev: 58, label: 'Friction',   description: '31 active alt permits' } },
        '30d': { growth: { value: 70, prev: 63, label: 'Growth',     description: '48 permits this month' }, disruption: { value: 42, prev: 50, label: 'Disruption', description: 'Heat complaints falling' }, friction: { value: 61, prev: 55, label: 'Friction',   description: 'Street works up +12%' } },
        '365d':{ growth: { value: 68, prev: 55, label: 'Growth',     description: 'Strong build year' }, disruption: { value: 39, prev: 45, label: 'Disruption', description: 'Calmer than 2024' }, friction: { value: 59, prev: 64, label: 'Friction',   description: 'Scaffold permits declining' } },
    },
    QUEENS: {
        '7d':  { growth: { value: 48, prev: 45, label: 'Growth',     description: '7 new buildings permitted' }, disruption: { value: 31, prev: 33, label: 'Disruption', description: 'Low complaints week' }, friction: { value: 44, prev: 42, label: 'Friction',   description: 'Routine alt activity' } },
        '30d': { growth: { value: 51, prev: 46, label: 'Growth',     description: 'Moderate build activity' }, disruption: { value: 34, prev: 38, label: 'Disruption', description: 'Below borough avg' }, friction: { value: 47, prev: 44, label: 'Friction',   description: 'Stable street works' } },
        '365d':{ growth: { value: 49, prev: 43, label: 'Growth',     description: 'Steady YoY growth' }, disruption: { value: 36, prev: 41, label: 'Disruption', description: 'Quieter than 2024' }, friction: { value: 45, prev: 48, label: 'Friction',   description: 'Less scaffolding YoY' } },
    },
    BRONX: {
        '7d':  { growth: { value: 39, prev: 37, label: 'Growth',     description: '4 new buildings permitted' }, disruption: { value: 79, prev: 62, label: 'Disruption', description: '47 HPD heat complaints ↑↑' }, friction: { value: 68, prev: 61, label: 'Friction',   description: '3 demolition orders active' } },
        '30d': { growth: { value: 42, prev: 38, label: 'Growth',     description: 'Limited new construction' }, disruption: { value: 73, prev: 64, label: 'Disruption', description: 'Heat/water issues rising' }, friction: { value: 65, prev: 60, label: 'Friction',   description: 'DOB violations up +22%' } },
        '365d':{ growth: { value: 38, prev: 35, label: 'Growth',     description: 'Below NYC average' }, disruption: { value: 68, prev: 61, label: 'Disruption', description: 'Chronic issues persist' }, friction: { value: 62, prev: 58, label: 'Friction',   description: 'Infrastructure stress' } },
    },
    'STATEN ISLAND': {
        '7d':  { growth: { value: 33, prev: 31, label: 'Growth',     description: '2 permits issued' }, disruption: { value: 22, prev: 24, label: 'Disruption', description: 'Very low complaint volume' }, friction: { value: 28, prev: 29, label: 'Friction',   description: 'Minimal street works' } },
        '30d': { growth: { value: 35, prev: 32, label: 'Growth',     description: 'Low build activity' }, disruption: { value: 25, prev: 27, label: 'Disruption', description: 'Quietest borough' }, friction: { value: 30, prev: 31, label: 'Friction',   description: 'Stable' } },
        '365d':{ growth: { value: 34, prev: 30, label: 'Growth',     description: 'Slight uptick YoY' }, disruption: { value: 24, prev: 26, label: 'Disruption', description: 'Consistently calm' }, friction: { value: 29, prev: 32, label: 'Friction',   description: 'Improving' } },
    },
};

const FALLBACK_VIBE = BOROUGH_VIBE['MANHATTAN'];

const AXIS_STYLE = {
    growth:     { color: '#10b981', bar: 'bg-emerald-500', text: 'text-emerald-400', track: 'bg-emerald-950/60' },
    disruption: { color: '#f43f5e', bar: 'bg-rose-500',    text: 'text-rose-400',    track: 'bg-rose-950/60'    },
    friction:   { color: '#f59e0b', bar: 'bg-amber-500',   text: 'text-amber-400',   track: 'bg-amber-950/60'   },
};

const TIME_LABELS: Record<Window, string> = { '7d': '7 days', '30d': '30 days', '365d': '1 year' };

export default function VibeCard() {
    const { profile } = useNeighborhood();
    const [window, setWindow]   = useState<Window>('7d');
    const [expanded, setExpanded] = useState(false);

    const borough = profile?.borough?.toUpperCase() as keyof typeof BOROUGH_VIBE | undefined;
    const vibeData = (borough && BOROUGH_VIBE[borough]) ? BOROUGH_VIBE[borough] : FALLBACK_VIBE;
    const data = vibeData[window];

    const axes = [
        { key: 'growth'     as const, ...data.growth },
        { key: 'disruption' as const, ...data.disruption },
        { key: 'friction'   as const, ...data.friction },
    ];

    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">

            {/* Header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-4 pt-4 pb-3 text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.12em] text-zinc-400 uppercase">
                        Vibe Vector
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800">
                        {TIME_LABELS[window]}
                    </span>
                </div>
                <span className="text-zinc-600 text-xs font-mono">{expanded ? '▴ less' : '▾ why'}</span>
            </button>

            {/* Time toggle */}
            <div className="flex gap-1 px-4 pb-3">
                {(['7d', '30d', '365d'] as Window[]).map(w => (
                    <button
                        key={w}
                        onClick={() => setWindow(w)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                            window === w
                                ? 'bg-zinc-700 border-zinc-600 text-white'
                                : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                        {w}
                    </button>
                ))}
            </div>

            {/* Axes */}
            <div className="px-4 pb-4 flex flex-col gap-3">
                {axes.map(({ key, label, value, prev, description }) => {
                    const style = AXIS_STYLE[key];
                    const delta = value - prev;
                    const arrow = delta > 3 ? '↑' : delta < -3 ? '↓' : '→';
                    const arrowColor = key === 'growth'
                        ? (delta > 3 ? 'text-emerald-400' : delta < -3 ? 'text-rose-400' : 'text-zinc-500')
                        : key === 'disruption'
                            ? (delta > 3 ? 'text-rose-400' : delta < -3 ? 'text-emerald-400' : 'text-zinc-500')
                            : (delta > 3 ? 'text-amber-400' : delta < -3 ? 'text-emerald-400' : 'text-zinc-500');

                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold ${style.text}`}>{label}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-mono font-bold ${arrowColor}`}>
                                        {arrow} {Math.abs(delta).toFixed(0)}
                                    </span>
                                    <span className="text-xs font-mono text-zinc-400 w-8 text-right">{value}</span>
                                </div>
                            </div>
                            {/* Bar */}
                            <div className={`relative h-2 rounded-full ${style.track}`}>
                                <div
                                    className={`h-full rounded-full ${style.bar} transition-all duration-500`}
                                    style={{ width: `${value}%` }}
                                />
                                {/* Previous period ghost */}
                                <div
                                    className="absolute top-0 w-0.5 h-full bg-zinc-500/60"
                                    style={{ left: `${prev}%` }}
                                    title={`Previous ${TIME_LABELS[window]}: ${prev}`}
                                />
                            </div>
                            {/* Expanded: show description */}
                            {expanded && (
                                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{description}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="px-4 pb-3 text-[9px] text-zinc-700 font-mono">
                Tick = previous {TIME_LABELS[window]} · NYC Open Data signals
            </p>
        </div>
    );
}
