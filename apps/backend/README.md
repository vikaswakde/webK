# Web-K Backend

This is a [Next.js](https://nextjs.org) application that serves as the backend for the Web-K browser extension. It provides a single API endpoint that uses the [Vercel AI SDK](https://sdk.vercel.ai/) to stream responses from Google's Gemini large language model.

## Features

- **AI-Powered API**: A single endpoint (`/api/ask`) that takes webpage context and a user question.
- **Streaming Responses**: Streams responses back to the client for a real-time chat experience.
- **Input Validation**: Uses [Zod](https://zod.dev/) to validate all incoming requests for security and stability.

## Technology Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Google Gemini](https://ai.google.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/)

## API Endpoint

### `POST /api/ask`

This endpoint accepts a JSON body with the context of a webpage and a series of messages, then streams a response from the AI.

**Request Body Schema:**

```json
{
  "messages": "Array<UIMessage>",
  "selectedText": "string",
  "pageContext": {
    "title": "string",
    "url": "string",
    "lang": "string",
    "metaDescription": "string",
    "blockText": "string",
    "beforeText": "string",
    "afterText": "string",
    "selectionHtml": "string"
  }
}
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [pnpm](https://pnpm.io/)
- A Google AI API key (for Gemini)

### Setup

1.  **Clone the repository.**

2.  **Install dependencies** from the root of the monorepo:
    ```bash
    pnpm install
    ```

3.  **Create a `.env.local` file** in the `apps/backend` directory and add your Google API key:
    ```
    GOOGLE_API_KEY="your-api-key-here"
    ```

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

The backend server will be running on [http://localhost:3000](http://localhost:3000).

---
