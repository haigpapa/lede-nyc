// Reusable cron auth middleware
// All pipeline endpoints call requireCronSecret(req) first

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the Authorization: Bearer <CRON_SECRET> header.
 * Returns null if valid, or a NextResponse(401) to return immediately.
 *
 * Usage:
 *   const authError = requireCronSecret(req);
 *   if (authError) return authError;
 */
export function requireCronSecret(req: NextRequest): NextResponse | null {
    const secret = process.env.CRON_SECRET;

    // If CRON_SECRET not configured (local dev without it set), allow localhost only
    if (!secret) {
        const host = req.headers.get('host') ?? '';
        if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
            return null; // OK for local dev
        }
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (token !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null; // authorized
}

/** Generate a short unique run ID: `run_YYYYMMDD_xxxx` */
export function makeRunId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6);
    return `run_${date}_${rand}`;
}
