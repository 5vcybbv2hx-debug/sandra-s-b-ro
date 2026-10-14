import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useElara } from '@/lib/ElaraContext';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'elara-chat-history';
const MAX_MESSAGES = 50;

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

export default function ElaraChatPanel() {
  const { open, closeElara } = useElara();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage (trimmed)
  useEffect(() => {
    const trimmed = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, waiting]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || waiting) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setWaiting(true);

    try {
      const res = await base44.functions.invoke('elaraMessage', { message: text });
      const reply = res?.data?.reply || 'Elara hat keine Antwort gesendet.';
      const isError = res?.data?.error === true;
      setMessages(prev => [...prev, {
        role: 'elara',
        content: reply,
        timestamp: Date.now(),
        error: isError
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'elara',
        content: 'Elara ist gerade nicht erreichbar — bitte später nochmal versuchen.',
        timestamp: Date.now(),
        error: true
      }]);
    } finally {
      setWaiting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 md:hidden"
        onClick={closeElara}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full md:w-[400px] bg-white border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-brand-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Elara</p>
            <p className="text-xs text-muted-foreground">KI-Assistent</p>
          </div>
          <button
            onClick={closeElara}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-cardbg hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-brand-dark" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Hallo, ich bin Elara</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Frag mich etwas zur App oder beschreibe, was du ändern möchtest.
                Änderungswünsche stimme ich automatisch mit Pierre ab.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[85%] px-3.5 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-2xl rounded-br-md'
                    : msg.error
                      ? 'bg-destructive/10 text-destructive rounded-2xl rounded-bl-md'
                      : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
                )}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {waiting && (
            <div className="flex items-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={waiting}
              rows={1}
              placeholder="Elara fragen…"
              className="flex-1 resize-none rounded-xl border border-input bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 max-h-32 min-h-[44px]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || waiting}
              className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}