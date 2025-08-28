import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const PageContextSchema = z.object({
  title: z.string().optional(),
  url: z.url().optional(),
  lang: z.string().optional(),
  metaDescription: z.string().optional(),
  blockText: z.string().optional(),
  beforeText: z.string().optional(),
  afterText: z.string().optional(),
  selectionHtml: z.string().optional(),
});

const RequestSchema = z.object({
  //TODO: add definite schema later
  messages: z.array(z.any()).min(1), // Basic check for an array of messages
  selectedText: z.string().optional(),
  pageContext: PageContextSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { messages, selectedText, pageContext } = validation.data;

    const selection = (selectedText ?? '').slice(0, 4000);
    const block = (pageContext?.blockText ?? '').slice(0, 2000);
    const before = (pageContext?.beforeText ?? '').slice(0, 1200);
    const after = (pageContext?.afterText ?? '').slice(0, 1200);
    const title = pageContext?.title ?? '';
    const url = pageContext?.url ?? '';
    const lang = pageContext?.lang ?? '';
    const meta = (pageContext?.metaDescription ?? '').slice(0, 400);
    const selectionHtml = (pageContext?.selectionHtml ?? '').slice(0, 2000);

    const systemPrompt = `You are a concise and helpful assistant for explaining or answering questions about selected web content.

  Use the following prioritized context. Prefer the Selection. If insufficient, use Block, then Before/After. If still unclear, ask a brief clarifying question instead of guessing.

[Page]
Title: ${title}
URL: ${url}
Lang: ${lang}
Meta: ${meta}

[Selection]
${selection}

[Selection HTML] (may be truncated)
${selectionHtml}

[Block]
${block}

[Before Block]
${before}

[After Block]
${after}`;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
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

