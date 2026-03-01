import { NextRequest, NextResponse } from 'next/server';

// POST /api/tts
// Body: { text: string }
// Returns: audio/mpeg binary stream
//
// Uses Google Cloud Text-to-Speech API (v1).
// Requires: GOOGLE_CLOUD_TTS_API_KEY env var (server-side only, not NEXT_PUBLIC_)
// Voice: en-US-Journey-F — warm, journalistic, editorial tone

export async function POST(req: NextRequest) {
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'GOOGLE_CLOUD_TTS_API_KEY is not configured' },
            { status: 503 }
        );
    }

    let text: string;
    try {
        const body = await req.json();
        text = body.text?.trim();
        if (!text) throw new Error('empty text');
    } catch {
        return NextResponse.json({ error: 'Invalid request body — expected { text: string }' }, { status: 400 });
    }

    // Truncate to 5000 chars (Google TTS limit for standard requests)
    const clippedText = text.slice(0, 5000);

    const ttsPayload = {
        input: { text: clippedText },
        voice: {
            languageCode: 'en-US',
            name: 'en-US-Journey-F',   // Studio-quality voice, editorial tone
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0,
            effectsProfileId: ['headphone-class-device'],
        },
    };

    const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ttsPayload),
        }
    );

    if (!ttsRes.ok) {
        const errBody = await ttsRes.text();
        console.error('[TTS] Google API error:', ttsRes.status, errBody);
        return NextResponse.json(
            { error: `Google TTS returned ${ttsRes.status}` },
            { status: 502 }
        );
    }

    const { audioContent } = await ttsRes.json() as { audioContent: string };

    // audioContent is base64-encoded MP3 — decode and stream back
    const audioBuffer = Buffer.from(audioContent, 'base64');

    return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600', // cache for 1 hour
        },
    });
}
