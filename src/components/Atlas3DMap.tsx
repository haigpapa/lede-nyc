'use client';

/**
 * Atlas3DMap — Google Maps with AdvancedMarkerElement permit pins
 *
 * Uses AdvancedMarkerElement (no Map ID or WebGL required) for reliable
 * colored permit pins in the emerald/amber/rose design triad.
 *
 * - In-app fullscreen (fills header→bottom nav within the 430px shell)
 * - Tilt/heading/zoom controls
 * - Filter by job type
 * - Click marker to see permit detail panel
 * - All POI, transit, and admin labels stripped via map styles
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { permitsGeo, type PermitMarker } from '@/data/permits-geo';

type Filter = 'ALL' | 'NB' | 'A1' | 'DM';

const JOB_LABELS: Record<string, string> = {
    NB: 'New Building',
    A1: 'Major Alt',
    A2: 'Minor Alt',
    A3: 'Equipment',
    DM: 'Demolition',
    SG: 'Sign',
    EW: 'Earthwork',
    BL: 'Boiler',
    FP: 'Fire Suppression',
    EQ: 'Equipment',
    PL: 'Plumbing',
};

// Color triad — matches design system
const JOB_COLOR_HEX: Record<string, string> = {
    NB: '#10b981',   // emerald — Growth
    A1: '#f59e0b',   // amber   — Friction
    A2: '#f59e0b',   // amber
    A3: '#f59e0b',   // amber
    DM: '#f43f5e',   // rose    — Disruption
    default: '#a1a1aa',
};

// Strip POI, transit, admin labels from the map
const STRIPPED_MAP_STYLES = [
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.man_made', elementType: 'all', stylers: [{ visibility: 'simplified' }] },
    // Dark base
    { elementType: 'geometry', stylers: [{ color: '#1c1c1e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d2f' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3a3a3c' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a4a4c' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#141416' }] },
    { featureType: 'park', elementType: 'geometry', stylers: [{ color: '#0f1f0f' }] },
];

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All Permits' },
    { id: 'NB',  label: '▲ New Buildings' },
    { id: 'A1',  label: '◆ Alterations' },
    { id: 'DM',  label: '▼ Demolitions' },
];

function filterPermits(permits: PermitMarker[], filter: Filter) {
    if (filter === 'ALL') return permits;
    if (filter === 'A1') return permits.filter(p => p.jobType === 'A1' || p.jobType === 'A2' || p.jobType === 'A3');
    return permits.filter(p => p.jobType === filter);
}

/** Build a colored SVG pin element for AdvancedMarkerElement */
function buildPinElement(jobType: string, highlight = false): HTMLElement {
    const color = JOB_COLOR_HEX[jobType] ?? JOB_COLOR_HEX.default;
    const size = highlight ? 18 : 12;
    const el = document.createElement('div');
    el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid ${highlight ? '#fff' : color + 'aa'};
        box-shadow: 0 0 ${highlight ? 10 : 6}px ${color}88;
        cursor: pointer;
        transition: all 0.15s ease;
    `;
    return el;
}

interface Atlas3DMapProps { className?: string }

export default function Atlas3DMap({ className = '' }: Atlas3DMapProps) {
    const searchParams = useSearchParams();
    const focusNeighbor = searchParams.get('focus');

    const mapRef      = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstance = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef  = useRef<Map<string, { marker: any; permit: PermitMarker }>>(new Map());

    const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
    const [selected,     setSelected]     = useState<PermitMarker | null>(null);
    const [loaded,       setLoaded]       = useState(false);
    const [apiError,     setApiError]     = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ── Fullscreen: expand within the app shell ───────────────────────────────
    const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

    // ── Camera controls ───────────────────────────────────────────────────────
    function adjustTilt(delta: number) {
        const map = mapInstance.current;
        if (!map) return;
        const current = (map.getTilt?.() as number | undefined) ?? 45;
        map.setTilt(Math.min(67.5, Math.max(0, current + delta)));
    }

    function adjustHeading(delta: number) {
        const map = mapInstance.current;
        if (!map) return;
        const current = (map.getHeading?.() as number | undefined) ?? 0;
        map.setHeading((current + delta + 360) % 360);
    }

    function resetView() {
        const map = mapInstance.current;
        if (!map) return;
        map.setTilt(45);
        map.setHeading(0);
        map.setZoom(12);
    }

    // ── Map initialisation ────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) { setApiError(true); return; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps) {
            initMap();
            return;
        }

        const script = document.createElement('script');
        // Include 'marker' library for AdvancedMarkerElement
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=beta`;
        script.async = true;
        script.defer = true;
        script.onload  = () => initMap();
        script.onerror = () => setApiError(true);
        document.head.appendChild(script);

        async function initMap() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const google = (window as any).google;
            if (!google?.maps || !mapRef.current) return;

            // Determine center from focus param or default to Manhattan
            let center = { lat: 40.7580, lng: -73.9855 }; // Midtown Manhattan
            if (focusNeighbor) {
                const match = permitsGeo.find(p =>
                    p.neighborhood.toLowerCase().includes(focusNeighbor.toLowerCase()) ||
                    p.borough.toLowerCase().includes(focusNeighbor.toLowerCase())
                );
                if (match) center = { lat: match.lat, lng: match.lng };
            }

            const map = new google.maps.Map(mapRef.current, {
                center,
                zoom: 12,
                tilt: 45,
                heading: 0,
                mapTypeId: 'roadmap',
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'greedy',
                backgroundColor: '#0d0d0f',
                clickableIcons: false,
                styles: STRIPPED_MAP_STYLES,
            });

            mapInstance.current = map;

            // ── Place AdvancedMarkerElement pins ──────────────────────────────
            // AdvancedMarkerElement requires the 'marker' library (v=beta)
            const AdvancedMarkerElement = google.maps.marker?.AdvancedMarkerElement;

            if (!AdvancedMarkerElement) {
                // Fallback to legacy Marker if AdvancedMarkerElement not available
                placeLegacyMarkers(google, map, permitsGeo);
            } else {
                placeAdvancedMarkers(google, AdvancedMarkerElement, map, permitsGeo);
            }

            setLoaded(true);
        }

        function placeAdvancedMarkers(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            google: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            AdvancedMarkerElement: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map: any,
            permits: PermitMarker[]
        ) {
            permits.forEach(permit => {
                const pinEl = buildPinElement(permit.jobType, false);
                const marker = new AdvancedMarkerElement({
                    map,
                    position: { lat: permit.lat, lng: permit.lng },
                    content: pinEl,
                    title: `${permit.address} — ${JOB_LABELS[permit.jobType] ?? permit.jobType}`,
                });

                const id = `${permit.lat},${permit.lng}`;
                markersRef.current.set(id, { marker, permit });

                marker.addListener('click', () => {
                    // Deselect previous
                    markersRef.current.forEach(({ marker: m, permit: p }, key) => {
                        if (m.content) {
                            const isSelected = key === id;
                            const newEl = buildPinElement(p.jobType, isSelected);
                            m.content = newEl;
                        }
                    });
                    setSelected(permit);

                    // Pan to marker
                    map.panTo({ lat: permit.lat, lng: permit.lng });
                });
            });
        }

        function placeLegacyMarkers(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            google: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map: any,
            permits: PermitMarker[]
        ) {
            // Legacy Marker fallback — colored circle via SVG path
            permits.forEach(permit => {
                const color = JOB_COLOR_HEX[permit.jobType] ?? JOB_COLOR_HEX.default;
                const marker = new google.maps.Marker({
                    map,
                    position: { lat: permit.lat, lng: permit.lng },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: color,
                        fillOpacity: 0.85,
                        strokeColor: color,
                        strokeWeight: 1.5,
                    },
                    title: `${permit.address} — ${JOB_LABELS[permit.jobType] ?? permit.jobType}`,
                });

                const id = `${permit.lat},${permit.lng}`;
                markersRef.current.set(id, { marker, permit });

                marker.addListener('click', () => {
                    setSelected(permit);
                    map.panTo({ lat: permit.lat, lng: permit.lng });
                });
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Filter handler ────────────────────────────────────────────────────────
    function handleFilter(f: Filter) {
        setActiveFilter(f);
        setSelected(null);
        const visible = new Set(filterPermits(permitsGeo, f).map(p => `${p.lat},${p.lng}`));
        markersRef.current.forEach(({ marker }, id) => {
            const show = visible.has(id);
            // AdvancedMarkerElement uses .map, legacy uses .setMap
            if (typeof marker.setMap === 'function') {
                marker.setMap(show ? mapInstance.current : null);
            } else {
                marker.map = show ? mapInstance.current : null;
            }
        });
    }

    const counts = permitsGeo.reduce<Record<string, number>>((acc, p) => {
        acc[p.jobType] = (acc[p.jobType] ?? 0) + 1;
        return acc;
    }, {});

    const totalA1 = (counts['A1'] ?? 0) + (counts['A2'] ?? 0) + (counts['A3'] ?? 0);

    if (apiError) {
        return (
            <div className={`flex flex-col ${className}`}>
                <div className="mx-4 rounded-xl border border-dashed border-zinc-800 h-[460px] flex flex-col items-center justify-center gap-3 text-center px-6">
                    <span className="text-3xl">🗺️</span>
                    <p className="text-white font-semibold text-sm">Google Maps API key required</p>
                    <p className="text-zinc-500 text-xs max-w-xs">
                        Add <code className="text-emerald-400 bg-zinc-900 px-1.5 rounded font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the Atlas.
                    </p>
                </div>
            </div>
        );
    }

    const ctrlBtn = 'flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-mono select-none active:scale-95';

    return (
        <div className={`flex flex-col ${className}`}>

            {/* Filter pills */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
                {FILTERS.map(f => {
                    const count = f.id === 'ALL'
                        ? permitsGeo.length
                        : f.id === 'A1'
                            ? totalA1
                            : (counts[f.id] ?? 0);
                    return (
                        <button
                            key={f.id}
                            onClick={() => handleFilter(f.id)}
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
                className={`relative overflow-hidden border border-zinc-800/80 transition-none ${
                    isFullscreen
                        ? 'fixed inset-0 bottom-[64px] z-40 rounded-none mx-0'
                        : 'mx-4 rounded-xl h-[460px]'
                }`}
            >
                {/* Google Maps canvas */}
                <div ref={mapRef} className="w-full h-full" />

                {/* Loading overlay */}
                {!loaded && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/95">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                            <p className="text-zinc-400 text-xs font-mono">Loading permit data…</p>
                        </div>
                    </div>
                )}

                {/* Status badge — top left */}
                {loaded && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 px-2 py-1 rounded-lg pointer-events-none z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                            Live · {permitsGeo.length} permits
                        </span>
                    </div>
                )}

                {/* ── Camera controls — right side ─────────────────────────── */}
                {loaded && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                        <button onClick={() => adjustTilt(10)}   className={ctrlBtn} title="Tilt up">▲</button>
                        <button onClick={() => adjustTilt(-10)}  className={ctrlBtn} title="Tilt down">▼</button>
                        <div className="h-px bg-zinc-800 my-0.5" />
                        <button onClick={() => adjustHeading(-22.5)} className={ctrlBtn} title="Rotate left">↺</button>
                        <button onClick={() => adjustHeading( 22.5)} className={ctrlBtn} title="Rotate right">↻</button>
                        <div className="h-px bg-zinc-800 my-0.5" />
                        <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 12) + 1)} className={ctrlBtn} title="Zoom in">+</button>
                        <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 12) - 1)} className={ctrlBtn} title="Zoom out">−</button>
                        <div className="h-px bg-zinc-800 my-0.5" />
                        <button onClick={resetView} className={ctrlBtn} title="Reset view">⊙</button>
                    </div>
                )}

                {/* Fullscreen toggle — top right */}
                {loaded && (
                    <button
                        onClick={toggleFullscreen}
                        className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-base select-none active:scale-95"
                        title={isFullscreen ? 'Collapse map' : 'Expand map'}
                    >
                        {isFullscreen ? '⊡' : '⤢'}
                    </button>
                )}

                {/* Gesture hint */}
                {loaded && (
                    <div className="absolute bottom-3 left-3 pointer-events-none z-10">
                        <p className="text-[9px] font-mono text-zinc-600">
                            Tap a pin · Drag to pan · Scroll to zoom
                        </p>
                    </div>
                )}
            </div>

            {/* Selected permit panel */}
            {selected && (
                <div
                    className="mx-4 mt-2.5 pl-3 pr-4 py-4 rounded-xl bg-zinc-900/90 border-l-2 border border-zinc-800 relative"
                    style={{ borderLeftColor: JOB_COLOR_HEX[selected.jobType] ?? '#a1a1aa' }}
                >
                    <button
                        onClick={() => {
                            setSelected(null);
                            // Reset all pins to normal size
                            markersRef.current.forEach(({ marker: m, permit: p }) => {
                                if (m.content) m.content = buildPinElement(p.jobType, false);
                            });
                        }}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                        aria-label="Close"
                    >×</button>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                            style={{
                                color: JOB_COLOR_HEX[selected.jobType],
                                borderColor: (JOB_COLOR_HEX[selected.jobType] ?? '#a1a1aa') + '50',
                            }}
                        >
                            {JOB_LABELS[selected.jobType] ?? selected.jobType}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{selected.issueDate}</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{selected.address}</p>
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
