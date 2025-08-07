import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedText, question } = body;

    if (!selectedText || !question) {
      return NextResponse.json(
        { error: 'Missing selectedText or question in request body' },
        { status: 400 }
      );
    }

    console.log('Received data on backend:');
    console.log('Selected Text:', selectedText);
    console.log('Question:', question);

    // Dummy response for now
    const aiResponse = `This is a dummy response from the backend. You asked: "${question}" about the text: "${selectedText.substring(0, 50)}..."`;

    return NextResponse.json({ success: true, response: aiResponse });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

