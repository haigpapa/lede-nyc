// GET /api/mta-trend?line=A&line=C&days=90
// Queries BigQuery mta_reliability for historical reliability scores
// Uses BigQuery REST API directly — no @google-cloud/bigquery package needed

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT = 'lede-nyc-data';
const BQ_BASE = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;

export interface LineTrend {
    line: string;
    dates: string[];
    scores: number[];
}

export interface MtaTrendResponse {
    trends: LineTrend[];
    daysBack: number;
    rowCount: number;
}

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
        scope: 'https://www.googleapis.com/auth/bigquery.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
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

async function getAccessToken(): Promise<string> {
    const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonKey) return getServiceAccountToken(jsonKey);
    return getLocalToken();
}

interface BqRow { line: string; date: string; avg_reliability: { value: string } | number }

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const lines = params.getAll('line');
    const daysBack = Math.min(Number(params.get('days') ?? '90'), 365);

    const lineFilter = lines.length > 0
        ? `AND line IN (${lines.map(l => `'${l.replace(/'/g, '')}'`).join(',')})`
        : '';

    const sql = `
    SELECT
      line,
      FORMAT_DATE('%Y-%m-%d', snapshot_date) AS date,
      AVG(reliability) AS avg_reliability
    FROM \`${PROJECT}.civicdata.mta_reliability\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    ${lineFilter}
    GROUP BY line, snapshot_date
    ORDER BY line, snapshot_date ASC
  `;

    try {
        const token = await getAccessToken();
        const res = await fetch(`${BQ_BASE}/queries`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sql, useLegacySql: false, location: 'US', timeoutMs: 10000 }),
        });

        if (!res.ok) throw new Error(`BQ query failed: ${res.status}`);
        const result = await res.json() as { rows?: Array<{ f: Array<{ v: string }> }> };

        const rawRows: BqRow[] = (result.rows ?? []).map(r => ({
            line: r.f[0].v,
            date: r.f[1].v,
            avg_reliability: parseFloat(r.f[2].v),
        }));

        // Group by line
        const byLine = new Map<string, { dates: string[]; scores: number[] }>();
        for (const row of rawRows) {
            if (!byLine.has(row.line)) byLine.set(row.line, { dates: [], scores: [] });
            const e = byLine.get(row.line)!;
            e.dates.push(row.date);
            e.scores.push(Math.round(Number(row.avg_reliability)));
        }

        const trends: LineTrend[] = Array.from(byLine.entries()).map(([line, v]) => ({
            line, dates: v.dates, scores: v.scores,
        }));

        return NextResponse.json({ trends, daysBack, rowCount: rawRows.length } satisfies MtaTrendResponse);

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[mta-trend]', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
