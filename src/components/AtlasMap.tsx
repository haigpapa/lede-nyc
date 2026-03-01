'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { permitsGeo, type PermitMarker } from '@/data/permits-geo';

type Filter = 'ALL' | 'NB' | 'A1' | 'A2' | 'DM';
type LayerMode = 'markers' | 'heat';

const JOB_LABELS: Record<string, string> = {
    NB: 'New Building',
    A1: 'Major Alt',
    A2: 'Minor Alt',
    A3: 'Equipment',
    DM: 'Demolition',
};

const JOB_ICONS: Record<string, string> = {
    NB: '▲',
    A1: '◆',
    A2: '◆',
    A3: '●',
    DM: '▼',
};

const JOB_COLOR: Record<string, string> = {
    NB: '#10b981',
    A1: '#f59e0b',
    A2: '#f59e0b',
    A3: '#38bdf8',
    DM: '#f43f5e',
};

const FILTERS: { id: Filter; label: string; color: string }[] = [
    { id: 'ALL', label: 'All', color: '#a1a1aa' },
    { id: 'NB', label: '🏗 New', color: '#10b981' },
    { id: 'A1', label: '🔨 Reno', color: '#f59e0b' },
    { id: 'A2', label: '🔧 Minor', color: '#f59e0b' },
    { id: 'DM', label: '⚠️ Demo', color: '#f43f5e' },
];

// Google Maps dark style matching zinc-950 aesthetic
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#09090b' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#09090b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#52525b' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#71717a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#3f3f46' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f2016' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a28' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#18181b' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#27272a' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#3f3f46' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1c1c1f' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2d2d30' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#52525b' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#18181b' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#52525b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a2e' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
];

