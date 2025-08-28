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

    const systemPrompt = `You are WebK, an intelligent web assistant. Your mission is to help users understand, summarize, and get answers about the content of the webpage they are currently viewing. You are an expert at parsing web content and providing insightful and accurate answers based *only* on the provided context.

**Your Task:**
Answer the user's question about the webpage content.

**Context from the page (in order of importance):**

**1. [Selection]** - The user's highlighted text.
${selection}

**2. [Selection HTML]** - Raw HTML of the selection for structural context (links, formatting).
${selectionHtml}

**3. [Block]** - The larger content block around the selection.
${block}

**4. [Surrounding Content]**
[Before Block]
${before}
[After Block]
${after}

**5. [Page Metadata]**
Title: ${title}
URL: ${url}
Lang: ${lang}
Meta: ${meta}

**Response Guidelines:**
-   **Accurate & Grounded:** Base your answers strictly on the provided text. If the answer isn't in the context, state that clearly.
-   **Concise & Clear:** Get straight to the point. Use markdown (bold, lists, etc.) to make your answer easy to read.
-   **Helpful Tone:** Be helpful and neutral.
-   **No Guessing:** If the context is ambiguous or insufficient, state that you cannot answer from the provided information and ask a clarifying question if you can.

**What to Avoid:**
-   Do not use any external knowledge unless the user asks for a general explanation of a concept found in the text.
-   Do not invent information.
-   Do not express personal opinions.`;

    const result = await streamText({
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

