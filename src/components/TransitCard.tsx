'use client';

import Sparkline from '@/components/Sparkline';
import { scoreTokens, getScoreBand } from '@/types';
import { useNeighborhood } from '@/context/NeighborhoodContext';

// MTA Subway reliability data
// Source: MTA performance data (manually curated for demo)
// In Sprint 2, this will be replaced by a live BigQuery query against MTA data

interface SubwayLine {
    line: string;
    color: string;   // Official MTA brand color — always used for badge only
    reliability: number;
    trend: number[];
}

interface TransitStats {
    overallScore: number;
    scorePrev: number;
    lines: SubwayLine[];
    topAlert: string;
    alertLevel: 'low' | 'moderate' | 'high';
}

// Official MTA line colors
const LINE_COLORS: Record<string, string> = {
    A: '#0039A6', C: '#0039A6', E: '#0039A6',
    B: '#FF6319', D: '#FF6319', F: '#FF6319', M: '#FF6319',
    G: '#6CBE45',
    J: '#996633', Z: '#996633',
    L: '#A7A9AC',
    N: '#FCCC0A', Q: '#FCCC0A', R: '#FCCC0A', W: '#FCCC0A',
    '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
    '4': '#00933C', '5': '#00933C', '6': '#00933C',
    '7': '#B933AD',
    S: '#808183',
};

// Subway lines by neighborhood / area — ordered by relevance
const NEIGHBORHOOD_LINES: Record<string, string[]> = {
    // Manhattan corridors
    "hell's kitchen":       ['A', 'C', 'E', '1', '2', '3', 'N', 'Q', 'R', 'W', '7'],
    "midtown":              ['4', '5', '6', 'N', 'Q', 'R', 'W', '7', 'A', 'C', 'E', 'B', 'D', 'F', 'M', '1', '2', '3'],
    "upper east side":      ['4', '5', '6', 'Q'],
    "upper west side":      ['1', '2', '3', 'B', 'C'],
    "harlem":               ['2', '3', '4', '5', '6', 'A', 'B', 'C', 'D'],
    "east village":         ['L', '4', '5', '6', 'N', 'Q', 'R', 'W'],
    "west village":         ['1', '2', '3', 'A', 'C', 'E', 'L'],
    "chelsea":              ['1', 'A', 'C', 'E', 'F', 'M', 'L'],
    "flatiron":             ['N', 'Q', 'R', 'W', '4', '5', '6', 'F', 'M', 'L'],
    "soho":                 ['A', 'C', 'E', 'N', 'Q', 'R', 'W', '1', 'B', 'D', 'F', 'M'],
    "tribeca":              ['1', '2', '3', 'A', 'C', 'E'],
    "financial district":   ['2', '3', '4', '5', 'A', 'C', 'J', 'Z', 'R', 'W'],
    "lower east side":      ['F', 'J', 'M', 'Z', 'B', 'D'],
    "chinatown":            ['4', '5', '6', 'J', 'Z', 'N', 'Q', 'R', 'W'],
    "washington heights":   ['1', 'A', 'C'],
    "inwood":               ['1', 'A'],
    "murray hill":          ['4', '5', '6', '7'],
    "gramercy":             ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'],
    "kips bay":             ['4', '5', '6'],
    "astoria":              ['N', 'W'],
    "long island city":     ['7', 'E', 'M', 'N', 'W'],
    "flushing":             ['7'],
    "jackson heights":      ['7', 'E', 'F', 'M', 'R'],
    "forest hills":         ['E', 'F', 'M', 'R'],
    "jamaica":              ['E', 'J', 'Z'],
    "williamsburg":         ['L', 'J', 'M', 'Z'],
    "bushwick":             ['L', 'J', 'M', 'Z'],
    "bed-stuy":             ['A', 'C', 'J', 'Z', 'G'],
    "crown heights":        ['2', '3', '4', '5'],
    "park slope":           ['B', 'D', 'F', 'G', 'N', 'Q', 'R'],
    "carroll gardens":      ['F', 'G'],
    "red hook":             ['F', 'G'],
    "sunset park":          ['D', 'N', 'R'],
    "bay ridge":            ['R'],
    "bensonhurst":          ['D', 'N'],
    "flatbush":             ['2', '5', 'B', 'Q'],
    "prospect heights":     ['2', '3', 'B', 'Q'],
    "greenpoint":           ['G'],
    "cobble hill":          ['F', 'G'],
    "boerum hill":          ['A', 'C', 'G', 'F'],
    "downtown brooklyn":    ['2', '3', '4', '5', 'A', 'C', 'F', 'G', 'N', 'Q', 'R'],
    "bronx":                ['2', '5', '4', '6', 'B', 'D'],
    "riverdale":            ['1'],
    "fordham":              ['4', 'B', 'D'],
    "staten island":        ['S'],
    // Fallback
    "default":              ['A', 'C', 'E', '1', '2', '3', '4', '5', '6', 'N', 'Q', 'R', 'W', 'L', '7', 'B', 'D', 'F', 'M'],
};

function getLinesForNeighborhood(displayName: string): string[] {
    const key = displayName.toLowerCase();
    // Try exact match first
    if (NEIGHBORHOOD_LINES[key]) return NEIGHBORHOOD_LINES[key];
    // Try partial match
    for (const [k, lines] of Object.entries(NEIGHBORHOOD_LINES)) {
        if (key.includes(k) || k.includes(key)) return lines;
    }
    return NEIGHBORHOOD_LINES['default'];
}

