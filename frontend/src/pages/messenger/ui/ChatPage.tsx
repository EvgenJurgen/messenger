import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useSocket } from '@/features/socket';
import { useLazyGetMessagesQuery, useSendMessageMutation } from '@/shared/api';
import type { MessageItem } from '@/shared/api';
import { ApiError } from '@/shared/api';
import { useTranslation } from 'react-i18next';
import { useToast } from './Toast';

const PAGE_SIZE = 30;

/** Ensure message has required fields and createdAt is string (avoids render crashes). Accepts camelCase or snake_case. */
function normalizeMessage(raw: unknown): MessageItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : undefined;
  const conversationId = typeof o.conversationId === 'string' ? o.conversationId : typeof o.conversation_id === 'string' ? o.conversation_id : undefined;
  const senderId = typeof o.senderId === 'string' ? o.senderId : typeof o.sender_id === 'string' ? o.sender_id : undefined;
  const content = typeof o.content === 'string' ? o.content : '';
  const createdAtRaw = o.createdAt ?? o.created_at;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : typeof createdAtRaw === 'string'
        ? createdAtRaw
        : undefined;
  if (!id || !conversationId || !senderId || !createdAt) return null;
  return { id, conversationId, senderId, content, createdAt };
}

function formatMessageTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PaperPlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4L22 2Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { subscribeMessageNew, subscribeTyping, emitTyping } = useSocket();
  const { t } = useTranslation();
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingDots, setTypingDots] = useState(1);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [fetchMessages, { isFetching }] = useLazyGetMessagesQuery();
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const fetchMessagesRef = useRef(fetchMessages);
  fetchMessagesRef.current = fetchMessages;

  const TYPING_STOP_MS = 2500;

  useEffect(() => {
    if (!conversationId) return;
    return subscribeMessageNew((payload) => {
      if (payload.conversationId !== conversationId) return;
      const msg = normalizeMessage(payload);
      if (msg) setMessages((prev) => [...prev, msg]);
    });
  }, [conversationId, subscribeMessageNew]);

  const typingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeTyping((payload) => {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return;
      setOtherUserTyping(payload.isTyping);
      if (typingFallbackRef.current) {
        clearTimeout(typingFallbackRef.current);
        typingFallbackRef.current = null;
      }
      if (payload.isTyping) {
        typingFallbackRef.current = setTimeout(() => setOtherUserTyping(false), 5000);
      }
    });
    return () => {
      unsub();
      if (typingFallbackRef.current) {
        clearTimeout(typingFallbackRef.current);
        typingFallbackRef.current = null;
      }
    };
  }, [conversationId, subscribeTyping, user?.id]);

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    setOtherUserTyping(false);
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (conversationId) emitTyping(conversationId, false);
  }, [conversationId, emitTyping]);

  useEffect(() => {
    if (!otherUserTyping) return;
    const id = setInterval(() => {
      setTypingDots((n) => (n >= 3 ? 1 : n + 1));
    }, 400);
    return () => clearInterval(id);
  }, [otherUserTyping]);

  const loadMore = useCallback(() => {
    if (!conversationId || messages.length === 0 || !hasMore || isFetching) return;
    const oldestId = messages[0].id;
    const fetch = fetchMessagesRef.current;
    fetch({ conversationId, limit: PAGE_SIZE, before: oldestId }).then((res: { data?: { messages: unknown[]; hasMore: boolean } }) => {
      if (!res.data) return;
      const list = res.data.messages.map(normalizeMessage).filter((m): m is MessageItem => m != null);
      setMessages((prev) => [...list, ...prev]);
      setHasMore(res.data.hasMore);
    });
  }, [conversationId, messages.length, hasMore, isFetching]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      return;
    }
    setMessages([]);
    setHasMore(true);
    const fetch = fetchMessagesRef.current;
    fetch({ conversationId, limit: PAGE_SIZE }).then((res: { data?: { messages: unknown[]; hasMore: boolean } }) => {
      if (!res.data) return;
      const list = res.data.messages.map(normalizeMessage).filter((m): m is MessageItem => m != null);
      setMessages(list);
      setHasMore(res.data.hasMore);
    });
  }, [conversationId]);

  useEffect(() => {
    const el = topSentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId) return;
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    emitTyping(conversationId, false);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setShowScrollbar(false);
    }
    try {
      const raw = await sendMessage({ conversationId, content: text }).unwrap();
      const newMsg = normalizeMessage(raw);
      if (newMsg) setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      const msg = ApiError.getDisplayText(err, t, 'error.generic');
      toast.error(msg);
    }
  }, [input, conversationId, sendMessage, emitTyping, t, toast]);

  const onTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const ta = e.target;
      ta.style.height = 'auto';
      const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 300;
      ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
      requestAnimationFrame(() => {
        const atMaxHeight = ta.offsetHeight >= maxHeight - 2;
        const hasOverflow = ta.scrollHeight > ta.clientHeight;
        setShowScrollbar(atMaxHeight && hasOverflow);
      });
      if (!conversationId) return;
      emitTyping(conversationId, true);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = setTimeout(() => {
        typingStopTimeoutRef.current = null;
        emitTyping(conversationId, false);
      }, TYPING_STOP_MS);
    },
    [conversationId, emitTyping],
  );

  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        {t('chat.selectChat') || 'Select a chat'}
      </div>
    );
  }

  // Build message list with date separators (skip messages without valid createdAt)
  const messageGroups: { date: string; messages: MessageItem[] }[] = [];
  let currentDate = '';
  for (const m of messages) {
    if (!m?.id || m.createdAt == null) continue;
    const d = new Date(m.createdAt).toDateString();
    if (d !== currentDate && d !== 'Invalid Date') {
      currentDate = d;
      messageGroups.push({ date: formatDateSeparator(m.createdAt), messages: [m] });
    } else if (messageGroups.length > 0) {
      messageGroups[messageGroups.length - 1].messages.push(m);
    } else {
      messageGroups.push({ date: formatDateSeparator(m.createdAt), messages: [m] });
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header is rendered by MessengerHeader with photo + nickname */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col-reverse p-4">
        {isFetching && messages.length === 0 && (
          <p className="text-sm text-muted py-4">Loading...</p>
        )}
        {messageGroups.slice().reverse().map((group) => (
          <div key={group.date} className="py-1">
            <p className="text-center text-sm text-accent py-2">{group.date}</p>
            {group.messages.map((m) => (
              <div
                key={m.id}
                className={`py-1 ${m.senderId === user?.id ? 'flex justify-end' : 'flex justify-start'}`}
              >
                <div
                  className={`inline-flex flex-col max-w-[75%] rounded-lg px-3 py-1.5 text-sm ${
                    m.senderId === user?.id
                      ? 'bg-accent text-white'
                      : 'bg-secondary text-foreground-primary'
                  }`}
                >
                  <span className="break-words">{m.content}</span>
                  <span
                    className={`text-[10px] mt-0.5 flex justify-end gap-0.5 ${
                      m.senderId === user?.id ? 'text-white/80' : 'text-muted'
                    }`}
                  >
                    {formatMessageTime(m.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={topSentinelRef} className="h-1" />
      </div>
      {otherUserTyping && (
        <div className="shrink-0 px-4 py-1 text-sm text-muted">
          {t('chat.typing')}
          <span className="inline-block min-w-[1.5em] text-left">
            {'.'.repeat(typingDots)}
          </span>
        </div>
      )}
      <div className="shrink-0 border-t border-border p-2 flex items-end gap-2 bg-secondary">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onTextareaChange}
          onKeyDown={onTextareaKeyDown}
          placeholder={t('chat.typeMessage') || 'Message'}
          rows={1}
          className={`flex-1 min-h-[40px] max-h-[50vh] rounded-lg border border-border bg-primary px-3 py-2 text-foreground-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none overflow-y-auto ${
            showScrollbar ? 'chat-input-scroll-visible' : 'chat-input-scroll-hidden'
          }`}
          style={{ height: '40px' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none transition-colors"
          aria-label={t('chat.send') || 'Send'}
        >
          <PaperPlaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
