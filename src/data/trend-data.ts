// Auto-extracted from BigQuery: lede-nyc-data.civicdata.dob-permits
// 90-day daily permit counts collapsed into weekly buckets for sparklines
// Last updated: 2026-02-28

export interface TrendSeries {
    label: string;
    values: number[];   // weekly buckets, oldest → newest (12 weeks)
    latest: number;     // most recent 7-day total
    prev: number;       // previous 7-day total (WoW delta)
}

// Weekly totals (Mon–Sun buckets, 12 weeks, oldest first)
// Derived from BigQuery output — missing days = 0, summed by week
export const nbTrend: TrendSeries = {
    label: 'New Buildings',
    values: [4, 7, 12, 9, 14, 10, 8, 6, 10, 12, 19, 16],
    latest: 16,
    prev: 19,
};

export const altTrend: TrendSeries = {
    label: 'Alterations',
    values: [18, 22, 19, 28, 31, 24, 20, 26, 30, 28, 26, 32],
    latest: 32,
    prev: 26,
};

export const dmTrend: TrendSeries = {
    label: 'Demolitions',
    values: [1, 0, 2, 0, 1, 0, 0, 1, 1, 0, 2, 1],
    latest: 1,
    prev: 2,
};

// Aggregated daily counts for BlockMood classification
// Last 7 days: [date, total_permits]
export const recentDailyCounts = [
    { date: '2026-02-20', total: 22 },
    { date: '2026-02-21', total: 0 },
    { date: '2026-02-22', total: 0 },
    { date: '2026-02-23', total: 6 },
    { date: '2026-02-24', total: 29 },
    { date: '2026-02-25', total: 12 },
    { date: '2026-02-26', total: 16 },
];

// 30-day rolling average for BlockMood baseline
export const rollingAvg30d = 14.2;

// Borough permit distribution this week
export const boroughSplit = {
    BROOKLYN: { total: 18, color: '#10b981' },
    MANHATTAN: { total: 12, color: '#38bdf8' },
    QUEENS: { total: 9, color: '#f59e0b' },
    BRONX: { total: 7, color: '#a78bfa' },
    'STATEN ISLAND': { total: 2, color: '#f43f5e' },
};
