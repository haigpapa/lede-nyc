import { vibeTokens, type VibeLevel } from '@/types';

interface VibeMetric {
    label: string;
    value: number;       // current 0-100
    baseline: number;    // 30-day avg 0-100 for comparison
    level: VibeLevel;    // drives color + icon from vibeTokens
}

interface VibeCardProps {
    metrics?: VibeMetric[];
}

const defaultMetrics: VibeMetric[] = [
    { label: 'Community Tension',  value: 42, baseline: 38, level: 'medium' },
    { label: 'Civic Engagement',   value: 71, baseline: 55, level: 'low'    },  // high engagement = positive → low severity
    { label: 'Noise Reports',      value: 58, baseline: 61, level: 'medium' },
];

export default function VibeCard({ metrics = defaultMetrics }: VibeCardProps) {
    return (
        <div className="relative p-5 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800 overflow-hidden">
            <div className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">🌡️</span>
                    <span className="text-[10px] font-bold tracking-[0.12em] text-zinc-400 uppercase">
                        Block Vibe Analysis
                    </span>
                </div>

                {/* Metric bars */}
                <div className="flex flex-col gap-4">
                    {metrics.map(({ label, value, baseline, level }) => {
                        const token = vibeTokens[level];
                        const delta = value - baseline;
                        const direction = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
                        const deltaText = `${delta > 0 ? '+' : ''}${delta.toFixed(0)}`;

                        return (
                            <div key={label} className="flex flex-col gap-1.5">
                                {/* Label row */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                                        <span className={`text-[10px] ${token.text}`} aria-hidden="true">
                                            {token.icon}
                                        </span>
                                        {label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Delta vs 30d baseline */}
                                        <span className={`text-[10px] font-mono ${token.text}`}>
                                            {direction}{deltaText} vs 30d
                                        </span>
                                        {/* Current value */}
                                        <span className="text-xs font-bold text-zinc-300 font-mono w-8 text-right">
                                            {value}%
                                        </span>
                                    </div>
                                </div>

                                {/* Bar track */}
                                <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    {/* Baseline tick */}
                                    <div
                                        className="absolute top-0 w-0.5 h-full bg-zinc-600 z-10"
                                        style={{ left: `${baseline}%` }}
                                        title={`30d avg: ${baseline}%`}
                                    />
                                    {/* Current value bar */}
                                    <div
                                        className={`h-full ${token.bar} rounded-full transition-all duration-700 motion-reduce:transition-none`}
                                        style={{ width: `${value}%` }}
                                    />
                                </div>

                                {/* Accessible status label */}
                                <p className="sr-only">
                                    {label}: {value}%, {token.label}. {direction} {Math.abs(delta).toFixed(0)} points vs 30-day average of {baseline}%.
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <p className="text-[9px] text-zinc-700 font-mono">
                    Vertical tick = 30d baseline · Values derived from NYC Open Data
                </p>
            </div>
        </div>
    );
}
