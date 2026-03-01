'use client';

/**
 * Atlas3DMap — Google Maps WebGL Overlay with Three.js permit markers
 *
 * - Fullscreen via Fullscreen API (⤢ button, or Esc to exit)
 * - Tilt controls: +/− tilt (pitch), rotate left/right (heading)
 * - All POI, business, transit, and administrative labels hidden
 * - ThreeJSOverlayView for 3D cylinder permit markers
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { permitsGeo, type PermitMarker } from '@/data/permits-geo';

type Filter = 'ALL' | 'NB' | 'A1' | 'DM';

const JOB_LABELS: Record<string, string> = {
    NB: 'New Building',
    A1: 'Major Alt',
    A2: 'Minor Alt',
    DM: 'Demolition',
    SG: 'Sign',
    EW: 'Earthwork',
    BL: 'Boiler',
    FP: 'Fire Suppression',
    EQ: 'Equipment',
    PL: 'Plumbing',
};

// Color triad — matches design system
const JOB_COLOR: Record<string, number> = {
    NB: 0x10b981,   // emerald — Growth
    A1: 0xf59e0b,   // amber   — Friction
    A2: 0xf59e0b,   // amber
    DM: 0xf43f5e,   // rose    — Disruption
    default: 0xa1a1aa,
};

const JOB_COLOR_HEX: Record<string, string> = {
    NB: '#10b981',
    A1: '#f59e0b',
    A2: '#f59e0b',
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
    if (filter === 'A1') return permits.filter(p => p.jobType === 'A1' || p.jobType === 'A2');
    return permits.filter(p => p.jobType === filter);
}

// NOTE: We cannot use styles[] with WebGL/3D maps — styles require a Map ID.
// We apply mapTypeId + backgroundColor to get the darkest possible base,
// and suppress POI/transit entirely via clickableIcons + a post-init style
// workaround. The map will use ROADMAP type which supports v=beta tilt.
//
// For a fully custom dark style on a 3D map you need a Maps Platform Map ID
// with Cloud Styling configured. Set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in .env.local.
// Without it we fall back to the standard roadmap (lighter) but still functional.

interface Atlas3DMapProps { className?: string }

export default function Atlas3DMap({ className = '' }: Atlas3DMapProps) {
    const searchParams = useSearchParams();
    const focusNeighbor = searchParams.get('focus');

    const wrapperRef = useRef<HTMLDivElement>(null);   // fullscreen target
    const mapRef     = useRef<HTMLDivElement>(null);   // google maps mount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstance = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlayRef  = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meshMapRef  = useRef<Map<string, any>>(new Map());

    const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
    const [selected,     setSelected]     = useState<PermitMarker | null>(null);
    const [loaded,       setLoaded]       = useState(false);
    const [apiError,     setApiError]     = useState(false);
    const [threeError,   setThreeError]   = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ── Fullscreen handling ───────────────────────────────────────────────────
    // We expand within the app shell (fills from below the header to above the
    // bottom nav) rather than using the native Fullscreen API, which doesn't
    // respect the max-w-[430px] phone shell or the bottom nav.
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(f => !f);
    }, []);

    // ── Tilt / heading controls ───────────────────────────────────────────────
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
        map.setTilt(60);
        map.setHeading(0);
        map.setZoom(13);
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,geometry,marker&v=beta`;
        script.async = true;
        script.defer = true;
        script.onload  = () => initMap();
        script.onerror = () => setApiError(true);
        document.head.appendChild(script);

        async function initMap() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const google = (window as any).google;
            if (!google?.maps || !mapRef.current) return;

            let center = { lat: 40.7128, lng: -73.9562 };
            if (focusNeighbor) {
                const match = permitsGeo.find(p =>
                    p.neighborhood.toLowerCase().includes(focusNeighbor.toLowerCase()) ||
                    p.borough.toLowerCase().includes(focusNeighbor.toLowerCase())
                );
                if (match) center = { lat: match.lat, lng: match.lng };
            }

            const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

            const map = new google.maps.Map(mapRef.current, {
                center,
                zoom: 13,
                tilt: 60,
                heading: 0,
                // mapId enables WebGL + cloud styling (dark theme if configured)
                // Without a Map ID, 3D/tilt still works but uses default light theme
                ...(mapId ? { mapId } : {}),
                mapTypeId: 'roadmap',
                disableDefaultUI: true,
                zoomControl: false,         // we provide our own controls
                gestureHandling: 'greedy',
                backgroundColor: '#09090b',
                clickableIcons: false,      // disable POI click bubbles
            });

            mapInstance.current = map;

            // ── Bootstrap Three.js overlay ────────────────────────────────────
            try {
                const THREE = await import('three');
                const { ThreeJSOverlayView } = await import('@googlemaps/three');

                const overlay = new ThreeJSOverlayView({
                    map,
                    anchor: { lat: center.lat, lng: center.lng, altitude: 0 },
                    upAxis: 'Y',
                    animationMode: 'ondemand',
                });

                overlayRef.current = overlay;

                buildPermitMeshes(overlay, THREE, filterPermits(permitsGeo, 'ALL'));

                mapRef.current?.addEventListener('click', (e: MouseEvent) => {
                    if (!mapRef.current) return;
                    const rect = mapRef.current.getBoundingClientRect();
                    const x =   ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
                    const y = -(((e.clientY - rect.top)   / rect.height) * 2 - 1);
                    const hits = overlay.raycast({ x, y }, [...meshMapRef.current.values()], { recursive: false });
                    if (hits.length > 0) {
                        const hitId = hits[0].object.userData?.permitId as string | undefined;
                        if (hitId) {
                            const permit = permitsGeo.find(p => `${p.lat},${p.lng}` === hitId);
                            setSelected(permit ?? null);
                        }
                    } else {
                        setSelected(null);
                    }
                });

                setLoaded(true);
                overlay.requestRedraw();

            } catch (err) {
                console.error('[Atlas3DMap] Three.js overlay failed:', err);
                setThreeError(true);
                setLoaded(true);
            }
        }

        function buildPermitMeshes(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            overlay: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            THREE: any,
            permits: PermitMarker[]
        ) {
            meshMapRef.current.forEach(mesh => overlay.scene.remove(mesh));
            meshMapRef.current.clear();

            const geometry = new THREE.CylinderGeometry(2, 2, 40, 8);

            permits.forEach(permit => {
                const colorHex = JOB_COLOR[permit.jobType] ?? JOB_COLOR.default;
                const material = new THREE.MeshStandardMaterial({
                    color: colorHex,
                    emissive: colorHex,
                    emissiveIntensity: 0.6,
                    transparent: true,
                    opacity: 0.88,
                    roughness: 0.3,
                    metalness: 0.2,
                });

                const mesh = new THREE.Mesh(geometry, material);
                const position = overlay.latLngAltitudeToVector3({
                    lat: permit.lat,
                    lng: permit.lng,
                    altitude: 20,
                });
                mesh.position.copy(position);
                mesh.userData.permitId = `${permit.lat},${permit.lng}`;
                overlay.scene.add(mesh);
                meshMapRef.current.set(mesh.userData.permitId, mesh);
            });

            overlay.requestRedraw();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleFilter(f: Filter) {
        setActiveFilter(f);
        setSelected(null);
        const overlay = overlayRef.current;
        if (!overlay) return;
        const filtered = filterPermits(permitsGeo, f);
        const visibleIds = new Set(filtered.map(p => `${p.lat},${p.lng}`));
        meshMapRef.current.forEach((mesh, id) => { mesh.visible = visibleIds.has(id); });
        overlay.requestRedraw();
    }

    const counts = permitsGeo.reduce<Record<string, number>>((acc, p) => {
        acc[p.jobType] = (acc[p.jobType] ?? 0) + 1;
        return acc;
    }, {});

    if (apiError) {
        return (
            <div className={`flex flex-col ${className}`}>
                <div className="mx-4 rounded-xl border border-dashed border-zinc-800 h-[460px] flex flex-col items-center justify-center gap-3 text-center px-6">
                    <span className="text-3xl">🗺️</span>
                    <p className="text-white font-semibold text-sm">Google Maps API key required</p>
                    <p className="text-zinc-500 text-xs max-w-xs">
                        Add <code className="text-emerald-400 bg-zinc-900 px-1.5 rounded font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the 3D Atlas.
                    </p>
                </div>
            </div>
        );
    }

    // Shared button style for overlay controls
    const ctrlBtn = 'flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-mono select-none active:scale-95';

    return (
        <div className={`flex flex-col ${className}`}>

            {/* Filter pills */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
                {FILTERS.map(f => {
                    const count = f.id === 'ALL'
                        ? permitsGeo.length
                        : f.id === 'A1'
                            ? (counts['A1'] ?? 0) + (counts['A2'] ?? 0)
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

            {/* Map wrapper — expands to fill app shell when fullscreen */}
            <div
                ref={wrapperRef}
                className={`relative overflow-hidden border border-zinc-800/80 transition-none ${
                    isFullscreen
                        ? 'fixed inset-0 bottom-[64px] z-40 rounded-none mx-0'   // covers header→bottom nav
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
                            <p className="text-zinc-400 text-xs font-mono">Initializing 3D Atlas…</p>
                        </div>
                    </div>
                )}

                {/* Status badge — top left */}
                {loaded && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 px-2 py-1 rounded-lg pointer-events-none z-10">
                        <span className={`w-1.5 h-1.5 rounded-full ${threeError ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                            {threeError ? '2D fallback' : '3D · WebGL'}
                        </span>
                    </div>
                )}

                {/* ── Camera controls — right side ─────────────────────────── */}
                {loaded && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                        {/* Tilt up */}
                        <button onClick={() => adjustTilt(10)} className={ctrlBtn} title="Tilt up (more overhead)">
                            ▲
                        </button>
                        {/* Tilt down */}
                        <button onClick={() => adjustTilt(-10)} className={ctrlBtn} title="Tilt down (more perspective)">
                            ▼
                        </button>
                        {/* Separator */}
                        <div className="h-px bg-zinc-800 my-0.5" />
                        {/* Rotate left */}
                        <button onClick={() => adjustHeading(-22.5)} className={ctrlBtn} title="Rotate left">
                            ↺
                        </button>
                        {/* Rotate right */}
                        <button onClick={() => adjustHeading(22.5)} className={ctrlBtn} title="Rotate right">
                            ↻
                        </button>
                        {/* Separator */}
                        <div className="h-px bg-zinc-800 my-0.5" />
                        {/* Zoom in */}
                        <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 13) + 1)} className={ctrlBtn} title="Zoom in">
                            +
                        </button>
                        {/* Zoom out */}
                        <button onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 13) - 1)} className={ctrlBtn} title="Zoom out">
                            −
                        </button>
                        {/* Separator */}
                        <div className="h-px bg-zinc-800 my-0.5" />
                        {/* Reset */}
                        <button onClick={resetView} className={ctrlBtn} title="Reset view">
                            ⊙
                        </button>
                    </div>
                )}

                {/* ── Fullscreen toggle — top right ────────────────────────── */}
                {loaded && (
                    <button
                        onClick={toggleFullscreen}
                        className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-base select-none active:scale-95"
                        title={isFullscreen ? 'Collapse map' : 'Expand map'}
                        aria-label={isFullscreen ? 'Collapse map' : 'Expand map'}
                    >
                        {isFullscreen ? '⊡' : '⤢'}
                    </button>
                )}

                {/* Gesture hint — bottom left */}
                {loaded && !threeError && (
                    <div className="absolute bottom-3 left-3 pointer-events-none z-10">
                        <p className="text-[9px] font-mono text-zinc-600">
                            Drag to pan · Scroll to zoom · Right-drag to tilt & rotate
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
                        onClick={() => setSelected(null)}
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
                <span className="ml-auto text-zinc-700">{permitsGeo.length} permits · 3D markers</span>
            </div>
        </div>
    );
}
