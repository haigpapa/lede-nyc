import { NextRequest, NextResponse } from 'next/server';

// NYC Open Data endpoints (public, no auth required)
const HPD_VIOLATIONS_URL = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json';
const DOB_VIOLATIONS_URL = 'https://data.cityofnewyork.us/resource/3h2n-5cm9.json';

// Types returned by this API
export interface HpdViolation {
    violationid: string;
    inspectiondate: string;
    class: 'A' | 'B' | 'C' | 'I';
    novdescription: string;
    currentstatus: string;
    closedate?: string;
}

export interface DobViolation {
    isn_dob_bis_viol: string;
    issue_date: string;
    violation_type_code: string;
    description: string;
    disposition_date?: string;
    ecb_violation_status?: string;
}

export interface DiligenceReport {
    address: string;
    queriedAt: string;
    landlordHealthScore: number;   // 0-100
    hpd: {
        total: number;
        classA: number;  // minor
        classB: number;  // moderate
        classC: number;  // hazardous
        classI: number;  // immediately hazardous
        open: number;
        violations: HpdViolation[];
    };
    dob: {
        total: number;
        open: number;
        violations: DobViolation[];
    };
    summary: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    flags: string[];
}

function calcHealthScore(hpdTotal: number, hpdC: number, hpdI: number, dobOpen: number): number {
    let score = 100;
    score -= Math.min(hpdTotal * 2, 30);   // -2 per HPD violation (cap 30)
    score -= hpdC * 5;                      // -5 per Class C (hazardous)
    score -= hpdI * 10;                     // -10 per Class I (immed. hazardous)
    score -= dobOpen * 3;                   // -3 per open DOB violation
    return Math.max(0, Math.round(score));
}

function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'high';
    return 'critical';
}

function buildFlags(hpd: DiligenceReport['hpd'], dob: DiligenceReport['dob']): string[] {
    const flags: string[] = [];
    if (hpd.classC > 3) flags.push(`${hpd.classC} Class C (hazardous) HPD violations`);
    if (hpd.classI > 0) flags.push(`${hpd.classI} Class I (immediately hazardous) — escalated`);
    if (hpd.open > 5) flags.push(`${hpd.open} unresolved HPD violations`);
    if (dob.open > 2) flags.push(`${dob.open} open DOB violations — potential work-without-permit`);
    if (hpd.total === 0 && dob.total === 0) flags.push('No violation history found — clean record or new building');
    return flags;
}

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address');
    if (!address) {
        return NextResponse.json({ error: 'address param required' }, { status: 400 });
    }

    // Normalize: "123 Main St Brooklyn" → uppercase for API
    const normalizedAddress = address.toUpperCase().trim();

    try {
        // Parallel fetch from NYC Open Data (last 3 years of violations)
        const [hpdRes, dobRes] = await Promise.allSettled([
            fetch(`${HPD_VIOLATIONS_URL}?$where=address='${encodeURIComponent(normalizedAddress)}'&$limit=200&$order=inspectiondate DESC`),
            fetch(`${DOB_VIOLATIONS_URL}?$where=upper(issue_address)='${encodeURIComponent(normalizedAddress)}'&$limit=100&$order=issue_date DESC`),
        ]);

        // Parse HPD violations
        let hpdViolations: HpdViolation[] = [];
        if (hpdRes.status === 'fulfilled' && hpdRes.value.ok) {
            const raw = await hpdRes.value.json();
            hpdViolations = (raw as Array<Record<string, string>>).map(v => ({
                violationid: v.violationid ?? '',
                inspectiondate: v.inspectiondate ?? '',
                class: (v.class ?? 'A') as HpdViolation['class'],
                novdescription: v.novdescription ?? v.violation ?? '',
                currentstatus: v.currentstatus ?? '',
                closedate: v.closedate,
            }));
        }

        // Parse DOB violations
        let dobViolations: DobViolation[] = [];
        if (dobRes.status === 'fulfilled' && dobRes.value.ok) {
            const raw = await dobRes.value.json();
            dobViolations = (raw as Array<Record<string, string>>).map(v => ({
                isn_dob_bis_viol: v.isn_dob_bis_viol ?? '',
                issue_date: v.issue_date ?? '',
                violation_type_code: v.violation_type_code ?? '',
                description: v.description ?? '',
                disposition_date: v.disposition_date,
                ecb_violation_status: v.ecb_violation_status,
            }));
        }

        // Aggregate HPD
        const hpdClassA = hpdViolations.filter(v => v.class === 'A').length;
        const hpdClassB = hpdViolations.filter(v => v.class === 'B').length;
        const hpdClassC = hpdViolations.filter(v => v.class === 'C').length;
        const hpdClassI = hpdViolations.filter(v => v.class === 'I').length;
        const hpdOpen = hpdViolations.filter(v => !v.closedate && v.currentstatus !== 'VIOLATION CLOSED').length;
        const dobOpen = dobViolations.filter(v => !v.disposition_date).length;

        const score = calcHealthScore(hpdViolations.length, hpdClassC, hpdClassI, dobOpen);
        const riskLevel = getRiskLevel(score);

        const hpdSummary = {
            total: hpdViolations.length,
            classA: hpdClassA,
            classB: hpdClassB,
            classC: hpdClassC,
            classI: hpdClassI,
            open: hpdOpen,
            violations: hpdViolations.slice(0, 20),
        };

        const dobSummary = {
            total: dobViolations.length,
            open: dobOpen,
            violations: dobViolations.slice(0, 10),
        };

        const summary = hpdViolations.length === 0 && dobViolations.length === 0
            ? 'No violations found for this address. The building has a clean record in NYC Open Data.'
            : `This building has ${hpdViolations.length} HPD violation${hpdViolations.length !== 1 ? 's' : ''} and ${dobViolations.length} DOB violation${dobViolations.length !== 1 ? 's' : ''} on record. ${hpdOpen} HPD violations remain open.`;

        const report: DiligenceReport = {
            address: normalizedAddress,
            queriedAt: new Date().toISOString(),
            landlordHealthScore: score,
            hpd: hpdSummary,
            dob: dobSummary,
            summary,
            riskLevel,
            flags: buildFlags(hpdSummary, dobSummary),
        };

        return NextResponse.json(report);
    } catch (err) {
        console.error('[diligence] Error:', err);
        return NextResponse.json({ error: 'Failed to fetch violation data' }, { status: 500 });
    }
}
