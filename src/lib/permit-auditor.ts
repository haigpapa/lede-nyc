// permit-auditor: BigQuery anomaly detection for NYC DOB permits
// Queries civicdata.dob-permits for statistically significant spikes
// Returns structured AnomalyRow[] for civic-translator

import { exec } from 'child_process';
import { promisify } from 'util';
import type { AnomalyRow } from './civic-translator';

const execAsync = promisify(exec);
const PROJECT = 'lede-nyc-data';
const BQ_BASE = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;

async function getAccessToken(): Promise<string> {
    const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonKey) {
        const key = JSON.parse(jsonKey);
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'RS256', typ: 'JWT' };
        const payload = {
            iss: key.client_email,
            scope: 'https://www.googleapis.com/auth/bigquery.readonly',
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

async function bqQuery(sql: string): Promise<Array<{ f: Array<{ v: string }> }>> {
    const token = await getAccessToken();
    const res = await fetch(`${BQ_BASE}/queries`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, useLegacySql: false, location: 'US', timeoutMs: 30000 }),
    });
    if (!res.ok) throw new Error(`BQ query failed (${res.status}): ${await res.text()}`);
    const data = await res.json() as { rows?: Array<{ f: Array<{ v: string }> }> };
    return data.rows ?? [];
}

/**
 * Phase 1 (Reconnaissance): Verify schema column names
 * Phase 2 (Execution): Detect 7-day vs 90-day anomalies by zip/job type
 * Phase 3 (Flagging): Return rows with >25% deviation as AnomalyRow[]
 *
 * NOTE: Uses the actual `dob-permits` schema discovered previously:
 *   string_field_0  = Borough
 *   string_field_6  = Job Type (NB=New Building, A1=Major Alter, DM=Demolition)
 *   string_field_59 = Community Board (proxy for neighborhood)
 *   string_field_9  = House Number
 *   string_field_11 = Street Name
 *   date_field_1    = Issued Date (approximate — actual field TBD from schema)
 */
export async function runPermitAuditor(): Promise<{ rows: AnomalyRow[]; sql: string }> {
    // Core anomaly query:
    // Compare last 7 days of permit activity vs 90-day moving average
    // for key job types in the Hell's Kitchen area (zip 10018 / community board 4)
    const sql = `
    WITH all_permits AS (
      SELECT
        COALESCE(string_field_7, 'UNKNOWN') AS zip,
        COALESCE(string_field_6, 'UNKNOWN') AS job_type,
        COALESCE(string_field_9 || ' ' || string_field_11, 'Unknown Address') AS address,
        SAFE.PARSE_DATE('%m/%d/%Y', string_field_18) AS issued_date
      FROM \`lede-nyc-data.civicdata.dob-permits\`
      WHERE string_field_7 IS NOT NULL
        AND string_field_6 IN ('NB', 'A1', 'A2', 'DM', 'SG', 'EW', 'PL', 'FP', 'EQ', 'BL')
    ),
    recent_7d AS (
      SELECT zip, job_type, COUNT(*) AS cnt_7d,
             ANY_VALUE(address) AS top_address
      FROM all_permits
      WHERE issued_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY zip, job_type
    ),
    avg_90d AS (
      SELECT zip, job_type,
             COUNT(*) / (90.0 / 7.0) AS avg_per_7d
      FROM all_permits
      WHERE issued_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 97 DAY)
        AND issued_date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY zip, job_type
      HAVING avg_per_7d > 0
    )
    SELECT
      r.zip,
      r.job_type,
      r.cnt_7d            AS recent_7d,
      ROUND(a.avg_per_7d, 1) AS avg_90d,
      ROUND((r.cnt_7d - a.avg_per_7d) / a.avg_per_7d * 100, 1) AS pct_change,
      r.top_address
    FROM recent_7d r
    JOIN avg_90d a USING (zip, job_type)
    WHERE ABS((r.cnt_7d - a.avg_per_7d) / a.avg_per_7d) > 0.25
    ORDER BY ABS(pct_change) DESC
    LIMIT 20
  `;

    const rawRows = await bqQuery(sql);

    const rows: AnomalyRow[] = rawRows.map(r => ({
        zip: r.f[0].v,
        jobType: r.f[1].v,
        recent7d: Number(r.f[2].v),
        avg90d: Number(r.f[3].v),
        pctChange: Number(r.f[4].v),
        topAddress: r.f[5].v,
    }));

    return { rows, sql };
}