// Seeded fake-but-stable reliability scores per line (will be replaced with live data)
function fakeReliability(line: string): number {
    const seed: Record<string, number> = {
        '1': 81, '2': 79, '3': 77, '4': 84, '5': 82, '6': 80, '7': 76,
        A: 82, C: 74, E: 79, B: 71, D: 73, F: 75, M: 68,
        G: 70, J: 66, Z: 65, L: 78, N: 69, Q: 72, R: 74, W: 77, S: 88,
    };
    return seed[line] ?? 75;
}

function fakeTrend(line: string): number[] {
    const base = fakeReliability(line);
    return Array.from({ length: 8 }, (_, i) =>
        Math.max(50, Math.min(99, base + (Math.sin(i * 1.3 + line.charCodeAt(0)) * 6 | 0)))
    );
}

function buildTransitData(lines: string[]): TransitStats {
    const lineData: SubwayLine[] = lines.slice(0, 8).map(l => ({
        line: l,
        color: LINE_COLORS[l] ?? '#888888',
        reliability: fakeReliability(l),
        trend: fakeTrend(l),
    }));
    const avg = Math.round(lineData.reduce((s, l) => s + l.reliability, 0) / lineData.length);
    const worst = lineData.reduce((a, b) => a.reliability < b.reliability ? a : b);
    return {
        overallScore: avg,
        scorePrev: avg - 4,
        lines: lineData,
        topAlert: worst.reliability < 72
            ? `${worst.line} train — service running below average reliability`
            : '',
        alertLevel: worst.reliability < 65 ? 'high' : worst.reliability < 75 ? 'moderate' : 'low',
    };
}

const ALERT_STYLES = {
    low:      { bar: 'bg-emerald-500', badge: 'bg-emerald-950/50 border-emerald-800 text-emerald-400' },
    moderate: { bar: 'bg-amber-500',   badge: 'bg-amber-950/50 border-amber-800 text-amber-400'   },
    high:     { bar: 'bg-rose-500',    badge: 'bg-rose-950/50 border-rose-800 text-rose-400'       },
};

export default function TransitCard() {
    const { profile } = useNeighborhood();
    const nbLines = getLinesForNeighborhood(profile?.displayName ?? 'default');
    const { overallScore, scorePrev, lines, topAlert, alertLevel } = buildTransitData(nbLines);
    const delta = overallScore - scorePrev;
    const alert = ALERT_STYLES[alertLevel];
    const overallToken = scoreTokens[getScoreBand(overallScore)];

    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-500">Transit Score</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Subway reliability · {profile?.displayName ?? 'Your neighborhood'}</p>
                </div>
                <div className="text-right">
                    <div className="flex items-baseline gap-1">
                        {/* Non-color signal icon alongside score */}
                        <span className={`text-sm font-mono ${overallToken.text}`} aria-hidden="true">
                            {overallToken.icon}
                        </span>
                        <span className="text-3xl font-bold font-mono" style={{ color: overallToken.hex }}>
                            {overallScore}
                        </span>
                        <span className="text-zinc-500 text-sm">/100</span>
                    </div>
                    <p className={`text-[11px] font-semibold font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {delta >= 0 ? '+' : ''}{delta} vs last week
                    </p>
                </div>
            </div>

            {/* Overall score bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all motion-reduce:transition-none"
                    style={{ width: `${overallScore}%`, backgroundColor: overallToken.hex }}
                />
            </div>

            {/* Line list */}
            <div className="space-y-2.5 mb-3">
                {lines.map((l) => {
                    const lineToken = scoreTokens[getScoreBand(l.reliability)];
                    return (
                        <div key={l.line} className="flex items-center gap-3">
                            {/* MTA brand badge — color = MTA identity only */}
                            <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                                style={{ backgroundColor: l.color }}
                                aria-label={`${l.line} train`}
                            >
                                {l.line}
                            </span>

                            {/* Reliability bar — color = performance signal */}
                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full motion-reduce:transition-none"
                                    style={{ width: `${l.reliability}%`, backgroundColor: lineToken.hex }}
                                />
                            </div>

                            {/* Score: icon + number, visually separated from badge column */}
                            <div className="flex items-center gap-1 w-10 justify-end shrink-0">
                                <span className={`text-[9px] ${lineToken.text}`} aria-hidden="true">
                                    {lineToken.icon}
                                </span>
                                <span className="text-[11px] font-semibold font-mono" style={{ color: lineToken.hex }}>
                                    {l.reliability}
                                </span>
                            </div>

                            {/* Sparkline */}
                            <Sparkline
                                values={l.trend}
                                width={44}
                                height={16}
                                color={lineToken.hex}
                                fill={false}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Score band legend — non-color reinforcement */}
            <div className="flex items-center gap-3 mb-3 px-0.5">
                {(['good', 'moderate', 'poor'] as const).map(band => {
                    const t = scoreTokens[band];
                    return (
                        <span key={band} className={`flex items-center gap-1 text-[9px] font-mono ${t.text}`}>
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </span>
                    );
                })}
                <span className="text-[9px] font-mono text-zinc-700 ml-auto">reliability /100</span>
            </div>

            {/* Alert banner */}
            {topAlert && (
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[11px] ${alert.badge}`}>
                    <span className="shrink-0" aria-hidden="true">⚠️</span>
                    <span className="leading-relaxed">{topAlert}</span>
                </div>
            )}

            {/* Footer */}
            <p className="text-[10px] font-mono text-zinc-600 mt-2.5 text-right">
                MTA performance data · Updated daily
            </p>
        </div>
    );
}
