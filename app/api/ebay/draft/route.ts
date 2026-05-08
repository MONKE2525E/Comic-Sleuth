import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey, getEbayDraftPrompt, getMaxRetries } from '@/lib/settings';
import { z } from 'zod';

const DraftResponseSchema = z.object({
  reply: z.string(),
  comics: z.array(z.object({
    id: z.number(),
    price: z.number(),
    title: z.string(),
    ebayDescription: z.string(),
    categoryId: z.string(),
    conditionId: z.string()
  }))
});

const RequestSchema = z.object({
  messages: z.array(z.any()).min(1),
  comics: z.array(z.any()).min(1).max(10)
});

export async function POST(req: Request) {
  try {
    const validation = RequestSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request: ' + validation.error.message }, { status: 400 });
    }
    const { messages, comics } = validation.data;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // We use flash model for drafting flow
      systemInstruction: getEbayDraftPrompt(),
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const maxRetries = getMaxRetries();
    let attempt = 0;
    let resultText = '';

    // History transformation
    let history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1];

    let finalPrompt = lastMessage.content;
    finalPrompt += '\n\n--- Comics Batch to Process ---\n';
    
    // Pick specific fields to send to save tokens
    const comicsPayload = comics.map((c: any) => ({
      id: c.id,
      title: c.title,
      issueNumber: c.issueNumber,
      publisher: c.publisher,
      year: c.year,
      gradeEstimate: c.gradeEstimate,
      gradingNotes: c.gradingNotes,
      valueEstimate: c.valueEstimate,
      keyFeatures: c.keyFeatures,
      ebayDescription: c.ebayDescription
    }));

    finalPrompt += JSON.stringify(comicsPayload, null, 2);

    const chat = model.startChat({ history });

    while (attempt < maxRetries) {
      try {
        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        resultText = response.text();
        break;
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Failed to generate eBay drafting response after ${maxRetries} attempts: ` + err.message);
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    let parsedResponse;
    try {
      const rawJson = JSON.parse(resultText);
      parsedResponse = DraftResponseSchema.parse(rawJson);
    } catch (e: any) {
      throw new Error('AI returned incomplete data (missing category, condition, or invalid JSON): ' + e.message);
    }

    const requestedIds = comicsPayload.map((c: any) => c.id);
    const returnedIds = parsedResponse.comics.map((c: any) => c.id);
    const missingIds = requestedIds.filter((id: number) => !returnedIds.includes(id));
    const extraIds = returnedIds.filter((id: number) => !requestedIds.includes(id));
    
    if (missingIds.length > 0 || extraIds.length > 0) {
      throw new Error(`AI returned mismatched comics. Missing: [${missingIds.join(', ')}]. Extra: [${extraIds.join(', ')}]. Please refine your prompt and try again.`);
    }

    return NextResponse.json(parsedResponse);
  } catch (error: any) {
    console.error('eBay Draft API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
