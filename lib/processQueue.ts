import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db';
import { getGeminiApiKey, getGeminiPrompt, getMaxRetries } from './settings';

export async function processQueueItem(id: number, frontImagePath: string, backImagePath: string) {
  const MAX_RETRIES = getMaxRetries();
  let attempts = 0;

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    db.prepare("UPDATE scan_queue SET status = 'error', error = ? WHERE id = ?")
      .run('No Gemini API key configured. Add it in Settings or set GEMINI_API_KEY in .env.local.', id);
    return;
  }

  const prompt = getGeminiPrompt();

  while (attempts < MAX_RETRIES) {
    try {
      attempts++;

      const frontBuffer = fs.readFileSync(path.join(process.cwd(), 'public', frontImagePath));
      const backBuffer = fs.readFileSync(path.join(process.cwd(), 'public', backImagePath));

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-pro-preview',
        tools: [{ googleSearch: {} } as any],
      });

      const response = await model.generateContent([
        prompt,
        { inlineData: { data: frontBuffer.toString('base64'), mimeType: 'image/jpeg' } },
        { inlineData: { data: backBuffer.toString('base64'), mimeType: 'image/jpeg' } },
      ]);

      const text = response.response.text();
      const cleanedText = text.replace(/```json|```/g, '').trim();

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch {
        throw new Error(`Gemini returned invalid JSON: ${cleanedText.slice(0, 300)}`);
      }

      db.prepare("UPDATE scan_queue SET status = 'completed', result = ?, error = NULL WHERE id = ?")
        .run(JSON.stringify(parsedData), id);
      return;

    } catch (err: any) {
      console.error(`Attempt ${attempts} failed for queue item ${id}:`, err);

      const isNetworkError =
        err.message?.includes('EAI_AGAIN') ||
        err.message?.includes('fetch failed') ||
        err.message?.includes('getaddrinfo');

      if (isNetworkError && attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        continue;
      }

      db.prepare("UPDATE scan_queue SET status = 'error', error = ? WHERE id = ?")
        .run(err.message || 'Unknown error', id);
      break;
    }
  }
}
