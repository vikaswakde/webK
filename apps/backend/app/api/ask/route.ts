import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type PageContext = {
  title?: string;
  url?: string;
  lang?: string;
  metaDescription?: string;
  blockText?: string;
  beforeText?: string;
  afterText?: string;
  selectionHtml?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, selectedText, pageContext } = body as {
      messages?: UIMessage[];
      selectedText?: string;
      pageContext?: PageContext;
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

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

[Before]
${before}

[After]
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

