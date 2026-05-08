import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { getGeminiApiKey, getGeminiModel, getChatPrompt, getMaxRetries } from '@/lib/settings';
import db from '@/lib/db';

interface ChatMessage {
  role: string;
  content: string;
  mentionedComics?: any[];
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required and must not be empty.' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModel() || 'gemini-2.5-flash',
      systemInstruction: getChatPrompt(),
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const maxRetries = getMaxRetries();
    let attempt = 0;
    let resultText = '';

    // Transform the messages array for Gemini
    // We want the final message to be passed into generateContent
    // But since this is a chat, we could use startChat
    let history = messages.slice(0, -1).map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Gemini requires the first message in history to be from the 'user'.
    // If our history starts with a 'model' message (like the initial greeting), we must remove it.
    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1];

    // Build the payload for the final message
    let finalPrompt = lastMessage.content;
    if (lastMessage.mentionedComics && lastMessage.mentionedComics.length > 0) {
      finalPrompt += '\n\n--- Mentioned Comics Context ---\n';
      finalPrompt += JSON.stringify(lastMessage.mentionedComics, null, 2);
    }

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
          throw new Error(`Failed to generate chat response after ${maxRetries} attempts: ` + err.message);
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt)); // exponential backoff
      }
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(resultText);
    } catch (e) {
      throw new Error('AI returned malformed JSON: ' + resultText);
    }

    // Perform database updates if requested
    if (parsedResponse.action === 'edit_comic' && parsedResponse.comic_id && parsedResponse.updates) {
      const updates = parsedResponse.updates;
      const allowedKeys = [
        'title',
        'issueNumber',
        'publisher',
        'year',
        'gradeEstimate',
        'gradingNotes',
        'valueEstimate',
        'keyFeatures',
        'suggestedSKU',
        'ebayDescription',
      ];

      const setClauses: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (setClauses.length > 0) {
        values.push(parsedResponse.comic_id); // for the WHERE id = ?
        db.prepare(`UPDATE listings SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
      }
    }

    return NextResponse.json(parsedResponse);
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
