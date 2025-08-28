# Web-K Chrome Extension

This is the browser extension front-end for Web-K, an AI assistant that helps you understand and interact with content on any webpage.

## Features

- **Contextual AI Chat**: Select any text on a webpage and instantly ask questions about it.
- **Hotkey Activation**: Press `Cmd+Shift+K` (or `Ctrl+Shift+K`) to open the chat modal.
- **Secure and Isolated**: Uses a Shadow DOM to prevent CSS conflicts and isolate the extension's UI from the host page.
- **Built for Security**: Hardened with modern security practices, including a strict Content Security Policy (via Manifest V3), use of `DOMPurify` for sanitization, and restricted permissions.

## Technology Stack

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [CRXJS](https://crxjs.dev/) Vite Plugin for building Chrome extensions
- [Tailwind CSS](https://tailwindcss.com/)
- [@ai-sdk/react](https://sdk.vercel.ai/docs/introduction) for the chat interface

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [pnpm](https://pnpm.io/)
- Google Chrome or a Chromium-based browser

### Development Setup

1.  **Clone the repository.**

2.  **Install dependencies** from the root of the monorepo:
    ```bash
    pnpm install
    ```

3.  **Start the development server:**
    This command will watch for file changes and rebuild the extension automatically.
    ```bash
    pnpm dev
    ```

### Browser Installation

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **"Developer mode"** using the toggle in the top-right corner.
3.  Click the **"Load unpacked"** button.
4.  Select the `apps/extension/dist` directory from the project folder.

The extension icon should now appear in your browser's toolbar. After making code changes, the extension will auto-reload. In some cases, you may need to manually click the "reload" button for the extension in the `chrome://extensions` page.

---
