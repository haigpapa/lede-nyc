// GET /api/health — public status endpoint
// Shows last pipeline run status without exposing secrets

import { NextResponse } from 'next/server';
import { getLastRun } from '@/lib/pipeline-logger';

export interface HealthResponse {
    ok: boolean;
    status: string;
    lastRunDate: string | null;
    lastRunTs: string | null;
    feedCards: number | null;
    mtaLines: number | null;
    durationMs: number | null;
    errorCount: number | null;
    issueUrl: string | null;
}

export async function GET() {
    try {
        const last = await getLastRun();

        if (!last) {
            return NextResponse.json({
                ok: true,
                status: 'no_runs_yet',
                lastRunDate: null,
                lastRunTs: null,
                feedCards: null,
                mtaLines: null,
                durationMs: null,
                errorCount: null,
                issueUrl: null,
            } satisfies HealthResponse);
        }

        const isOk = last['status'] === 'success';

        return NextResponse.json({
            ok: isOk,
            status: String(last['status'] ?? 'unknown'),
            lastRunDate: String(last['run_date'] ?? null),
            lastRunTs: String(last['run_ts'] ?? null),
            feedCards: last['feed_cards'] ? Number(last['feed_cards']) : null,
            mtaLines: last['mta_lines'] ? Number(last['mta_lines']) : null,
            durationMs: last['duration_ms'] ? Number(last['duration_ms']) : null,
            errorCount: null,
            issueUrl: last['github_issue_url'] ? String(last['github_issue_url']) : null,
        } satisfies HealthResponse, {
            status: isOk ? 200 : 503,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ ok: false, status: 'error', error: msg }, { status: 500 });
    }
}
