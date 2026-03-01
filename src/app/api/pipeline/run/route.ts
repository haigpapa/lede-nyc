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
    const runStartedAt = new Date().toISOString();

    console.log(`[pipeline] Starting run ${runId}`);

    try {
        // ── 1. permit-auditor: BigQuery anomaly detection ────────────────────
        console.log('[pipeline] Step 1: permit-auditor');
        const { rows: anomalies, sql } = await runPermitAuditor();
        console.log(`[pipeline] Found ${anomalies.length} anomalies`);

        // ── 2. civic-translator: Gemini Flash synthesis ──────────────────────
        console.log('[pipeline] Step 2: civic-translator (Gemini)');

        // Job type → canonical color for post-processing guard
        const jobTypeColorMap: Record<string, string> = {
            NB: 'emerald', A1: 'emerald',
            A2: 'amber', SG: 'amber', EW: 'amber', BL: 'amber', PL: 'amber',
            DM: 'rose', FP: 'rose', EQ: 'rose',
        };
        const validColors = new Set(['emerald', 'amber', 'rose']);

        let cards;
        if (anomalies.length === 0) {
            // No anomalies today — generate a "quiet day" card
            cards = [{
                category: 'Update',
                emoji: '✅',
                accentColor: 'emerald',
                headline: 'Manhattan construction activity normal today',
                bullets: [
                    'No significant spikes detected in Manhattan permit activity this week.',
                    'Seven-day permit counts are in line with the 90-day average for all job types.',
                    'Check back tomorrow — the pipeline runs daily at 6am.',
                ],
                timestamp: runStartedAt,
                mapFocus: 'midtown',
                sqlQuery: sql,
                dataWindow: 'past 7 days',
                provenanceRowCount: 0,
                provenanceSampleId: 'No anomalies detected',
                provenanceIngestedAt: runStartedAt,
            }];
        } else {
            cards = await translateAnomalies(anomalies);
            // Inject SQL provenance into the first card
            if (cards[0]) cards[0].sqlQuery = sql;

            // Post-processing: enforce color triad + inject provenance per card
            cards = cards.map((card, i) => {
                const anomaly = anomalies[i] ?? anomalies[0];
                // Override color if Gemini chose wrong color for job type
                let accentColor = card.accentColor;
                if (!validColors.has(accentColor)) accentColor = 'amber';
                const expectedColor = anomaly ? jobTypeColorMap[anomaly.jobType] : undefined;
                if (expectedColor && !validColors.has(card.accentColor)) {
                    accentColor = expectedColor;
                }
                return {
                    ...card,
                    accentColor,
                    dataWindow: 'past 7 days',
                    provenanceRowCount: anomalies.length,
                    provenanceSampleId: anomaly
                        ? `ZIP ${anomaly.zip} · ${anomaly.jobType} · ${anomaly.pctChange > 0 ? '+' : ''}${anomaly.pctChange}%`
                        : undefined,
                    provenanceIngestedAt: runStartedAt,
                };
            });
        }
        feedCards = cards.length;
        console.log(`[pipeline] Generated ${feedCards} LedeCards`);

        // ── 3. MTA snapshot (parallel with commit) ───────────────────────────
        console.log('[pipeline] Step 3: MTA snapshot + GitHub commit (parallel)');
        const origin = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // Wrap cards in FeedPayload envelope with pipeline metadata
        const feedPayload = {
            meta: {
                runId,
                generatedAt: runStartedAt,
                dataWindow: 'past 7 days',
                source: 'NYC DOB Permits via BigQuery',
                borough: 'Manhattan',
            },
            cards,
        };

        const [commitSha, mtaResult] = await Promise.allSettled([
            // Commit feed.json to GitHub (triggers Vercel redeploy)
            commitFeedJson(JSON.stringify(feedPayload, null, 2)),
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
