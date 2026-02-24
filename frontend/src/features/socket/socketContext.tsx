import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';

import type { AppDispatch } from '@/app/store';
import { baseApi } from '@/shared/api/baseApi';
import type { MessageItem } from '@/shared/api';
import { useAuth } from '@/features/auth';
import { getAccessTokenKey } from '@/features/auth/model/authSlice';

const SOCKET_PATH = '/socket.io';

/** In dev, connect directly to backend to avoid Vite ws proxy ECONNABORTED. */
function getSocketBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return `${window.location.protocol}//${window.location.host}`;
}

export interface SocketMessageNewPayload extends MessageItem {}

export interface TypingPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface VideoCallRequestPayload {
  conversationId: string;
  callerId: string;
  callerNickname?: string;
}

export interface VideoCallAcceptPayload {
  conversationId: string;
  calleeId: string;
}

export interface VideoCallRejectPayload {
  conversationId: string;
  calleeId: string;
}

export interface VideoCallEndPayload {
  conversationId: string;
  durationSeconds?: number;
}

export interface VideoCallSignalPayload {
  conversationId: string;
  signal: unknown;
}

type MessageNewListener = (payload: SocketMessageNewPayload) => void;
type TypingListener = (payload: TypingPayload) => void;
type VideoCallRequestListener = (payload: VideoCallRequestPayload) => void;
type VideoCallAcceptListener = (payload: VideoCallAcceptPayload) => void;
type VideoCallRejectListener = (payload: VideoCallRejectPayload) => void;
type VideoCallEndListener = (payload: VideoCallEndPayload) => void;
type VideoCallOfferListener = (payload: VideoCallSignalPayload) => void;
type VideoCallAnswerListener = (payload: VideoCallSignalPayload) => void;
type VideoCallIceListener = (payload: VideoCallSignalPayload) => void;

