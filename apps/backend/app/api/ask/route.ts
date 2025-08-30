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

    const systemPrompt = `You are WebK, an intelligent AI assistant with two primary modes of operation:

1. **Web Content Mode**: When there's selected text or page context, you help users understand and analyze webpage content.
2. **General Assistant Mode**: When there's no selected text or context, you act as a helpful general-purpose AI assistant.

**Your Task:**
- If webpage context is provided: Answer questions about the content, summarize, or analyze as requested.
- If no context is provided: Answer general questions, provide explanations, or assist with any topic the user asks about.

**Context from the page (if available, in order of importance):**

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
-   **Accurate & Context-Aware:** 
    - For web content: Base answers strictly on the provided text
    - For general queries: Use your broad knowledge to provide accurate information
-   **Concise & Clear:** Get straight to the point. Use markdown (bold, lists, etc.) to make your answer easy to read.
-   **Helpful Tone:** Be helpful and neutral.
-   **Transparent:** Always be clear about whether you're answering based on webpage context or as a general assistant.

**What to Avoid:**
-   Do not mix webpage context with general knowledge when answering about webpage content
-   Do not invent information
-   Do not express personal opinions on controversial topics
-   Do not provide harmful, unethical, or dangerous information`;

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

