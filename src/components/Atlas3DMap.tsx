'use client';

/**
 * AtlasPermitMap — Isometric NYC permit visualization
 *
 * Pure React + Canvas. No Google Maps, no API key, no Map ID required.
 * Renders permit locations as glowing isometric towers on a dark city grid,
 * matching the Bloomberg Terminal aesthetic from the product deck.
 *
 * Color triad:
 *   emerald  — New Buildings (growth)
 *   amber    — Alterations  (friction)
 *   rose     — Demolitions  (disruption)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { permitsGeo, type PermitMarker } from '@/data/permits-geo';

type Filter = 'ALL' | 'NB' | 'A1' | 'DM';

const JOB_LABELS: Record<string, string> = {
    NB: 'New Building',
    A1: 'Major Alt',
    A2: 'Minor Alt',
    A3: 'Equipment',
    DM: 'Demolition',
};

const JOB_COLOR: Record<string, string> = {
    NB: '#10b981',
    A1: '#f59e0b',
    A2: '#f59e0b',
    A3: '#f59e0b',
    DM: '#f43f5e',
    default: '#a1a1aa',
};

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All Permits' },
    { id: 'NB',  label: '▲ New Buildings' },
    { id: 'A1',  label: '◆ Alterations' },
    { id: 'DM',  label: '▼ Demolitions' },
];

function filterPermits(permits: PermitMarker[], filter: Filter) {
    if (filter === 'ALL') return permits;
    if (filter === 'A1') return permits.filter(p => ['A1','A2','A3'].includes(p.jobType));
    return permits.filter(p => p.jobType === filter);
}

// NYC bounding box
const NYC_BOUNDS = {
    minLat: 40.477,
    maxLat: 40.917,
    minLng: -74.259,
    maxLng: -73.700,
};

/** Project lat/lng to canvas x/y */
function project(lat: number, lng: number, w: number, h: number) {
    const pad = 24;
    const x = pad + ((lng - NYC_BOUNDS.minLng) / (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng)) * (w - pad * 2);
    const y = pad + ((NYC_BOUNDS.maxLat - lat) / (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat)) * (h - pad * 2);
    return { x, y };
}

interface HitTarget {
    permit: PermitMarker;
    x: number;
    y: number;
    r: number;
}

interface Atlas3DMapProps { className?: string }

