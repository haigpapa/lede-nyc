'use client';

import { useState, useRef, useCallback } from 'react';

interface DailyBriefCardProps {
    summary: string;
    timestamp: string;
}

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type NewsletterState = 'idle' | 'submitting' | 'done' | 'error';

export default function DailyBriefCard({ summary, timestamp }: DailyBriefCardProps) {
    const date = new Date(timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    const [audioState, setAudioState] = useState<AudioState>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Newsletter state
    const [email, setEmail] = useState('');
    const [newsletterState, setNewsletterState] = useState<NewsletterState>('idle');
    const [newsletterExpanded, setNewsletterExpanded] = useState(false);

    const handleNewsletterSubmit = useCallback(async () => {
        const clean = email.trim().toLowerCase();
        if (!clean || !clean.includes('@')) return;
        setNewsletterState('submitting');
        // Simulate async submit — replace with real API call in Sprint 2
        await new Promise(r => setTimeout(r, 900));
        setNewsletterState('done');
    }, [email]);

    async function handlePlayPause() {
        // If already loaded — toggle play/pause
        if (audioRef.current) {
            if (audioState === 'playing') {
                audioRef.current.pause();
                setAudioState('paused');
            } else {
                audioRef.current.play();
                setAudioState('playing');
            }
            return;
        }

        // First play — fetch from TTS API
        setAudioState('loading');
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: summary }),
            });

            if (!res.ok) throw new Error(`TTS API ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => setAudioState('idle');
            audio.onpause = () => {
                if (!audio.ended) setAudioState('paused');
            };
            audio.onerror = () => setAudioState('error');

            await audio.play();
            setAudioState('playing');
        } catch (err) {
            console.error('[DailyBriefCard] TTS error:', err);
            setAudioState('error');
        }
    }

    function handleStop() {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setAudioState('idle');
    }

    const isPlaying = audioState === 'playing';
    const isLoading = audioState === 'loading';
    const isError = audioState === 'error';
    const hasAudio = audioState !== 'idle';

    return (
        <div className="relative pl-4 pr-5 py-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 border-l-2 border-l-emerald-500 overflow-hidden"
        >

            {/* Live indicator when playing */}
            {isPlaying && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase">On Air</span>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {/* Masthead row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-emerald-400 uppercase">
                            Lede Daily Brief
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 tracking-wide">
                            NYC Construction Intelligence
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">{date}</span>
                </div>

                {/* Summary */}
                <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>

                {/* Newsletter hook */}
                <div className="border-t border-zinc-800/60 pt-3 mt-1">
                    {newsletterState === 'done' ? (
                        <p className="text-[11px] font-mono text-emerald-400">
                            ✓ You&apos;re on the list. Brief lands in your inbox tomorrow morning.
                        </p>
                    ) : newsletterExpanded ? (
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleNewsletterSubmit()}
                                placeholder="your@email.com"
                                autoFocus
                                className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-emerald-600 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                            />
                            <button
                                onClick={handleNewsletterSubmit}
                                disabled={newsletterState === 'submitting' || !email.includes('@')}
                                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0"
                            >
                                {newsletterState === 'submitting' ? '…' : 'Subscribe'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setNewsletterExpanded(true)}
                            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors group"
                        >
                            <span className="text-base leading-none group-hover:scale-110 transition-transform">✉️</span>
                            <span>Get the brief in your inbox — free, daily</span>
                            <span className="text-[10px] opacity-60">→</span>
                        </button>
                    )}
                </div>

                {/* Bottom row — CTA + audio control */}
                <div className="flex items-center justify-between mt-1">
                    {/* Read full summary — disabled until routes are built */}
                    <button
                        disabled
                        title="Full summaries coming in the next release"
                        className="text-xs font-semibold text-zinc-600 flex items-center gap-1 cursor-not-allowed opacity-50"
                    >
                        Read full summary
                        <span className="text-[10px]">→</span>
                    </button>

                    {/* Audio controls */}
                    <div className="flex items-center gap-2">
                        {isError && (
                            <span className="text-[10px] text-rose-400 font-mono">Audio unavailable</span>
                        )}

                        {/* Stop button — only show when audio is active */}
                        {hasAudio && !isError && (
                            <button
                                onClick={handleStop}
                                aria-label="Stop audio"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all motion-reduce:transition-none"
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                    <rect width="10" height="10" rx="1.5" />
                                </svg>
                            </button>
                        )}

                        {/* Play / pause / loading button */}
                        <button
                            onClick={handlePlayPause}
                            disabled={isError}
                            aria-label={isLoading ? 'Loading audio…' : isPlaying ? 'Pause brief' : 'Listen to brief'}
                            className={`
                                relative w-9 h-9 flex items-center justify-center rounded-full border transition-all motion-reduce:transition-none
                                ${isPlaying
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
                                    : isLoading
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-wait'
                                        : isError
                                            ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-emerald-600/50 hover:text-emerald-400'
                                }
                            `}
                        >
                            {isLoading ? (
                                /* Spinner */
                                <svg className="animate-spin motion-reduce:animate-none" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                        strokeDasharray="28" strokeDashoffset="20" />
                                </svg>
                            ) : isPlaying ? (
                                /* Pause icon */
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                    <rect x="1" y="0" width="3.5" height="12" rx="1.5" />
                                    <rect x="7.5" y="0" width="3.5" height="12" rx="1.5" />
                                </svg>
                            ) : (
                                /* Play icon */
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M2 1.5 L11 6 L2 10.5 Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
