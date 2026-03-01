'use client';

interface SparklineProps {
    values: number[];
    width?: number;
    height?: number;
    color?: string;
    fill?: boolean;
    className?: string;
}

export default function Sparkline({
    values,
    width = 80,
    height = 28,
    color = '#10b981',
    fill = true,
    className = '',
}: SparklineProps) {
    if (!values || values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    // Map values to SVG coordinates
    const points = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * w;
        const y = pad + h - ((v - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = points.join(' ');

    // Fill polygon: polyline + bottom-right + bottom-left
    const lastX = (pad + w).toFixed(1);
    const firstX = pad.toFixed(1);
    const bottom = (pad + h).toFixed(1);
    const fillPoly = `${polyline} ${lastX},${bottom} ${firstX},${bottom}`;

    const fillId = `sparkfill-${color.replace('#', '')}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {fill && (
                <polygon
                    points={fillPoly}
                    fill={`url(#${fillId})`}
                />
            )}
            <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* End dot */}
            <circle
                cx={points[points.length - 1].split(',')[0]}
                cy={points[points.length - 1].split(',')[1]}
                r="2"
                fill={color}
            />
        </svg>
    );
}
