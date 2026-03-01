// POST/GET /api/store-mta-snapshot
// Fetches current MTA line statuses and INSERTs them into BigQuery
// Uses BigQuery REST API directly — no @google-cloud/bigquery package needed.
//
// Auth: CRON_SECRET bearer token (see src/lib/auth.ts)
// Called by: /api/pipeline/run (POST), Vercel cron daily at 05:00 UTC (GET)

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MtaStatusResponse } from '@/app/api/mta-status/route';

const execAsync = promisify(exec);
const PROJECT = 'lede-nyc-data';
const DATASET = 'civicdata';
const TABLE_ID = 'mta_reliability';
const BQ_BASE = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getLocalToken(): Promise<string> {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
}

async function getServiceAccountToken(json: string): Promise<string> {
    const key = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/bigquery',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const enc = (obj: object) =>
        Buffer.from(JSON.stringify(obj)).toString('base64url');

    const unsigned = `${enc(header)}.${enc(payload)}`;

    // Sign with RS256 using the private key
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(unsigned);
    const sig = sign.sign(key.private_key, 'base64url');
    const jwt = `${unsigned}.${sig}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const data = await res.json() as { access_token: string };
    return data.access_token;
}

async function getAccessToken(): Promise<string> {
    const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonKey) return getServiceAccountToken(jsonKey);
    return getLocalToken();
}

// ── BigQuery helpers ──────────────────────────────────────────────────────────

async function bqQuery(sql: string, token: string): Promise<void> {
    const res = await fetch(`${BQ_BASE}/queries`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, useLegacySql: false, location: 'US' }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`BigQuery query failed (${res.status}): ${err}`);
    }
}

async function bqInsert(rows: object[], token: string): Promise<void> {
    const body = {
        rows: rows.map((r, i) => ({ insertId: String(i), json: r })),
    };
    const url = `${BQ_BASE}/datasets/${DATASET}/tables/${TABLE_ID}/insertAll`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`BigQuery insertAll failed (${res.status}): ${err}`);
    }
    const data = await res.json() as { insertErrors?: unknown[] };
    if (data.insertErrors?.length) {
        throw new Error(`BigQuery insert errors: ${JSON.stringify(data.insertErrors)}`);
    }
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function handler() {
    // 1. Fetch current MTA status
    const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    const res = await fetch(`${origin}/api/mta-status`);
    if (!res.ok) throw new Error(`mta-status fetch failed: ${res.status}`);
    const data: MtaStatusResponse = await res.json();

    const now = new Date();
    const snapshotDate = now.toISOString().split('T')[0];
    const snapshotTs = now.toISOString();

    // 2. Get auth token
    const token = await getAccessToken();

    // 3. Delete today's existing rows (idempotent re-run)
    await bqQuery(
        `DELETE FROM \`${PROJECT}.${DATASET}.${TABLE_ID}\` WHERE snapshot_date = '${snapshotDate}'`,
        token,
    );

    // 4. Insert fresh rows
    const rows = data.lines.map(line => ({
        snapshot_date: snapshotDate,
        snapshot_ts: snapshotTs,
        line: line.line,
        status: line.status,
        severity: line.severity,
        reliability: line.reliability,
        source: data.source,
    }));

    await bqInsert(rows, token);

    return { ok: true, date: snapshotDate, linesStored: rows.length, source: data.source };
}

export async function POST(req: NextRequest) {
    const authErr = requireCronSecret(req);
    if (authErr) return authErr;

    try {
        const result = await handler();
        return NextResponse.json(result);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[store-mta-snapshot]', msg);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

// Vercel cron uses GET
export async function GET(req: NextRequest) {
    return POST(req);
}
