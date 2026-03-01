/**
 * Ambient module declaration for @googlemaps/three.
 *
 * The package ships types at dist/index.d.ts but its package.json "exports"
 * map does not include a "types" key, which prevents TypeScript (moduleResolution:
 * bundler) from resolving them automatically. We provide a minimal typed shim
 * here covering the API surface used in Atlas3DMap.tsx.
 */
declare module '@googlemaps/three' {
    import * as THREE from 'three';

    export interface LatLngAltitude {
        lat: number;
        lng: number;
        altitude?: number;
    }

    export interface ThreeJSOverlayViewOptions {
        map: unknown;
        anchor?: LatLngAltitude;
        upAxis?: 'Y' | 'Z';
        animationMode?: 'always' | 'ondemand';
    }

    export class ThreeJSOverlayView {
        constructor(options: ThreeJSOverlayViewOptions);
        scene: THREE.Scene;
        latLngAltitudeToVector3(position: LatLngAltitude, target?: THREE.Vector3): THREE.Vector3;
        raycast(
            point: { x: number; y: number },
            targets: THREE.Object3D[],
            options?: { recursive?: boolean }
        ): THREE.Intersection[];
        requestRedraw(): void;
        setMap(map: unknown | null): void;
    }
}
