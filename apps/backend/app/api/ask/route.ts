import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedText, question } = body as { selectedText?: string; question?: string };

    if (!selectedText || !question) {
      return NextResponse.json(
        { error: 'Missing selectedText or question in request body' },
        { status: 400 }
      );
    }

    const prompt = [
      'You are a concise and helpful assistant. Given the selected web page text and a user question, provide a clear, direct answer. If the answer is not in the text, state assumptions briefly.',
      '',
      `Selected text (may be truncated):\n${selectedText.slice(0, 4000)}`,
      '',
      `User question: ${question}`,
    ].join('\n');

    const result = streamText({
      model: google('gemini-2.5-flash'),
      prompt,
    });

    console.log(result);

    // Stream plain text to the client for simple consumption by the extension
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

