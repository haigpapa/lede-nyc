// Canonical card color triad — matches deck: Emerald=Growth, Amber=Friction, Rose=Disruption
// sky and violet are retained in accentMap for non-card UI use only
export type AccentColor = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

export interface AccentTheme {
    bg: string;
    text: string;
    dot: string;
    btn: string;
    shadow: string;
    hex: string;      // raw hex for use in SVG / inline styles
    border: string;   // Tailwind border-l color for editorial left-rule accent
}

export const accentMap: Record<AccentColor, AccentTheme> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', btn: 'bg-emerald-400 hover:bg-emerald-500', shadow: 'rgba(52,211,153,0.12)',  hex: '#34d399', border: 'border-emerald-500' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   btn: 'bg-amber-400 hover:bg-amber-500',   shadow: 'rgba(251,191,36,0.12)',   hex: '#fbbf24', border: 'border-amber-500'   },
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     btn: 'bg-sky-400 hover:bg-sky-500',       shadow: 'rgba(56,189,248,0.12)',   hex: '#38bdf8', border: 'border-sky-500'     },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  dot: 'bg-violet-400',  btn: 'bg-violet-400 hover:bg-violet-500', shadow: 'rgba(167,139,250,0.12)', hex: '#a78bfa',  border: 'border-violet-500'  },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    dot: 'bg-rose-400',    btn: 'bg-rose-400 hover:bg-rose-500',     shadow: 'rgba(251,113,133,0.12)', hex: '#fb7185',  border: 'border-rose-500'    },
};

// ── Shared performance-score tokens (replaces scoreColor() in TransitCard) ────
// Maps numeric score bands → hex color + Tailwind text class + label
export type ScoreBand = 'good' | 'moderate' | 'poor';

export interface ScoreToken {
    hex: string;
    text: string;    // Tailwind text color class
    label: string;   // Accessible text label
    icon: string;    // Supplementary non-color signal
}

export const scoreTokens: Record<ScoreBand, ScoreToken> = {
    good:     { hex: '#10b981', text: 'text-emerald-400', label: 'Good',     icon: '▲' },
    moderate: { hex: '#f59e0b', text: 'text-amber-400',   label: 'Fair',     icon: '◆' },
    poor:     { hex: '#f43f5e', text: 'text-rose-400',    label: 'Poor',     icon: '▼' },
};

export function getScoreBand(score: number): ScoreBand {
    if (score >= 80) return 'good';
    if (score >= 70) return 'moderate';
    return 'poor';
}

// ── Shared vibe / mood metric tokens (replaces inline hex in VibeCard) ────────
export type VibeLevel = 'low' | 'medium' | 'high';

export interface VibeToken {
    hex: string;
    bar: string;     // Tailwind bg class
    text: string;    // Tailwind text class
    icon: string;    // Supplementary non-color signal
    label: string;   // Accessible text label
}

export const vibeTokens: Record<VibeLevel, VibeToken> = {
    low:    { hex: '#10b981', bar: 'bg-emerald-400', text: 'text-emerald-400', icon: '●', label: 'Low'    },
    medium: { hex: '#f59e0b', bar: 'bg-amber-400',   text: 'text-amber-400',   icon: '◆', label: 'Medium' },
    high:   { hex: '#f43f5e', bar: 'bg-rose-400',    text: 'text-rose-400',    icon: '▲', label: 'High'   },
};

export interface LedeCardData {
    category: string;
    emoji: string;
    headline: string;
    bullets: string[];
    accentColor: AccentColor;
    timestamp: string;
    imageSrc?: string;
    sqlQuery?: string;
    trend?: number[];
    trendColor?: string;  // hex color for sparkline, defaults to accent
    mapFocus?: string;  // borough or neighborhood name → deeplinks to /atlas?focus=X
    borough?: string;   // "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"
    // Provenance fields (injected by pipeline)
    dataWindow?: string;         // e.g. "past 7 days"
    provenanceRowCount?: number; // how many anomaly rows matched
    provenanceSampleId?: string; // e.g. "ZIP 10036 · job_type NB"
    provenanceIngestedAt?: string; // ISO timestamp of pipeline run
}

// Feed envelope — wraps cards with pipeline run metadata
export interface FeedMeta {
    runId: string;
    generatedAt: string;    // ISO timestamp of pipeline run
    dataWindow: string;     // e.g. "past 7 days"
    source: string;         // e.g. "NYC DOB Permits via BigQuery"
    borough: string;        // e.g. "Manhattan"
}

export interface FeedPayload {
    meta: FeedMeta;
    cards: LedeCardData[];
}
