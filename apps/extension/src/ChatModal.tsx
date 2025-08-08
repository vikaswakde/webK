import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

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
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>('auto');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, stop, error: chatError } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:3001/api/ask',
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

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'auto' ? 'dark' : prev === 'dark' ? 'light' : 'auto'));
  }, []);

  const containerBase = 'relative rounded-2xl backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]';
  const containerTheme = isDark
    ? 'border border-white/15 bg-neutral-900/70 text-slate-100'
    : 'border border-black/10 bg-white/85 text-slate-900';

  const headerChipTheme = isDark
    ? 'bg-white/10 border-white/10 text-slate-200/90'
    : 'bg-slate-100 border-slate-200 text-slate-700';

  const subtleCardTheme = isDark
    ? 'bg-white/5 border-white/10'
    : 'bg-slate-50 border-slate-200';

  const aiBubbleTheme = isDark
    ? 'bg-white/8 text-slate-100 border border-white/10'
    : 'bg-slate-50 text-slate-800 border border-slate-200';

  const copyBtnTheme = isDark
    ? 'text-sky-300 hover:text-sky-200'
    : 'text-sky-600 hover:text-sky-700';

  const closeHoverTheme = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5';

  const hintTextTheme = isDark ? 'text-slate-300/70' : 'text-slate-500';

  // Focus the textarea on mount and when returning to ready state
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      textareaRef.current?.focus();
    }
  }, [status]);

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

  return (
    <div className="fixed top-4 right-4 z-2147483647 w-[420px] max-w-[92vw] font-sans">
      <div className={`${containerBase} ${containerTheme}`}>
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isDark ? 'border-b border-white/10' : 'border-b border-black/10'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold tracking-wide">Web‑K</span>
            <span className={`text-[10px] px-2 py-[2px] rounded-full border ${headerChipTheme}`}>Beta</span>
            {domain && (
              <span className={`ml-2 truncate max-w-[160px] text-[11px] px-2 py-[2px] rounded-full border ${headerChipTheme}`}>
                {domain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
              className={`text-xs ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-900'}`}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            {assistantText && (
              <button onClick={handleCopy} className={`text-xs ${copyBtnTheme}`} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button>
            )}
            <button
              onClick={onClose}
              className={`w-7 h-7 grid place-items-center rounded-full ${closeHoverTheme} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto" ref={scrollContainerRef}>
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300/80">
              <span className="tracking-wider uppercase">Selection</span>
              <span>{selectedText.length} chars</span>
            </div>
            <div className={`p-3 rounded-xl max-h-40 overflow-y-auto ${subtleCardTheme}`}>
              <p className={`text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-200/90' : 'text-slate-700'}`}>{selectedText}</p>
            </div>
          </div>

          {(status === 'submitted' || status === 'streaming') && (
            <div className="flex items-center gap-2 text-xs text-slate-300/80 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Streaming…
            </div>
          )}

          {(chatError) && (
            <div className="text-xs bg-rose-500/15 text-rose-200 border border-rose-500/30 rounded-xl p-3 mb-2">
              {chatError?.message}
            </div>
          )}

          {messages.length > 0 && (
            <div className={`rounded-xl p-3 space-y-2 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-slate-200 bg-slate-50'}`}>
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
                          ? isDark
                            ? 'bg-gradient-to-r from-sky-600/70 to-indigo-600/70 text-white'
                            : 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                          : aiBubbleTheme
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

        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="Ask about the selection…"
            className="w-full resize-none rounded-xl text-sm px-3 py-3 bg-white/8 border border-white/15 placeholder:text-slate-300/60 focus:outline-hidden focus:ring-2 focus:ring-sky-400/40 focus:border-white/20 text-slate-100"
            value={question}
            onChange={onTextareaChange}
            onKeyDown={onTextareaKeyDown}
            disabled={status !== 'ready'}
          />
          <div className={`mt-2 text-[11px] ${hintTextTheme}`}>
            Enter to send • Shift+Enter for newline • Esc to close
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAsk}
              className="flex-1 py-2 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              disabled={status !== 'ready' || !question.trim()}
              aria-label="Send message"
            >
              {status === 'ready' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                    <path d="M5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ask
                </>
              ) : 'Streaming…'}
            </button>
            {(status === 'submitted' || status === 'streaming') && (
              <button
                onClick={handleStop}
                className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'border border-white/15 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                type="button"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
