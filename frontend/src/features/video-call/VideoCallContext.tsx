import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSocket } from '@/features/socket';
import { useAuth } from '@/features/auth';
import { useSendMessageMutation } from '@/shared/api';

export type VideoCallMode = 'calling' | 'incoming' | 'in-call';

export interface VideoCallState {
  mode: VideoCallMode;
  conversationId: string;
  /** The other peer: caller when we're callee, callee when we're caller */
  otherUserId: string;
  otherNickname?: string;
  isCaller: boolean;
  /** Set when call is connected (in-call); used for duration. */
  connectedAt?: number;
}

const CALL_TIMEOUT_MS = 45000;

const VideoCallContext = createContext<{
  call: VideoCallState | null;
  startCall: (conversationId: string, otherUserId: string, otherNickname?: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
} | null>(null);

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
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
  } = useSocket();
  const [sendMessage] = useSendMessageMutation();

  const [call, setCall] = useState<VideoCallState | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendVideoCallRequestMessage = useCallback(
    (conversationId: string) => {
      sendMessage({
        conversationId,
        content: 'Video call request',
      }).catch(() => {});
    },
    [sendMessage],
  );

  const sendVideoCallDurationMessage = useCallback(
    (conversationId: string, durationSeconds: number) => {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = Math.floor(durationSeconds % 60);
      const parts: string[] = [];
      if (hours > 0) parts.push(String(hours).padStart(2, '0'));
      parts.push(String(minutes).padStart(2, '0'));
      parts.push(String(seconds).padStart(2, '0'));
      const durationStr = parts.join(':');
      sendMessage({
        conversationId,
        content: `Video call ${durationStr}`,
      }).catch(() => {});
    },
    [sendMessage],
  );

  const cleanupMedia = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const endCall = useCallback(() => {
    const current = call;
    if (current) {
      if (current.mode === 'calling' && current.isCaller && callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      const durationSeconds =
        current.connectedAt != null
          ? Math.floor((Date.now() - current.connectedAt) / 1000)
          : undefined;
      if (current.isCaller && durationSeconds != null && durationSeconds > 0) {
        sendVideoCallDurationMessage(current.conversationId, durationSeconds);
      }
      emitVideoCallEnd(current.conversationId, durationSeconds);
    }
    setCall(null);
    cleanupMedia();
  }, [call, emitVideoCallEnd, sendVideoCallDurationMessage, cleanupMedia]);

  const startCall = useCallback(
    (conversationId: string, otherUserId: string, otherNickname?: string) => {
      cleanupMedia();
      setCall({
        mode: 'calling',
        conversationId,
        otherUserId,
        otherNickname,
        isCaller: true,
      });
      emitVideoCallRequest(conversationId, otherNickname);
      callTimeoutRef.current = setTimeout(() => {
        callTimeoutRef.current = null;
        setCall((c) => {
          if (c?.mode === 'calling' && c.isCaller) {
            sendVideoCallRequestMessage(c.conversationId);
            return null;
          }
          return c;
        });
        cleanupMedia();
      }, CALL_TIMEOUT_MS);
    },
    [
      cleanupMedia,
      emitVideoCallRequest,
      sendVideoCallRequestMessage,
    ],
  );

  const acceptCall = useCallback(() => {
    const c = call;
    if (!c || c.mode !== 'incoming') return;
    setCall((prev) => (prev ? { ...prev, mode: 'in-call', connectedAt: Date.now() } : null));
    emitVideoCallAccept(c.conversationId);
  }, [call, emitVideoCallAccept]);

  const rejectCall = useCallback(() => {
    const c = call;
    if (c) {
      if (c.mode === 'incoming') {
        emitVideoCallReject(c.conversationId);
      }
      setCall(null);
    }
    cleanupMedia();
  }, [call, emitVideoCallReject, cleanupMedia]);

  useEffect(() => {
    const unsubReq = subscribeVideoCallRequest((payload) => {
      if (payload.callerId === user?.id) return;
      setCall({
        mode: 'incoming',
        conversationId: payload.conversationId,
        otherUserId: payload.callerId,
        otherNickname: payload.callerNickname,
        isCaller: false,
      });
    });

    const unsubAccept = subscribeVideoCallAccept((payload) => {
      setCall((prev) => {
        if (!prev || prev.mode !== 'calling' || prev.conversationId !== payload.conversationId)
          return prev;
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        return { ...prev, mode: 'in-call', connectedAt: Date.now() };
      });
    });

    const unsubReject = subscribeVideoCallReject((payload) => {
      setCall((prev) => {
        if (!prev || prev.mode !== 'calling' || prev.conversationId !== payload.conversationId)
          return prev;
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        sendVideoCallRequestMessage(prev.conversationId);
        return null;
      });
      cleanupMedia();
    });

    const unsubEnd = subscribeVideoCallEnd((payload) => {
      setCall((prev) => {
        if (!prev || prev.conversationId !== payload.conversationId) return prev;
        if (prev.isCaller && payload.durationSeconds != null && payload.durationSeconds > 0) {
          sendVideoCallDurationMessage(prev.conversationId, payload.durationSeconds);
        }
        return null;
      });
      cleanupMedia();
    });

    return () => {
      unsubReq();
      unsubAccept();
      unsubReject();
      unsubEnd();
    };
  }, [
    user?.id,
    subscribeVideoCallRequest,
    subscribeVideoCallAccept,
    subscribeVideoCallReject,
    subscribeVideoCallEnd,
    sendVideoCallRequestMessage,
    sendVideoCallDurationMessage,
    cleanupMedia,
  ]);

  const value = {
    call,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) throw new Error('useVideoCall must be used within VideoCallProvider');
  return ctx;
}
