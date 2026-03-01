'use client';

import AppHeader from '@/components/AppHeader';
import { useNeighborhood } from '@/context/NeighborhoodContext';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
    const { profile, clearProfile } = useNeighborhood();
    const router = useRouter();

    function handleReset() {
        clearProfile();
        router.replace('/onboard');
    }

    return (
        <>
            <AppHeader overrideLabel="Search & Settings" />
            <main className="flex-1 p-4 pb-24 space-y-4">
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                    <input
                        type="text"
                        placeholder="Search neighborhoods, addresses, topics..."
                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl pl-9 pr-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                {/* Current neighborhood */}
                {profile && (
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase mb-3">Your Neighborhood</p>
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40">
                            <div className="flex items-center gap-2.5">
                                <span className="text-sm">📍</span>
                                <div>
                                    <span className="text-sm font-medium text-zinc-200">{profile.displayName}</span>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{profile.borough} · {profile.zip}</p>
                                </div>
                            </div>
                            <span className="text-xs text-emerald-400 font-semibold">Active</span>
                        </div>
                    </div>
                )}

                {/* Interests */}
                {profile && profile.interests.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase mb-2">Tracking</p>
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map(i => (
                                <span key={i} className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full font-medium capitalize">
                                    {i}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add second neighborhood — teaser */}
                <div className="rounded-xl border border-dashed border-zinc-800 p-4 flex items-center gap-3">
                    <span className="text-2xl">＋</span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-zinc-400">Track a second neighborhood</p>
                        <p className="text-xs text-zinc-600 mt-0.5">Where you work, where you want to move — coming in Sprint 3.</p>
                    </div>
                </div>

                {/* Reset onboarding */}
                <button
                    onClick={handleReset}
                    className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-3 border border-zinc-800 rounded-xl"
                >
                    Change neighborhood →
                </button>
            </main>
        </>
    );
}
