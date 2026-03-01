'use client';

import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import type { DiligenceReport } from '@/app/api/diligence/route';

// ── Risk theme map ─────────────────────────────────────────────────────────
const RISK = {
    low: { label: 'Low Risk', color: '#10b981', bg: 'bg-emerald-950/40 border-emerald-900/40', badge: 'bg-emerald-900/50 text-emerald-300' },
    moderate: { label: 'Moderate Risk', color: '#f59e0b', bg: 'bg-amber-950/40 border-amber-900/40', badge: 'bg-amber-900/50 text-amber-300' },
    high: { label: 'High Risk', color: '#f97316', bg: 'bg-orange-950/40 border-orange-900/40', badge: 'bg-orange-900/50 text-orange-300' },
    critical: { label: 'Critical Risk', color: '#f43f5e', bg: 'bg-rose-950/40 border-rose-900/40', badge: 'bg-rose-900/50 text-rose-300' },
};

const HPD_CLASS_LABEL: Record<string, { label: string; color: string }> = {
    A: { label: 'Class A — Minor', color: '#10b981' },
    B: { label: 'Class B — Moderate', color: '#f59e0b' },
    C: { label: 'Class C — Hazardous', color: '#f97316' },
    I: { label: 'Class I — Immediately Hazardous', color: '#f43f5e' },
};

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#f43f5e';
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    return (
        <div className="flex flex-col items-center">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="motion-reduce:[transition:none]"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                    fontSize="22" fontWeight="700" fill={color}>{score}</text>
            </svg>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Health Score</span>
        </div>
    );
}

export default function DiligencePage() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<DiligenceReport | null>(null);
    const [error, setError] = useState('');

    async function runLookup() {
        if (!address.trim()) return;
        setLoading(true);
        setError('');
        setReport(null);
        try {
            const res = await fetch(`/api/diligence?address=${encodeURIComponent(address.trim())}`);
            if (!res.ok) throw new Error(`API error ${res.status}`);
            setReport(await res.json());
        } catch (e) {
            setError('Could not fetch violation data. Check the address and try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const risk = report ? RISK[report.riskLevel] : null;

    return (
        <>
            <AppHeader overrideLabel="Building Intelligence" />
            <main className="flex-1 pb-24 space-y-4">

                {/* ── Header ── */}
                <div className="px-4 pt-4">
                    <h1 className="text-2xl font-bold text-white">Building Intelligence</h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Enter any NYC address to see its HPD &amp; DOB violation history and Landlord Health Score.
                    </p>
                </div>

                {/* ── Search ── */}
                <div className="px-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && runLookup()}
                            placeholder="e.g. 350 West 42 Street, Manhattan"
                            className="flex-1 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
                        />
                        <button
                            onClick={runLookup}
                            disabled={loading}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 text-zinc-950 font-bold px-5 py-3 rounded-xl text-sm transition-colors shrink-0"
                        >
                            {loading ? '…' : 'Look Up'}
                        </button>
                    </div>
                    {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
                </div>

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="mx-4 rounded-xl bg-zinc-900/50 border border-zinc-800 p-5 space-y-3 animate-pulse">
                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                        <div className="h-4 bg-zinc-800 rounded w-1/2" />
                        <div className="h-16 bg-zinc-800 rounded mt-4" />
                    </div>
                )}

                {/* ── Report ── */}
                {report && risk && (
                    <>
                        {/* Summary card */}
                        <div className={`mx-4 rounded-xl border p-5 ${risk.bg}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">Building Report</p>
                                    <h2 className="text-white font-bold text-base leading-snug truncate">{report.address}</h2>
                                    <span className={`inline-block mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full ${risk.badge}`}>
                                        {risk.label}
                                    </span>
                                    <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{report.summary}</p>
                                </div>
                                <ScoreGauge score={report.landlordHealthScore} />
                            </div>

                            {/* Flags */}
                            {report.flags.length > 0 && (
                                <div className="mt-4 space-y-1.5">
                                    {report.flags.map((f, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
                                            <span style={{ color: risk.color }} className="shrink-0 mt-0.5">⚑</span>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* HPD violations */}
                        <div className="mx-4 rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">HPD Violations</p>
                                <span className="text-xs text-zinc-400">{report.hpd.total} total · {report.hpd.open} open</span>
                            </div>

                            {/* Class breakdown bars */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {(['A', 'B', 'C', 'I'] as const).map(cls => {
                                    const count = report.hpd[`class${cls}` as 'classA' | 'classB' | 'classC' | 'classI'];
                                    const { color } = HPD_CLASS_LABEL[cls];
                                    return (
                                        <div key={cls} className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                                            <p className="text-xl font-bold" style={{ color }}>{count}</p>
                                            <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Class {cls}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Violation list */}
                            {report.hpd.violations.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {report.hpd.violations.map((v, i) => {
                                        const cls = HPD_CLASS_LABEL[v.class];
                                        return (
                                            <div key={i} className="border-l-2 pl-3 py-1" style={{ borderColor: cls.color }}>
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-[10px] font-bold" style={{ color: cls.color }}>{cls.label}</span>
                                                    <span className="text-[10px] text-zinc-600">{v.inspectiondate?.split('T')[0]}</span>
                                                </div>
                                                <p className="text-xs text-zinc-400 leading-snug">{v.novdescription}</p>
                                                {!v.closedate && (
                                                    <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wide">Open</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-zinc-600 text-xs text-center py-4">No HPD violations on record.</p>
                            )}
                        </div>

                        {/* DOB violations */}
                        <div className="mx-4 rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">DOB Violations</p>
                                <span className="text-xs text-zinc-400">{report.dob.total} total · {report.dob.open} open</span>
                            </div>
                            {report.dob.violations.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {report.dob.violations.map((v, i) => (
                                        <div key={i} className="border-l-2 border-amber-700/50 pl-3 py-1">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-[10px] text-amber-400 font-semibold">{v.violation_type_code}</span>
                                                <span className="text-[10px] text-zinc-600">{v.issue_date?.split('T')[0]}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 leading-snug">{v.description}</p>
                                            {!v.disposition_date && (
                                                <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wide">Open</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-zinc-600 text-xs text-center py-4">No DOB violations on record.</p>
                            )}
                        </div>

                        {/* Data provenance */}
                        <div className="mx-4 px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-600 leading-relaxed">
                                Data sourced from <span className="text-zinc-400">NYC Open Data</span> — HPD Violations (dataset: wvxf-dwi5) and DOB Violations (dataset: 3h2n-5cm9). Updated in real time. Queried: {new Date(report.queriedAt).toLocaleString()}.
                            </p>
                        </div>
                    </>
                )}

                {/* ── Empty state ── */}
                {!report && !loading && !error && (
                    <div className="mx-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                        <p className="text-4xl mb-3">🏢</p>
                        <p className="text-white font-semibold mb-1">Know Before You Sign</p>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Look up any NYC address to see its full violation history, open complaints, and Landlord Health Score — before you rent or buy.
                        </p>
                        <div className="mt-4 space-y-1.5 text-left max-w-xs mx-auto">
                            {['350 West 42 Street', '1500 Broadway', '420 Kent Avenue, Brooklyn'].map(addr => (
                                <button
                                    key={addr}
                                    onClick={() => { setAddress(addr); }}
                                    className="w-full text-left text-xs text-zinc-400 hover:text-emerald-400 transition-colors py-1 px-2 rounded border border-zinc-800 hover:border-emerald-900"
                                >
                                    Try: {addr}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
