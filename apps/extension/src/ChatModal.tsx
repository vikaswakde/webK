import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { API_URL } from './config';

interface PageContext {
  title: string;
  url: string;
  lang: string;
  metaDescription?: string;
  blockText?: string;
  beforeText?: string;
  afterText?: string;
  selectionHtml?: string;
}

interface ChatModalProps {
  selectedText: string;
  pageContext?: PageContext;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ selectedText, pageContext, onClose }) => {
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, stop, error: chatError } = useChat({
    transport: new DefaultChatTransport({
      api: API_URL,
      // Attach selected text on every request
      body: () => ({ selectedText, pageContext }),
    }),
  });

  const handleAsk = useCallback(() => {
    if (!question.trim()) return;
    sendMessage({ text: question });
    setQuestion('');
  }, [question, sendMessage]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const assistantText = useMemo(() => {
    const assistants = messages.filter((m) => m.role === 'assistant');
    if (assistants.length === 0) return '';
    const last = assistants[assistants.length - 1];
    return last.parts
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join('');
  }, [messages]);

  const domain = useMemo(() => {
    try {
      if (!pageContext?.url) return '';
      return new URL(pageContext.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [pageContext?.url]);

  const handleCopy = useCallback(() => {
    if (!assistantText) return;
    navigator.clipboard
      ?.writeText(assistantText)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  }, [assistantText]);

  const selectionPreview = useMemo(() => {
    if (!selectedText) return '';
    const normalized = selectedText.replace(/\s+/g, ' ').trim();
    const limit = 160;
    return normalized.length > limit ? normalized.slice(0, limit).trimEnd() + '…' : normalized;
  }, [selectedText]);

  // Do not auto-focus on mount/status to preserve page selection highlight.

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Type-to-focus: if user starts typing while modal is open, direct input to the textarea
  useEffect(() => {
    const onAnyKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (isTypingTarget) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) {
        textareaRef.current?.focus();
        setQuestion((prev) => prev + e.key);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onAnyKey);
    return () => window.removeEventListener('keydown', onAnyKey);
  }, []);

  // Auto-scroll messages to bottom on update
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (status === 'ready' && question.trim()) handleAsk();
      }
    },
    [handleAsk, question, status]
  );

  const onTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    // Auto-grow textarea height
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`; // cap growth
    }
  }, []);

  // Detect if the host page background is dark to conditionally harden button styles
  const [isDarkPageBackground, setIsDarkPageBackground] = useState(false);
  useEffect(() => {
    const parseRgb = (value: string): { r: number; g: number; b: number; a: number } | null => {
      const match = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/i);
      if (!match) return null;
      const r = Number(match[1]);
      const g = Number(match[2]);
      const b = Number(match[3]);
      const a = match[4] !== undefined ? Number(match[4]) : 1;
      return { r, g, b, a };
    };

    const getEffectiveBg = (): { r: number; g: number; b: number } => {
      const candidates: (HTMLElement | null)[] = [document.body, document.documentElement];
      for (const el of candidates) {
        if (!el) continue;
        const bg = getComputedStyle(el).backgroundColor || '';
        const rgba = parseRgb(bg);
        if (rgba && rgba.a > 0) {
          return { r: rgba.r, g: rgba.g, b: rgba.b };
        }
      }
      return { r: 255, g: 255, b: 255 };
    };

    const { r, g, b } = getEffectiveBg();
    const toLinear = (c: number) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    setIsDarkPageBackground(L < 0.5);
  }, []);

  const themeStyle = useMemo<React.CSSProperties>(() => {
    if (isDarkPageBackground) {
      return {
        ['--wk-surface' as any]: 'rgba(15,23,42,0.92)',
        ['--wk-text' as any]: '#e5e7eb',
        ['--wk-muted' as any]: '#94a3b8',
        ['--wk-border' as any]: '#334155',
        ['--wk-ring' as any]: 'rgba(56,189,248,0.3)',
        ['--wk-primaryFrom' as any]: '#0ea5e9',
        ['--wk-primaryTo' as any]: '#6366f1',
      } as React.CSSProperties;
    }
    return {
      ['--wk-surface' as any]: '#ffffff',
      ['--wk-text' as any]: '#0f172a',
      ['--wk-muted' as any]: '#64748b',
      ['--wk-border' as any]: '#e2e8f0',
      ['--wk-ring' as any]: 'rgba(56,189,248,0.4)',
      ['--wk-primaryFrom' as any]: '#0ea5e9',
      ['--wk-primaryTo' as any]: '#6366f1',
    } as React.CSSProperties;
  }, [isDarkPageBackground]);

  return (
    <div className="fixed top-4 right-4 z-[2147483647] w-[420px] max-w-[92vw] font-sans isolate">
      <div
        data-wk-theme={isDarkPageBackground ? 'dark' : 'light'}
        style={themeStyle}
        className={`relative overflow-hidden rounded-2xl shadow-md border ${
        isDarkPageBackground ? 'border-slate-700 text-slate-100 backdrop-blur-sm' : 'border-slate-300 bg-white text-slate-900'
      }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            backgroundImage: isDarkPageBackground
              ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(99,102,241,0.25))'
              : 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(203,213,225,0.35))',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
            boxSizing: 'border-box',
          }}
        />
        {isDarkPageBackground && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ backgroundColor: 'var(--wk-surface)' }}
          />
        )}
        <div className="relative z-10">
        <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${
          isDarkPageBackground ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold tracking-wide">Web‑K</span>
            <span className={`text-[10px] px-2 py-[2px] rounded-full border ${
              isDarkPageBackground ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>Beta</span>
            {domain && (
              <span className={`ml-2 truncate max-w-[160px] text-[11px] px-2 py-[2px] rounded-full border ${
                isDarkPageBackground ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {domain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {assistantText && (
              <button onClick={handleCopy} className={`text-xs ${isDarkPageBackground ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button>
            )}
            <button
              onClick={onClose}
              className={`w-7 h-7 grid place-items-center rounded-full ${
                isDarkPageBackground ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-black/5 text-slate-700'
              }`}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto" ref={scrollContainerRef}>
          {selectionPreview && (
            <div className="mb-3">
              <div className={`px-3 py-2 rounded-xl border ${
                isDarkPageBackground ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`mb-1 flex items-center justify-between text-[11px] ${isDarkPageBackground ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="tracking-wider uppercase">Selection</span>
                  <span>{selectedText.length} chars</span>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkPageBackground ? 'text-slate-300' : 'text-slate-600'} whitespace-nowrap overflow-hidden text-ellipsis`}>
                  {selectionPreview}
                </p>
              </div>
            </div>
          )}

          {(status === 'submitted' || status === 'streaming') && (
            <div className={`flex items-center gap-2 text-xs ${isDarkPageBackground ? 'text-slate-400/80' : 'text-slate-500/80'} mb-2`}>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Streaming…
            </div>
          )}

          {(chatError) && (
            <div className={`text-xs rounded-xl p-3 mb-2 border ${
              isDarkPageBackground ? 'bg-rose-950/40 text-rose-300 border-rose-900' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {chatError?.message}
            </div>
          )}

          {messages.length > 0 && (
            <div className={`rounded-xl p-3 space-y-2 border ${
              isDarkPageBackground ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
            }`}>
              {messages.map((m) => {
                const isUser = m.role === 'user';
                const text = m.parts
                  .map((part) => (part.type === 'text' ? part.text : ''))
                  .join('');
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                          : isDarkPageBackground
                            ? 'bg-slate-800 text-slate-100 border border-slate-700'
                            : 'bg-slate-50 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`px-4 pb-4 pt-2 border-t ${isDarkPageBackground ? 'border-slate-700' : 'border-slate-200'}`}>
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="Start typing to your question......"
            className={`w-full resize-none rounded-xl text-sm px-3 py-3 border focus:outline-hidden focus:ring-2 ${
              isDarkPageBackground
                ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400 focus:ring-sky-400/30 focus:border-slate-600'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-sky-400/40 focus:border-sky-300'
            }`}
            value={question}
            onChange={onTextareaChange}
            onKeyDown={onTextareaKeyDown}
            disabled={status !== 'ready'}
          />
          {/* <div className={`mt-2 text-[11px] ${isDarkPageBackground ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter to send • Shift+Enter for newline • Esc to close
          </div> */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAsk}
              className="group relative overflow-hidden isolate flex-1 py-2 rounded-xl font-medium text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 mix-blend-normal shadow-md ring-1 ring-sky-500/30 hover:ring-sky-500/40 appearance-none bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
              disabled={status !== 'ready' || !question.trim()}
              aria-label="Send message"
              style={isDarkPageBackground ? undefined : {}}
            >
              {isDarkPageBackground && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl transition-colors"
                  style={{
                    backgroundColor: 'rgb(2 132 199)',
                    backgroundImage: 'linear-gradient(to right, rgb(14 165 233), rgb(99 102 241))',
                  }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
              {status === 'ready' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                    <path d="M5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ask
                </>
              ) : 'Streaming…'}
              </span>
            </button>
            {(status === 'submitted' || status === 'streaming') && (
              <button
                onClick={handleStop}
                className={`px-3 py-2 rounded-xl text-sm ${
                  isDarkPageBackground ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
                type="button"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ChatModal;
