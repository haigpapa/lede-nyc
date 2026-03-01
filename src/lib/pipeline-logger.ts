// BigQuery logging helper for pipeline runs
// Writes to civicdata.pipeline_runs via REST API (no npm package needed)

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT = 'lede-nyc-data';
const BQ_BASE = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;

export interface PipelineRunLog {
    runId: string;
    status: 'success' | 'failure' | 'partial';
    feedCards: number;
    mtaLines: number;
    durationMs: number;
    errorMessage?: string;
    githubSha?: string;
    githubIssueUrl?: string;
}

async function getAccessToken(): Promise<string> {
    const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonKey) {
        const key = JSON.parse(jsonKey);
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'RS256', typ: 'JWT' };
        const payload = {
            iss: key.client_email,
            scope: 'https://www.googleapis.com/auth/bigquery',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now, exp: now + 3600,
        };
        const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const unsigned = `${enc(header)}.${enc(payload)}`;
        const { createSign } = await import('crypto');
        const sign = createSign('RSA-SHA256');
        sign.update(unsigned);
        const jwt = `${unsigned}.${sign.sign(key.private_key, 'base64url')}`;

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });
        const data = await res.json() as { access_token: string };
        return data.access_token;
    }
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
}

export async function logPipelineRun(log: PipelineRunLog): Promise<void> {
    try {
        const token = await getAccessToken();
        const now = new Date();

        const row = {
            run_id: log.runId,
            run_date: now.toISOString().split('T')[0],
            run_ts: now.toISOString(),
            status: log.status,
            feed_cards: log.feedCards,
            mta_lines: log.mtaLines,
            duration_ms: log.durationMs,
            error_message: log.errorMessage ?? null,
            github_sha: log.githubSha ?? null,
            github_issue_url: log.githubIssueUrl ?? null,
        };

        await fetch(`${BQ_BASE}/datasets/civicdata/tables/pipeline_runs/insertAll`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: [{ insertId: log.runId, json: row }] }),
        });
    } catch (err) {
        // Log to console but don't throw — logging failure should not crash the pipeline
        console.error('[logPipelineRun] Failed:', err);
    }
}

export async function getLastRun(): Promise<Record<string, unknown> | null> {
    try {
        const token = await getAccessToken();
        const sql = `
      SELECT *
      FROM \`${PROJECT}.civicdata.pipeline_runs\`
      ORDER BY run_ts DESC
      LIMIT 1
    `;
        const res = await fetch(`${BQ_BASE}/queries`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sql, useLegacySql: false, location: 'US', timeoutMs: 8000 }),
        });
        if (!res.ok) return null;
        const data = await res.json() as {
            schema?: { fields: Array<{ name: string }> };
            rows?: Array<{ f: Array<{ v: string }> }>;
        };
        if (!data.rows?.length || !data.schema) return null;
        const fields = data.schema.fields.map(f => f.name);
        const row = data.rows[0].f.map(f => f.v);
        return Object.fromEntries(fields.map((k, i) => [k, row[i]]));
    } catch {
        return null;
    }
}