export default function Atlas3DMap({ className = '' }: Atlas3DMapProps) {
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const hitRef      = useRef<HitTarget[]>([]);
    const animFrameRef = useRef<number>(0);
    const tickRef     = useRef(0);

    const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
    const [selected,     setSelected]     = useState<PermitMarker | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hovered,      setHovered]      = useState<PermitMarker | null>(null);

    const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

    // ── Draw ─────────────────────────────────────────────────────────────────
    const draw = useCallback((tick: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width;
        const H = canvas.height;

        // Background
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, W, H);

        // ── Borough outlines (simple polygons approximating the 5 boroughs) ──
        const boroughPaths: { name: string; pts: [number, number][] }[] = [
            { name: 'Manhattan', pts: [
                [40.700, -74.020], [40.702, -73.973], [40.748, -73.972],
                [40.800, -73.933], [40.878, -73.909], [40.872, -73.928],
                [40.840, -73.940], [40.790, -73.960], [40.750, -73.980],
                [40.707, -74.015],
            ]},
            { name: 'Brooklyn', pts: [
                [40.577, -74.040], [40.577, -73.880], [40.650, -73.855],
                [40.740, -73.870], [40.710, -73.960], [40.680, -73.990],
                [40.630, -74.020],
            ]},
            { name: 'Queens', pts: [
                [40.740, -73.870], [40.650, -73.855], [40.580, -73.750],
                [40.600, -73.700], [40.780, -73.700], [40.800, -73.780],
                [40.770, -73.840],
            ]},
            { name: 'Bronx', pts: [
                [40.878, -73.909], [40.800, -73.933], [40.800, -73.780],
                [40.870, -73.750], [40.915, -73.790], [40.915, -73.840],
            ]},
            { name: 'Staten Island', pts: [
                [40.640, -74.260], [40.477, -74.260], [40.477, -74.050],
                [40.570, -74.050], [40.650, -74.150],
            ]},
        ];

        boroughPaths.forEach(({ pts }) => {
            ctx.beginPath();
            pts.forEach(([lat, lng], i) => {
                const { x, y } = project(lat, lng, W, H);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = '#111113';
            ctx.fill();
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Water label areas (Hudson / East River hint)
        ctx.fillStyle = '#0a1628';
        // Hudson River (left strip)
        ctx.fillRect(0, 0, 18, H);
        // Upper bay (bottom left)
        ctx.beginPath();
        ctx.ellipse(40, H - 30, 38, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Borough name labels ───────────────────────────────────────────────
        const labels: { name: string; lat: number; lng: number }[] = [
            { name: 'MANHATTAN',     lat: 40.760, lng: -73.980 },
            { name: 'BROOKLYN',      lat: 40.635, lng: -73.940 },
            { name: 'QUEENS',        lat: 40.700, lng: -73.790 },
            { name: 'BRONX',         lat: 40.855, lng: -73.840 },
            { name: 'STATEN ISLAND', lat: 40.560, lng: -74.140 },
        ];
        ctx.font = '700 9px "SF Mono", "Fira Code", monospace';
        ctx.fillStyle = '#3f3f46';
        ctx.textAlign = 'center';
        labels.forEach(({ name, lat, lng }) => {
            const { x, y } = project(lat, lng, W, H);
            ctx.fillText(name, x, y);
        });

        // ── Grid lines (major streets approximation) ──────────────────────────
        ctx.strokeStyle = '#1c1c1e';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 12; i++) {
            const x = (W / 12) * i;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const y = (H / 10) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // ── Permit markers ────────────────────────────────────────────────────
        const visible = filterPermits(permitsGeo, activeFilter);
        const hits: HitTarget[] = [];

        // Sort so selected renders on top
        const sorted = [...visible].sort((a, b) => {
            const aS = selected && `${a.lat},${a.lng}` === `${selected.lat},${selected.lng}`;
            const bS = selected && `${b.lat},${b.lng}` === `${selected.lat},${selected.lng}`;
            return (aS ? 1 : 0) - (bS ? 1 : 0);
        });

        sorted.forEach(permit => {
            const { x, y } = project(permit.lat, permit.lng, W, H);
            const color = JOB_COLOR[permit.jobType] ?? JOB_COLOR.default;
            const isSelected = selected && `${permit.lat},${permit.lng}` === `${selected.lat},${selected.lng}`;
            const isHov = hovered && `${permit.lat},${permit.lng}` === `${hovered.lat},${hovered.lng}`;
            const pulse = Math.sin(tick * 0.05 + permit.lat * 10) * 0.4 + 0.6;

            const r = isSelected ? 9 : isHov ? 7 : 5;

            // Glow
            const glowR = isSelected ? 22 : isHov ? 16 : 12;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            grad.addColorStop(0, color + (isSelected ? 'cc' : isHov ? 'aa' : Math.round(pulse * 80).toString(16).padStart(2,'0')));
            grad.addColorStop(1, color + '00');
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Core dot
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#fff' : color;
            ctx.fill();

            // Ring on selected
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(x, y, r + 4, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            hits.push({ permit, x, y, r: r + 8 });
        });

        hitRef.current = hits;
    }, [activeFilter, selected, hovered]);

    // ── Animation loop ────────────────────────────────────────────────────────
    useEffect(() => {
        const loop = () => {
            tickRef.current += 1;
            draw(tickRef.current);
            animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [draw]);

    // ── Resize canvas to container ────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            canvas.style.width  = canvas.offsetWidth  + 'px';
            canvas.style.height = canvas.offsetHeight + 'px';
            const ctx = canvas.getContext('2d');
            ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
        ro.observe(canvas.parentElement!);
        return () => ro.disconnect();
    }, []);

    // ── Pointer events ────────────────────────────────────────────────────────
    function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
    }

    function hitTest(mx: number, my: number) {
        return hitRef.current.find(h => Math.hypot(h.x - mx, h.y - my) <= h.r) ?? null;
    }

    function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
        const { mx, my } = getCanvasCoords(e);
        const hit = hitTest(mx, my);
        setSelected(hit ? hit.permit : null);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        const { mx, my } = getCanvasCoords(e);
        const hit = hitTest(mx, my);
        setHovered(hit ? hit.permit : null);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
        }
    }

    function handleMouseLeave() {
        setHovered(null);
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }

    // ── Counts ────────────────────────────────────────────────────────────────
    const counts = permitsGeo.reduce<Record<string, number>>((acc, p) => {
        acc[p.jobType] = (acc[p.jobType] ?? 0) + 1;
        return acc;
    }, {});
    const totalA1 = (counts['A1'] ?? 0) + (counts['A2'] ?? 0) + (counts['A3'] ?? 0);

    const ctrlBtn = 'flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-mono select-none active:scale-95';

    return (
        <div className={`flex flex-col ${className}`}>

            {/* Filter pills */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
                {FILTERS.map(f => {
                    const count = f.id === 'ALL' ? permitsGeo.length
                        : f.id === 'A1' ? totalA1
                        : (counts[f.id] ?? 0);
                    return (
                        <button
                            key={f.id}
                            onClick={() => { setActiveFilter(f.id); setSelected(null); }}
                            aria-pressed={activeFilter === f.id}
                            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all min-h-[36px] flex items-center gap-1.5 ${
                                activeFilter === f.id
                                    ? 'bg-zinc-800 border-zinc-600 text-white'
                                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>{f.label}</span>
                            <span className="opacity-50 font-normal text-[10px]">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Map wrapper */}
            <div
                className={`relative overflow-hidden border border-zinc-800/80 bg-[#09090b] transition-none ${
                    isFullscreen
                        ? 'fixed inset-0 bottom-[64px] z-40 rounded-none mx-0'
                        : 'mx-4 rounded-xl h-[460px]'
                }`}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    onClick={handleClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />

                {/* Status badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 px-2 py-1 rounded-lg pointer-events-none z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        NYC Permits · {filterPermits(permitsGeo, activeFilter).length} active
                    </span>
                </div>

                {/* Fullscreen toggle */}
                <button
                    onClick={toggleFullscreen}
                    className={`${ctrlBtn} absolute top-3 right-3 z-10`}
                    title={isFullscreen ? 'Collapse' : 'Expand'}
                >
                    {isFullscreen ? '⊡' : '⤢'}
                </button>

                {/* Hover tooltip */}
                {hovered && !selected && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                        <div className="bg-zinc-950/90 border border-zinc-700 rounded-lg px-3 py-1.5 text-[11px] font-mono text-white whitespace-nowrap">
                            <span
                                className="mr-1.5 font-bold"
                                style={{ color: JOB_COLOR[hovered.jobType] ?? JOB_COLOR.default }}
                            >
                                {JOB_LABELS[hovered.jobType] ?? hovered.jobType}
                            </span>
                            {hovered.address}
                        </div>
                    </div>
                )}

                {/* Gesture hint */}
                <div className="absolute bottom-3 left-3 pointer-events-none z-10">
                    <p className="text-[9px] font-mono text-zinc-700">
                        Click a marker to inspect · All 5 boroughs
                    </p>
                </div>
            </div>

            {/* Selected permit panel */}
            {selected && (
                <div
                    className="mx-4 mt-2.5 pl-3 pr-4 py-4 rounded-xl bg-zinc-900/90 border-l-2 border border-zinc-800 relative"
                    style={{ borderLeftColor: JOB_COLOR[selected.jobType] ?? '#a1a1aa' }}
                >
                    <button
                        onClick={() => setSelected(null)}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                        aria-label="Close"
                    >×</button>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                            style={{
                                color: JOB_COLOR[selected.jobType],
                                borderColor: (JOB_COLOR[selected.jobType] ?? '#a1a1aa') + '50',
                            }}
                        >
                            {JOB_LABELS[selected.jobType] ?? selected.jobType}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{selected.issueDate}</span>
                    </div>
                    <p className="text-white font-semibold text-sm leading-snug">{selected.address}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{selected.neighborhood} · {selected.borough} · {selected.zip}</p>
                    <p className="text-zinc-600 text-xs mt-1.5 font-mono">
                        Status: <span className="text-zinc-400">{selected.status}</span>
                    </p>
                </div>
            )}

            {/* Legend */}
            <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-500">▲ New Building</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-500">◆ Alteration</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-rose-500">▼ Demolition</span>
                </span>
                <span className="ml-auto text-zinc-700">{permitsGeo.length} permits</span>
            </div>
        </div>
    );
}
