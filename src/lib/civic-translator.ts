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

const SYSTEM_PROMPT = `You are the Lede.nyc Civic Translator. Your job is to turn NYC construction permit anomaly data into clear, engaging news summaries for Hell's Kitchen residents.

STRICT RULES:
1. Write at a 6th-grade reading level. No jargon.
2. Each card gets exactly 3 bullet points. Each bullet ≤ 2 sentences.
3. Be specific: use real numbers from the data. Do NOT hallucinate or add information not in the data.
4. Tone: curious neighbor, not alarmist. Use emojis naturally.
5. accentColor must be one of: emerald, amber, rose, sky, violet, orange
6. If data is ambiguous or missing, generate a card that says so clearly. Do NOT make up stats.
7. Output ONLY valid JSON — no markdown, no explanation, no extra text.`;

const USER_PROMPT_TEMPLATE = (rows: AnomalyRow[], date: string) => `
Today is ${date}. Here are the permit anomalies detected for Hell's Kitchen (zip 10018) and nearby areas:

${JSON.stringify(rows, null, 2)}

Generate a JSON array of 1–3 LedeCard objects. Each must have:
- category: short category name (e.g. "Construction", "Housing", "Safety")
- emoji: one relevant emoji
- accentColor: one of emerald/amber/rose/sky/violet/orange
- headline: punchy headline ≤ 10 words
- bullets: array of exactly 3 strings
- timestamp: "${date}T06:00:00Z"
- mapFocus: "hells-kitchen" (always)
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
    const VALID_COLORS = new Set(['emerald', 'amber', 'rose', 'sky', 'violet', 'orange']);
    for (const card of cards) {
        if (!card.headline || !card.bullets || !Array.isArray(card.bullets)) {
            throw new Error(`Invalid card structure: ${JSON.stringify(card).slice(0, 100)}`);
        }
        if (!VALID_COLORS.has(card.accentColor)) {
            card.accentColor = 'amber'; // safe fallback
        }
        if (!card.timestamp) card.timestamp = `${date}T06:00:00Z`;
    }

    return cards;
}
