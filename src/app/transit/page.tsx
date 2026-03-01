'use client';

import { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import Sparkline from '@/components/Sparkline';
import type { MtaStatusResponse, LineStatus } from '@/app/api/mta-status/route';
import type { MtaTrendResponse } from '@/app/api/mta-trend/route';

// 8-week seed trends — used as fallback while BigQuery data accumulates
const LINE_HISTORY_SEED: Record<string, number[]> = {
    A: [75, 71, 78, 80, 76, 74, 79, 82],
    C: [80, 77, 72, 68, 71, 73, 70, 74],
    E: [76, 78, 80, 77, 75, 78, 76, 79],
    '1': [72, 74, 79, 81, 78, 80, 77, 81],
    '2': [70, 73, 75, 72, 74, 76, 75, 78],
    '3': [68, 70, 72, 69, 71, 73, 72, 75],
    N: [74, 72, 68, 65, 67, 70, 66, 69],
    Q: [78, 75, 70, 68, 71, 73, 71, 72],
    R: [77, 74, 72, 70, 73, 75, 72, 74],
    W: [75, 72, 70, 68, 71, 72, 70, 73],
    '7': [80, 78, 76, 79, 81, 78, 82, 83],
};

function SeverityDot({ sev }: { sev: LineStatus['severity'] }) {
    const colors = { good: '#10b981', minor: '#f59e0b', major: '#f43f5e' };
    return <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: colors[sev] }} />;
}

function OverallScore({ lines }: { lines: LineStatus[] }) {
    const avg = Math.round(lines.reduce((s, l) => s + l.reliability, 0) / lines.length);
    const color = avg >= 80 ? '#10b981' : avg >= 65 ? '#f59e0b' : '#f43f5e';
    const r = 34;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - avg / 100);
    return (
        <div className="flex items-center gap-3">
            <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
                <circle
                    cx="38" cy="38" r={r} fill="none"
                    stroke={color} strokeWidth="6"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round" transform="rotate(-90 38 38)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="38" y="38" textAnchor="middle" dominantBaseline="central"
                    fontSize="18" fontWeight="700" fill={color}>{avg}</text>
            </svg>
            <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Transit Score</p>
                <p className="text-white font-semibold text-sm">Hell&apos;s Kitchen</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                    {avg >= 80 ? 'Running smoothly' : avg >= 65 ? 'Minor disruptions' : 'Significant delays'}
                </p>
            </div>
        </div>
    );
}

export default function TransitPage() {
    const [data, setData] = useState<MtaStatusResponse | null>(null);
    const [usingRealTrend, setUsingRealTrend] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/mta-status').then(r => r.json()) as Promise<MtaStatusResponse>,
            fetch('/api/mta-trend').then(r => r.json()).catch(() => null) as Promise<MtaTrendResponse | null>,
        ]).then(([statusData, trendData]) => {
            // Build a map of line → real historical scores from BigQuery
            const realTrends: Record<string, number[]> = {};
            let hasRealData = false;
            if (trendData?.trends) {
                for (const t of trendData.trends) {
                    if (t.scores.length >= 2) {
                        realTrends[t.line] = t.scores;
                        hasRealData = true;
                    }
                }
            }

            // Inject trend arrays — real BigQuery data ≥ 2pts, else seed fallback
            statusData.lines = statusData.lines.map(l => ({
                ...l,
                trend: realTrends[l.line] ?? LINE_HISTORY_SEED[l.line] ?? [],
            }));

            setData(statusData);
            setUsingRealTrend(hasRealData);
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const hasAlerts = data?.lines.some(l => l.alerts.length > 0 || l.severity !== 'good');


    return (
        <>
            <AppHeader />
            <main className="flex-1 pb-24">

                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                    <h1 className="text-2xl font-bold text-white">Transit</h1>
                    <p className="text-zinc-500 text-xs mt-0.5 font-mono">Subway reliability · your neighborhood lines</p>
                </div>

                {/* Overall score */}
                {loading ? (
                    <div className="mx-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 h-24 animate-pulse" />
                ) : data && (
                    <div className="mx-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                        <OverallScore lines={data.lines} />
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Source</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                {data.source === 'live' ? '🟢 Live MTA' : '🟡 Cached'}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: usingRealTrend ? '#10b981' : '#71717a' }}>
                                {usingRealTrend ? '📈 Real trend' : '📊 Seeded'}
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-1">
                                {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Alert banner */}
                {hasAlerts && (
                    <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-900/40 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                        <p className="text-amber-300 text-xs leading-relaxed">
                            {data?.lines.filter(l => l.severity !== 'good').map(l =>
                                `${l.line} train: ${l.status}`
                            ).join(' · ')}
                        </p>
                    </div>
                )}

                {/* Line cards */}
                <div className="px-4 mt-3 space-y-2">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase mb-2">Line Reliability (8-week)</p>

                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
                        ))
                    ) : data?.lines.map(line => (
                        <div key={line.line}
                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">

                            {/* Circle badge */}
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
                                style={{ backgroundColor: line.color }}
                            >
                                {line.line}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <SeverityDot sev={line.severity} />
                                        <span className="text-xs font-semibold text-white">{line.line} Train</span>
                                        <span className={`text-[10px] ${line.severity === 'good' ? 'text-emerald-400' : line.severity === 'minor' ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {line.status}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums ${line.reliability >= 80 ? 'text-emerald-400' : line.reliability >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {line.reliability}
                                    </span>
                                </div>

                                {/* Reliability bar */}
                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${line.reliability}%`,
                                            backgroundColor: line.reliability >= 80 ? '#10b981' : line.reliability >= 65 ? '#f59e0b' : '#f43f5e',
                                        }}
                                    />
                                </div>

                                {/* Alerts */}
                                {line.alerts.length > 0 && (
                                    <p className="text-[10px] text-amber-400 truncate">{line.alerts[0]}</p>
                                )}
                            </div>

                            {/* Sparkline */}
                            {line.trend.length >= 2 && (
                                <Sparkline
                                    values={line.trend}
                                    width={56}
                                    height={24}
                                    color={line.color}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                {data && (
                    <p className="text-center text-[10px] text-zinc-700 mt-4 px-4">
                        Powered by{' '}
                        <a href="https://goodservice.io" target="_blank" rel="noopener noreferrer"
                            className="text-zinc-500 underline">goodservice.io</a>
                        {' '}· MTA GTFS-RT
                    </p>
                )}
            </main>
        </>
    );
}
