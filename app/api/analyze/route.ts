import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getGeminiApiKey, getGeminiPrompt } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const { front, back } = await req.json();

    if (!front || !back) {
      return NextResponse.json({ error: 'Both front and back images are required.' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key configured. Add it in Settings or set GEMINI_API_KEY in .env.local.' },
        { status: 503 }
      );
    }

    const parseParts = (dataUri: string) => {
      const [header, data] = dataUri.split(',');
      if (!header || !data) throw new Error('Invalid image data URI');
      const mimeMatch = header.match(/:(.*?);/);
      if (!mimeMatch) throw new Error('Could not determine image MIME type');
      return { mimeType: mimeMatch[1], data };
    };

    const frontParts = parseParts(front);
    const backParts = parseParts(back);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      tools: [{ googleSearch: {} } as any],
    });

    const response = await model.generateContent([
      getGeminiPrompt(),
      { inlineData: frontParts },
      { inlineData: backParts },
    ]);

    const text = response.response.text();
    const cleanedText = text.replace(/```json|```/g, '').trim();

    let data: unknown;
    try {
      data = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        { error: 'Gemini returned unparseable JSON.', raw: cleanedText.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze images: ' + error.message }, { status: 500 });
  }
}
