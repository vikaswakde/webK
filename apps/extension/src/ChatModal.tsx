import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { API_URL } from './config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Send, X, Copy, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      if (e.key !== 'Escape') {
        e.stopPropagation();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (status === 'ready' && question.trim()) handleAsk();
      }
    },
    [handleAsk, question, status]
  );

  const onTextareaKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Escape') {
      e.stopPropagation();
    }
  }, []);

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setTheme(mediaQuery.matches ? 'dark' : 'light');
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


  return (
    <div className={`fixed top-4 right-4 z-[2147483647] w-[25%] max-w-[92vw] font-sans isolate ${theme}`}>
      <Card
        className="relative overflow-hidden rounded-2xl shadow-md border"
      >
        
        <div className="relative z-10">
        <CardHeader className="flex items-center justify-between gap-3 px-4 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-sm font-semibold tracking-wide">WebK</CardTitle>
            {domain && (
              <Badge variant="outline" className="ml-1 truncate max-w-[160px] text-[10px] px-2 py-[2px] text-gray-300 ">
                {domain}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {assistantText && (
                          <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
              aria-live="polite"
            >
              <Copy className="h-3 w-3 mr-1" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-7 rounded-full p-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 max-h-[60vh] overflow-y-auto space-y-4" ref={scrollContainerRef}>
          {selectionPreview && (
            <div className="mb-4 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Selection • {selectedText.length} chars
              </Label>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {selectionPreview}
                </p>
              </div>
            </div>
          )}

          {(status === 'submitted' || status === 'streaming') && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}

          {(chatError) && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {chatError?.message}
              </AlertDescription>
            </Alert>
          )}

          {messages.length > 0 && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                const text = m.parts
                  .map((part) => (part.type === 'text' ? part.text : ''))
                  .join('');
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                        isUser
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-background border shadow-sm'
                      }`}
                    >
                      {isUser ? text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col items-stretch px-4 pt-3 space-y-3 border-t">
          <Textarea
            ref={textareaRef}
            rows={3}
            placeholder="Ask anything about the selected text..."
            className="min-h-[80px] resize-none"
            value={question}
            onChange={onTextareaChange}
            onKeyDown={onTextareaKeyDown}
            onKeyUp={onTextareaKeyUp}
            disabled={status !== 'ready'}
          />
          {/* <div className={`mt-2 text-[11px] ${isDarkPageBackground ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter to send • Shift+Enter for newline • Esc to close
          </div> */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAsk}
              className="flex-1"
              disabled={status !== 'ready' || !question.trim()}
              aria-label="Send message"
            >
              {status === 'ready' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              )}
            </Button>
            {(status === 'submitted' || status === 'streaming') && (
              <Button
                variant="outline"
                onClick={handleStop}
                type="button"
              >
                Stop
              </Button>
            )}
          </div>
        </CardFooter>
      </div>
      </Card>
    </div>
  );
};

export default ChatModal;
