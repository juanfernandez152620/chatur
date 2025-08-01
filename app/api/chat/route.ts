// app/api/chat/route.ts

import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

// Permite que las respuestas en streaming duren hasta 30 segundos
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Variable para el mensaje de sistema
  const systemMessage = 'Tu nombre es pedro sos un psicologo virtual asegurate de ecplicarle eso a tu paciente y acutar como tal.';

  const result = streamText({
    model: openai('gpt-4o-mini'), // Modelo cambiado a gpt-4o-mini
    // Agregamos el mensaje de sistema al principio de la conversación
    messages: [{ role: 'system', content: systemMessage }, ...convertToModelMessages(messages)],
  });

  return result.toUIMessageStreamResponse();
}