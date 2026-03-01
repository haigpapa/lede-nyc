'use client';

import { Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import dynamic from 'next/dynamic';
import { permitsGeo } from '@/data/permits-geo';

// Three.js + Google Maps WebGL require browser APIs — SSR disabled
const Atlas3DMap = dynamic(() => import('@/components/Atlas3DMap'), {
    ssr: false,
    loading: () => (
        <div className="flex-1 mx-4 min-h-[400px] rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Initializing 3D Atlas…
            </div>
        </div>
    ),
});

const counts = permitsGeo.reduce<Record<string, number>>((acc, p) => { acc[p.jobType] = (acc[p.jobType] ?? 0) + 1; return acc; }, {});
const nbCount = counts['NB'] ?? 0;
const altCount = (counts['A1'] ?? 0) + (counts['A2'] ?? 0);
const dmCount = counts['DM'] ?? 0;

export default function AtlasPage() {
    return (
        <>
            <AppHeader overrideLabel="Tactical Atlas" />

            {/* Stats strip */}
            <div className="flex px-4 pt-3 pb-2 gap-3">
                <div className="flex-1 rounded-xl bg-emerald-950/40 border border-emerald-900/50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{nbCount}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-widest mt-0.5">New Buildings</p>
                </div>
                <div className="flex-1 rounded-xl bg-amber-950/40 border border-amber-900/50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{altCount}</p>
                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-widest mt-0.5">Alterations</p>
                </div>
                <div className="flex-1 rounded-xl bg-rose-950/40 border border-rose-900/50 p-3 text-center">
                    <p className="text-2xl font-bold text-rose-400">{dmCount}</p>
                    <p className="text-[10px] text-rose-700 font-semibold uppercase tracking-widest mt-0.5">Demolitions</p>
                </div>
            </div>

            {/* Map — Suspense required for useSearchParams inside AtlasMap */}
            <main className="flex flex-col flex-1 pb-24">
                <Suspense fallback={
                    <div className="flex-1 mx-4 min-h-[400px] rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-500 text-sm">Loading…</span>
                    </div>
                }>
                    <Atlas3DMap className="flex-1" />
                </Suspense>
            </main>
        </>
    );
}
