import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, selectedText } = body as { messages?: UIMessage[]; selectedText?: string };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: `You are a concise and helpful assistant. Use the provided selected web page text as primary context when relevant. If the answer isn't in the text, state assumptions briefly.\n\nSelected text (may be truncated):\n${(selectedText ?? '').slice(0, 4000)}`,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

