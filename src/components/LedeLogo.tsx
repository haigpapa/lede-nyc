'use client';

import { useEffect, useState } from 'react';

interface LedeLogoProps {
    animated?: boolean;   // true = full intro animation, false = static wordmark
    size?: 'sm' | 'md' | 'lg';
}

const LETTERS = ['L', 'E', 'D', 'E'];
const STAGGER_MS = 120;

export default function LedeLogo({ animated = false, size = 'lg' }: LedeLogoProps) {
    const [visibleCount, setVisibleCount] = useState(animated ? 0 : LETTERS.length);
    const [showDot, setShowDot] = useState(!animated);
    const [showNyc, setShowNyc] = useState(!animated);
    const [pulseActive, setPulseActive] = useState(false);
    const [pulseScale, setPulseScale] = useState(false);

    useEffect(() => {
        if (!animated) return;

        // Stagger letters in
        LETTERS.forEach((_, i) => {
            setTimeout(() => setVisibleCount(i + 1), 300 + i * STAGGER_MS);
        });

        // Dot appears after letters
        const dotDelay = 300 + LETTERS.length * STAGGER_MS + 100;
        setTimeout(() => setShowDot(true), dotDelay);

        // .nyc appears
        setTimeout(() => setShowNyc(true), dotDelay + 150);

        // Signal pulse radiates outward
        setTimeout(() => {
            setPulseActive(true);
            setPulseScale(true);
            setTimeout(() => setPulseScale(false), 800);
        }, dotDelay + 400);

    }, [animated]);

    const textSize = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-xl';
    const nycSize = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm';

    return (
        <div className="relative flex items-baseline gap-0 select-none">
            {/* Signal pulse rings — radiate from the dot */}
            {pulseActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`absolute rounded-full border border-emerald-500/30 transition-all duration-700 motion-reduce:transition-none ${pulseScale ? 'scale-[3] opacity-0' : 'scale-100 opacity-100'}`}
                        style={{ width: 12, height: 12 }} />
                    <div className={`absolute rounded-full border border-emerald-500/20 transition-all duration-1000 delay-100 motion-reduce:transition-none ${pulseScale ? 'scale-[5] opacity-0' : 'scale-100 opacity-100'}`}
                        style={{ width: 12, height: 12 }} />
                </div>
            )}

            {/* LEDE letters — each slides up and fades in */}
            <div className={`flex font-bold tracking-tight ${textSize}`}>
                {LETTERS.map((letter, i) => (
                    <span
                        key={i}
                        className={`text-white transition-all duration-300 motion-reduce:transition-none ${visibleCount > i
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2'
                        }`}
                        style={{ transitionDelay: animated ? `${i * STAGGER_MS}ms` : '0ms' }}
                    >
                        {letter}
                    </span>
                ))}
            </div>

            {/* Dot separator */}
            <span
                className={`font-bold text-emerald-400 transition-all duration-200 motion-reduce:transition-none ${textSize} ${showDot ? 'opacity-100' : 'opacity-0'}`}
            >
                .
            </span>

            {/* nyc */}
            <span
                className={`font-bold text-zinc-500 transition-all duration-300 motion-reduce:transition-none ${nycSize} ${showNyc ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}
            >
                nyc
            </span>
        </div>
    );
}
