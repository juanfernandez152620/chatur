// app/api/chat/route.js

import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';

// Permite respuestas de streaming de hasta 30 segundos
export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}