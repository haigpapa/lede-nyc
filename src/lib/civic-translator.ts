// civic-translator: calls Gemini Flash to synthesize anomaly data into LedeCard JSON
// Uses the Gemini REST API directly — no npm package needed

export interface AnomalyRow {
    zip: string;
    jobType: string;
    recent7d: number;
    avg90d: number;
    pctChange: number;
    topAddress: string;
}

export interface LedeCard {
    category: string;
    emoji: string;
    accentColor: string;
    headline: string;
    bullets: string[];
    timestamp: string;
    mapFocus?: string;
    sqlQuery?: string;
}

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are the Lede.nyc Civic Translator. Your job is to turn NYC construction permit anomaly data into clear, engaging news summaries for Manhattan residents.

STRICT RULES:
1. Write at a 6th-grade reading level. No jargon.
2. Each card gets exactly 3 bullet points. Each bullet ≤ 2 sentences.
3. Be specific: use real numbers from the data. Do NOT hallucinate or add information not in the data.
4. Tone: curious neighbor, not alarmist. Use emojis naturally.
5. accentColor MUST follow this exact mapping — no exceptions:
   - emerald: Growth / New Buildings / Housing (job types: NB, A1)
   - amber: Friction / Infrastructure / Alterations (job types: A2, SG, EW, BL)
   - rose: Disruption / Demolitions / Safety (job types: DM, FP, EQ)
   Never use sky, violet, or orange.
6. If data is ambiguous or missing, generate a card that says so clearly. Do NOT make up stats.
7. Output ONLY valid JSON — no markdown, no explanation, no extra text.
8. ALL content must be about Manhattan neighborhoods only. Never reference Brooklyn, Queens, the Bronx, or Staten Island in headlines or bullets.
9. mapFocus must always be a Manhattan neighborhood slug matching the anomaly ZIP code. Use this mapping:
   10001=chelsea, 10002=lower-east-side, 10003=east-village, 10004=financial-district,
   10005=financial-district, 10006=financial-district, 10007=civic-center, 10009=east-village,
   10010=gramercy, 10011=chelsea, 10012=soho, 10013=tribeca, 10014=west-village,
   10016=murray-hill, 10017=midtown, 10018=hells-kitchen, 10019=midtown-west,
   10020=midtown, 10021=upper-east-side, 10022=midtown-east, 10023=upper-west-side,
   10024=upper-west-side, 10025=upper-west-side, 10026=harlem, 10027=harlem,
   10028=upper-east-side, 10029=east-harlem, 10030=harlem, 10031=washington-heights,
   10032=washington-heights, 10033=washington-heights, 10034=inwood, 10035=east-harlem,
   10036=hells-kitchen, 10037=harlem, 10038=financial-district, 10039=harlem,
   10040=inwood, 10044=roosevelt-island, 10065=upper-east-side, 10069=upper-west-side,
   10075=upper-east-side, 10128=upper-east-side, 10280=battery-park-city, 10282=battery-park-city`;

const USER_PROMPT_TEMPLATE = (rows: AnomalyRow[], date: string) => `
Today is ${date}. Here are the Manhattan permit anomalies detected by the Lede.nyc BigQuery pipeline:

${JSON.stringify(rows, null, 2)}

Generate a JSON array of 1–3 LedeCard objects. Each must have:
- category: short category name (e.g. "Construction", "Housing", "Demolitions", "Infrastructure")
- emoji: one relevant emoji
- accentColor: emerald (NB/A1 permits), amber (A2/SG/EW/BL permits), or rose (DM/FP/EQ permits)
- headline: punchy headline ≤ 10 words, specific to Manhattan neighborhood
- bullets: array of exactly 3 strings, Manhattan-only content
- timestamp: "${date}T06:00:00Z"
- mapFocus: Manhattan neighborhood slug derived from the anomaly ZIP code (use the mapping in your instructions)
- sqlQuery: leave as empty string ""

Output ONLY the JSON array. No markdown fences. No explanation.`;

export async function translateAnomalies(rows: AnomalyRow[]): Promise<LedeCard[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY env var not set');

    const date = new Date().toISOString().split('T')[0];
    const url = `${GEMINI_API}?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: USER_PROMPT_TEMPLATE(rows, date) }] }],
            generationConfig: {
                temperature: 0.3,   // low temp = factual, not creative
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API failed (${res.status}): ${err}`);
    }

    const data = await res.json() as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Gemini returned empty response');

    // Parse and validate
    let cards: LedeCard[];
    try {
        cards = JSON.parse(text);
    } catch {
        throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
    }

    if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error('Gemini returned empty cards array');
    }

    // Schema validation: every card must have required fields
    const VALID_COLORS = new Set(['emerald', 'amber', 'rose']);
    // Job type → canonical color mapping for post-processing override
    const jobTypeColorMap: Record<string, string> = {
        NB: 'emerald', A1: 'emerald',
        A2: 'amber', SG: 'amber', EW: 'amber', BL: 'amber', PL: 'amber',
        DM: 'rose', FP: 'rose', EQ: 'rose',
    };
    for (const card of cards) {
        if (!card.headline || !card.bullets || !Array.isArray(card.bullets)) {
            throw new Error(`Invalid card structure: ${JSON.stringify(card).slice(0, 100)}`);
        }
        // Enforce color triad — reject any non-canonical color
        if (!VALID_COLORS.has(card.accentColor)) {
            card.accentColor = 'amber'; // safe fallback
        }
        if (!card.timestamp) card.timestamp = `${date}T06:00:00Z`;
    }
    // Cross-reference with source anomaly data to correct mismatched colors
    for (let i = 0; i < cards.length && i < rows.length; i++) {
        const expectedColor = jobTypeColorMap[rows[i].jobType];
        if (expectedColor && !VALID_COLORS.has(cards[i].accentColor)) {
            cards[i].accentColor = expectedColor;
        }
    }

    return cards;
}