/** Conversation IDs where the other participant is currently typing (for chat list preview). */
const TYPING_FALLBACK_MS = 5000;

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: Set<string>;
  typingConversationIds: Set<string>;
  subscribeMessageNew: (fn: MessageNewListener) => () => void;
  subscribeTyping: (fn: TypingListener) => () => void;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  subscribeVideoCallRequest: (fn: VideoCallRequestListener) => () => void;
  subscribeVideoCallAccept: (fn: VideoCallAcceptListener) => () => void;
  subscribeVideoCallReject: (fn: VideoCallRejectListener) => () => void;
  subscribeVideoCallEnd: (fn: VideoCallEndListener) => () => void;
  subscribeVideoCallOffer: (fn: VideoCallOfferListener) => () => void;
  subscribeVideoCallAnswer: (fn: VideoCallAnswerListener) => () => void;
  subscribeVideoCallIce: (fn: VideoCallIceListener) => () => void;
  emitVideoCallRequest: (conversationId: string, callerNickname?: string) => void;
  emitVideoCallAccept: (conversationId: string) => void;
  emitVideoCallReject: (conversationId: string) => void;
  emitVideoCallEnd: (conversationId: string, durationSeconds?: number) => void;
  emitVideoCallOffer: (conversationId: string, targetUserId: string, signal: unknown) => void;
  emitVideoCallAnswer: (conversationId: string, targetUserId: string, signal: unknown) => void;
  emitVideoCallIce: (conversationId: string, targetUserId: string, signal: unknown) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [typingConversationIds, setTypingConversationIds] = useState<Set<string>>(() => new Set());
  const messageNewListeners = useRef<Set<MessageNewListener>>(new Set());
  const typingListeners = useRef<Set<TypingListener>>(new Set());
  const videoCallRequestListeners = useRef<Set<VideoCallRequestListener>>(new Set());
  const videoCallAcceptListeners = useRef<Set<VideoCallAcceptListener>>(new Set());
  const videoCallRejectListeners = useRef<Set<VideoCallRejectListener>>(new Set());
  const videoCallEndListeners = useRef<Set<VideoCallEndListener>>(new Set());
  const videoCallOfferListeners = useRef<Set<VideoCallOfferListener>>(new Set());
  const videoCallAnswerListeners = useRef<Set<VideoCallAnswerListener>>(new Set());
  const videoCallIceListeners = useRef<Set<VideoCallIceListener>>(new Set());
  const typingFallbackRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const socketRef = useRef<Socket | null>(null);

  const subscribeMessageNew = useCallback((fn: MessageNewListener) => {
    messageNewListeners.current.add(fn);
    return () => {
      messageNewListeners.current.delete(fn);
    };
  }, []);

  const subscribeTyping = useCallback((fn: TypingListener) => {
    typingListeners.current.add(fn);
    return () => {
      typingListeners.current.delete(fn);
    };
  }, []);

  const subscribeVideoCallRequest = useCallback((fn: VideoCallRequestListener) => {
    videoCallRequestListeners.current.add(fn);
    return () => { videoCallRequestListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallAccept = useCallback((fn: VideoCallAcceptListener) => {
    videoCallAcceptListeners.current.add(fn);
    return () => { videoCallAcceptListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallReject = useCallback((fn: VideoCallRejectListener) => {
    videoCallRejectListeners.current.add(fn);
    return () => { videoCallRejectListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallEnd = useCallback((fn: VideoCallEndListener) => {
    videoCallEndListeners.current.add(fn);
    return () => { videoCallEndListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallOffer = useCallback((fn: VideoCallOfferListener) => {
    videoCallOfferListeners.current.add(fn);
    return () => { videoCallOfferListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallAnswer = useCallback((fn: VideoCallAnswerListener) => {
    videoCallAnswerListeners.current.add(fn);
    return () => { videoCallAnswerListeners.current.delete(fn); };
  }, []);
  const subscribeVideoCallIce = useCallback((fn: VideoCallIceListener) => {
    videoCallIceListeners.current.add(fn);
    return () => { videoCallIceListeners.current.delete(fn); };
  }, []);

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem(getAccessTokenKey()) : null;
    if (!user || !token) {
      setSocket((s) => {
        if (s) s.disconnect();
        return null;
      });
      setConnected(false);
      setOnlineUserIds(new Set());
      return;
    }

    const url = getSocketBaseUrl();
    const newSocket = io(url, {
      path: SOCKET_PATH,
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => {
      setConnected(false);
      setOnlineUserIds(new Set());
      setTypingConversationIds(new Set());
      Object.values(typingFallbackRef.current).forEach(clearTimeout);
      typingFallbackRef.current = {};
    });

    newSocket.on('message:new', (payload: SocketMessageNewPayload) => {
      dispatch(baseApi.util.invalidateTags(['Conversations']));
      messageNewListeners.current.forEach((fn) => fn(payload));
    });

    newSocket.on('user:status', (payload: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    });

    newSocket.on('user:status:initial', (payload: { userIds: string[] }) => {
      setOnlineUserIds(new Set(payload.userIds ?? []));
    });

    newSocket.on('typing', (payload: TypingPayload) => {
      typingListeners.current.forEach((fn) => fn(payload));
      const isOther = payload.userId !== user?.id;
      if (payload.isTyping && isOther) {
        setTypingConversationIds((prev) => new Set(prev).add(payload.conversationId));
        if (typingFallbackRef.current[payload.conversationId]) {
          clearTimeout(typingFallbackRef.current[payload.conversationId]);
        }
        typingFallbackRef.current[payload.conversationId] = setTimeout(() => {
          delete typingFallbackRef.current[payload.conversationId];
          setTypingConversationIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.conversationId);
            return next;
          });
        }, TYPING_FALLBACK_MS);
      } else {
        if (typingFallbackRef.current[payload.conversationId]) {
          clearTimeout(typingFallbackRef.current[payload.conversationId]);
          delete typingFallbackRef.current[payload.conversationId];
        }
        setTypingConversationIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.conversationId);
          return next;
        });
      }
    });

    newSocket.on('video-call:request', (payload: VideoCallRequestPayload) => {
      videoCallRequestListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:accept', (payload: VideoCallAcceptPayload) => {
      videoCallAcceptListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:reject', (payload: VideoCallRejectPayload) => {
      videoCallRejectListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:end', (payload: VideoCallEndPayload) => {
      videoCallEndListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:offer', (payload: VideoCallSignalPayload) => {
      videoCallOfferListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:answer', (payload: VideoCallSignalPayload) => {
      videoCallAnswerListeners.current.forEach((fn) => fn(payload));
    });
    newSocket.on('video-call:ice', (payload: VideoCallSignalPayload) => {
      videoCallIceListeners.current.forEach((fn) => fn(payload));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return () => {
      socketRef.current = null;
      Object.values(typingFallbackRef.current).forEach(clearTimeout);
      typingFallbackRef.current = {};
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [dispatch, user?.id]);

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('typing', { conversationId, isTyping });
    }
  }, []);

  const emitVideoCallRequest = useCallback((conversationId: string, callerNickname?: string) => {
    socketRef.current?.emit('video-call:request', { conversationId, callerNickname });
  }, []);
  const emitVideoCallAccept = useCallback((conversationId: string) => {
    socketRef.current?.emit('video-call:accept', { conversationId });
  }, []);
  const emitVideoCallReject = useCallback((conversationId: string) => {
    socketRef.current?.emit('video-call:reject', { conversationId });
  }, []);
  const emitVideoCallEnd = useCallback((conversationId: string, durationSeconds?: number) => {
    socketRef.current?.emit('video-call:end', { conversationId, durationSeconds });
  }, []);
  const emitVideoCallOffer = useCallback((conversationId: string, targetUserId: string, signal: unknown) => {
    socketRef.current?.emit('video-call:offer', { conversationId, targetUserId, signal });
  }, []);
  const emitVideoCallAnswer = useCallback((conversationId: string, targetUserId: string, signal: unknown) => {
    socketRef.current?.emit('video-call:answer', { conversationId, targetUserId, signal });
  }, []);
  const emitVideoCallIce = useCallback((conversationId: string, targetUserId: string, signal: unknown) => {
    socketRef.current?.emit('video-call:ice', { conversationId, targetUserId, signal });
  }, []);

  const value: SocketContextValue = {
    socket,
    connected,
    onlineUserIds,
    typingConversationIds,
    subscribeMessageNew,
    subscribeTyping,
    emitTyping,
    subscribeVideoCallRequest,
    subscribeVideoCallAccept,
    subscribeVideoCallReject,
    subscribeVideoCallEnd,
    subscribeVideoCallOffer,
    subscribeVideoCallAnswer,
    subscribeVideoCallIce,
    emitVideoCallRequest,
    emitVideoCallAccept,
    emitVideoCallReject,
    emitVideoCallEnd,
    emitVideoCallOffer,
    emitVideoCallAnswer,
    emitVideoCallIce,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
}
