// GET /api/pipeline/run — The autonomous Lede.nyc daily pipeline
// Orchestrates: permit-auditor → civic-translator → GitHub commit → MTA snapshot → BQ log
//
// Protected by: Authorization: Bearer <CRON_SECRET>
// Triggered by: Vercel cron (06:00 ET daily), daily-lede.sh (manual/local), or direct curl

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, makeRunId } from '@/lib/auth';
import { runPermitAuditor } from '@/lib/permit-auditor';
import { translateAnomalies } from '@/lib/civic-translator';
import { commitFeedJson, openPipelineIssue, closePipelineIssues, ensureLabels } from '@/lib/github';
import { logPipelineRun } from '@/lib/pipeline-logger';

export async function GET(req: NextRequest) {
    // ── 0. Auth ──────────────────────────────────────────────────────────────
    const authErr = requireCronSecret(req);
    if (authErr) return authErr;

    const runId = makeRunId();
    const started = Date.now();
    let feedCards = 0;
    let mtaLines = 0;
    let githubSha: string | undefined;
    let issueUrl: string | undefined;

    console.log(`[pipeline] Starting run ${runId}`);

    try {
        // ── 1. permit-auditor: BigQuery anomaly detection ────────────────────
        console.log('[pipeline] Step 1: permit-auditor');
        const { rows: anomalies, sql } = await runPermitAuditor();
        console.log(`[pipeline] Found ${anomalies.length} anomalies`);

        // ── 2. civic-translator: Gemini Flash synthesis ──────────────────────
        console.log('[pipeline] Step 2: civic-translator (Gemini)');
        let cards;
        if (anomalies.length === 0) {
            // No anomalies today — generate a "quiet day" card
            cards = [{
                category: 'Update',
                emoji: '✅',
                accentColor: 'emerald',
                headline: 'Construction activity normal today',
                bullets: [
                    'No significant spikes detected in Hell\'s Kitchen permit activity this week.',
                    'Seven-day permit counts are in line with the 90-day average for all job types.',
                    'Check back tomorrow — the pipeline runs daily at 6am.',
                ],
                timestamp: new Date().toISOString(),
                mapFocus: 'hells-kitchen',
                sqlQuery: sql,
            }];
        } else {
            cards = await translateAnomalies(anomalies);
            // Inject SQL provenance into the first card
            if (cards[0]) cards[0].sqlQuery = sql;
        }
        feedCards = cards.length;
        console.log(`[pipeline] Generated ${feedCards} LedeCards`);

        // ── 3. MTA snapshot (parallel with commit) ───────────────────────────
        console.log('[pipeline] Step 3: MTA snapshot + GitHub commit (parallel)');
        const origin = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const [commitSha, mtaResult] = await Promise.allSettled([
            // Commit feed.json to GitHub (triggers Vercel redeploy)
            commitFeedJson(JSON.stringify(cards, null, 2)),
            // Snapshot MTA reliability to BigQuery
            fetch(`${origin}/api/store-mta-snapshot`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
            }).then(r => r.json() as Promise<{ linesStored?: number }>),
        ]);

        if (commitSha.status === 'fulfilled') {
            githubSha = commitSha.value;
            console.log(`[pipeline] feed.json committed: ${githubSha}`);
        } else {
            console.warn('[pipeline] GitHub commit failed:', commitSha.reason);
        }

        if (mtaResult.status === 'fulfilled') {
            mtaLines = mtaResult.value.linesStored ?? 0;
            console.log(`[pipeline] MTA snapshot: ${mtaLines} lines`);
        }

        // ── 4. Close any open failure issues ────────────────────────────────
        await closePipelineIssues().catch(() => { /* non-critical */ });

        // ── 5. Log success to BigQuery ───────────────────────────────────────
        const duration = Date.now() - started;
        await logPipelineRun({
            runId,
            status: 'success',
            feedCards,
            mtaLines,
            durationMs: duration,
            githubSha,
        });

        console.log(`[pipeline] ✅ Run ${runId} complete in ${duration}ms`);

        return NextResponse.json({
            ok: true,
            runId,
            feedCards,
            mtaLines,
            durationMs: duration,
            githubSha,
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const duration = Date.now() - started;

        console.error(`[pipeline] ❌ Run ${runId} FAILED:`, errorMsg);

        // Open GitHub Issue to alert
        try {
            await ensureLabels();
            issueUrl = await openPipelineIssue(errorMsg, runId);
            console.log(`[pipeline] Issue opened: ${issueUrl}`);
        } catch (issueErr) {
            console.error('[pipeline] Failed to open GitHub Issue:', issueErr);
        }

        // Log failure to BigQuery
        await logPipelineRun({
            runId,
            status: 'failure',
            feedCards,
            mtaLines,
            durationMs: duration,
            errorMessage: errorMsg,
            githubIssueUrl: issueUrl,
        });

        return NextResponse.json({
            ok: false,
            runId,
            error: errorMsg,
            githubIssueUrl: issueUrl,
            durationMs: duration,
        }, { status: 500 });
    }
}

// Vercel cron uses GET — already defined above
// Allow POST for manual triggers
export { GET as POST };