function makeSvgPin(color: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
      <circle cx="12" cy="12" r="9" fill="${color}" fill-opacity="0.92" stroke="white" stroke-width="2.5"/>
      <line x1="12" y1="21" x2="12" y2="31" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function filterPermits(permits: PermitMarker[], filter: Filter) {
    if (filter === 'ALL') return permits;
    if (filter === 'A1') return permits.filter(p => p.jobType === 'A1' || p.jobType === 'A2');
    return permits.filter(p => p.jobType === filter);
}

interface AtlasMapProps { className?: string }

export default function AtlasMap({ className = '' }: AtlasMapProps) {
    const searchParams = useSearchParams();
    const focusNeighbor = searchParams.get('focus');

    const mapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstance = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clustererRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatmapRef = useRef<any>(null);

    const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
    const [layerMode, setLayerMode] = useState<LayerMode>('markers');
    const [selected, setSelected] = useState<PermitMarker | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [apiError, setApiError] = useState(false);

    const counts = permitsGeo.reduce<Record<string, number>>((acc, p) => {
        acc[p.jobType] = (acc[p.jobType] ?? 0) + 1;
        return acc;
    }, {});

    // ── Bootstrap Google Maps JS API ───────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setApiError(true);
            return;
        }

        // Check if script already loaded (hot reload / StrictMode)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps) {
            initMap();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,marker`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        script.onerror = () => setApiError(true);
        document.head.appendChild(script);

        function initMap() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const google = (window as any).google;
            if (!google?.maps || !mapRef.current) return;

            let center = { lat: 40.7128, lng: -73.9562 };
            let zoom = 11;

            if (focusNeighbor) {
                const match = permitsGeo.find(p =>
                    p.neighborhood.toLowerCase().includes(focusNeighbor.toLowerCase()) ||
                    p.borough.toLowerCase().includes(focusNeighbor.toLowerCase())
                );
                if (match) {
                    center = { lat: match.lat, lng: match.lng };
                    zoom = 14;
                }
            }

            const map = new google.maps.Map(mapRef.current, {
                center,
                zoom,
                styles: DARK_MAP_STYLE,
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM,
                },
                gestureHandling: 'greedy',
                backgroundColor: '#09090b',
            });

            mapInstance.current = map;
            renderMarkers('ALL');
            setLoaded(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render markers with clustering ────────────────────────────────────────
    function renderMarkers(filter: Filter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        const map = mapInstance.current;
        if (!google?.maps || !map) return;

        // Clear existing markers + clusterer
        if (clustererRef.current) {
            clustererRef.current.clearMarkers();
            clustererRef.current = null;
        }
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        // Clear heatmap
        if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
            heatmapRef.current = null;
        }

        const permits = filterPermits(permitsGeo, filter);

        const markers = permits.map(permit => {
            const color = JOB_COLOR[permit.jobType] ?? '#a1a1aa';
            const marker = new google.maps.Marker({
                position: { lat: permit.lat, lng: permit.lng },
                icon: {
                    url: makeSvgPin(color),
                    scaledSize: new google.maps.Size(24, 32),
                    anchor: new google.maps.Point(12, 31),
                },
                title: permit.address,
            });
            marker.addListener('click', () => setSelected(permit));
            return marker;
        });

        markersRef.current = markers;

        // Use MarkerClusterer if available
        if (google.maps.plugins?.MarkerClusterer) {
            clustererRef.current = new google.maps.plugins.MarkerClusterer({
                map,
                markers,
                renderer: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    render: ({ count, position }: { count: number; position: any }) => {
                        const size = count > 20 ? 44 : count > 10 ? 36 : 28;
                        return new google.maps.Marker({
                            position,
                            icon: {
                                url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                                    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                                        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="rgba(16,185,129,0.85)" stroke="white" stroke-width="2"/>
                                        <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" font-size="${size < 36 ? 11 : 13}" font-weight="700" fill="white">${count}</text>
                                    </svg>`
                                )}`,
                                scaledSize: new google.maps.Size(size, size),
                                anchor: new google.maps.Point(size / 2, size / 2),
                            },
                            zIndex: 1000,
                        });
                    },
                },
            });
        } else {
            // Fallback: no clustering, just add markers directly
            markers.forEach(m => m.setMap(map));
        }
    }

    // ── Render heatmap ────────────────────────────────────────────────────────
    function renderHeat(filter: Filter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        const map = mapInstance.current;
        if (!google?.maps?.visualization || !map) return;

        // Clear markers
        if (clustererRef.current) {
            clustererRef.current.clearMarkers();
            clustererRef.current = null;
        }
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        // Clear existing heatmap
        if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
            heatmapRef.current = null;
        }

        const permits = filterPermits(permitsGeo, filter);
        const data = permits.map(p => ({
            location: new google.maps.LatLng(p.lat, p.lng),
            weight: 1,
        }));

        const heatmap = new google.maps.visualization.HeatmapLayer({
            data,
            map,
            radius: 30,
            opacity: 0.75,
            gradient: [
                'rgba(9, 9, 11, 0)',
                'rgba(30, 58, 95, 1)',
                'rgba(29, 78, 216, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(244, 63, 94, 1)',
            ],
        });

        heatmapRef.current = heatmap;
        setSelected(null);
    }

    function applyLayer(filter: Filter, mode: LayerMode) {
        if (mode === 'markers') renderMarkers(filter);
        else renderHeat(filter);
    }

    function handleFilter(f: Filter) {
        setActiveFilter(f);
        setSelected(null);
        applyLayer(f, layerMode);
    }

    function handleLayerToggle(mode: LayerMode) {
        setLayerMode(mode);
        applyLayer(activeFilter, mode);
    }

    // ── API key missing error state ────────────────────────────────────────────
    if (apiError) {
        return (
            <div className={`flex flex-col ${className}`}>
                <div className="mx-4 rounded-xl border border-dashed border-zinc-800 h-[460px] flex flex-col items-center justify-center gap-3 text-center px-6">
                    <span className="text-3xl">🗺️</span>
                    <p className="text-white font-semibold text-sm">Google Maps API key required</p>
                    <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                        Add <code className="text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="text-zinc-400 font-mono text-[11px]">.env.local</code> file to enable the Tactical Atlas.
                    </p>
                    <p className="text-zinc-600 text-[10px] font-mono">Maps JavaScript API + Visualization library required</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${className}`}>

            {/* Layer toggle — Markers / Heat */}
            <div className="flex items-center justify-between px-4 pb-1 shrink-0">
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
                    {(['markers', 'heat'] as LayerMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => handleLayerToggle(m)}
                            className={`px-3 py-2 rounded-full text-xs font-semibold transition-all motion-reduce:transition-none ${layerMode === m
                                ? 'bg-zinc-700 text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {m === 'markers' ? '📍 Clusters' : '🔥 Heatmap'}
                        </button>
                    ))}
                </div>
                <span className="text-[10px] font-mono text-zinc-600">{permitsGeo.length} permits</span>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => handleFilter(f.id)}
                        aria-label={`Filter: ${f.id === 'ALL' ? 'All permit types' : JOB_LABELS[f.id] ?? f.id}${activeFilter === f.id ? ' (active)' : ''}`}
                        aria-pressed={activeFilter === f.id}
                        className={`shrink-0 px-3 py-2.5 rounded-full text-xs font-semibold border transition-all motion-reduce:transition-none min-h-[44px] flex items-center ${activeFilter === f.id
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                        style={activeFilter === f.id ? { borderColor: f.color, color: f.color } : {}}
                    >
                        {f.label}
                        {f.id !== 'ALL' && (
                            <span className="ml-1.5 opacity-60 font-normal">
                                {f.id === 'A1'
                                    ? (counts['A1'] ?? 0) + (counts['A2'] ?? 0)
                                    : (counts[f.id] ?? 0)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Map container */}
            <div className="relative mx-4 rounded-xl overflow-hidden border border-zinc-800 h-[460px]">
                <div ref={mapRef} className="w-full h-full" />
                {!loaded && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/95">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                            Loading map…
                        </div>
                    </div>
                )}
            </div>

            {/* Selected permit detail panel */}
            {selected && (
                <div className="mx-4 mt-2.5 p-4 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700 relative animate-fade-in">
                    <button
                        onClick={() => setSelected(null)}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                            style={{ color: JOB_COLOR[selected.jobType], borderColor: JOB_COLOR[selected.jobType] + '50' }}
                        >
                            {JOB_LABELS[selected.jobType] ?? selected.jobType}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{selected.issueDate}</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{selected.address}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{selected.neighborhood} · {selected.borough} · {selected.zip}</p>
                    <p className="text-zinc-600 text-xs mt-1.5">
                        Status: <span className="text-zinc-400">{selected.status}</span>
                    </p>
                </div>
            )}

            {/* Legend */}
            <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500 text-[10px] font-medium shrink-0">
                {Object.entries(JOB_COLOR)
                    .filter(([k]) => k !== 'A2')
                    .map(([type, color]) => (
                        <span key={type} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                            <span style={{ color }} aria-hidden="true">{JOB_ICONS[type]}</span>
                            {JOB_LABELS[type]}
                        </span>
                    ))}
            </div>
        </div>
    );
}
