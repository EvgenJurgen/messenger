import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideoCall } from './VideoCallContext';
import { useSocket } from '@/features/socket';

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

export function VideoCallUI() {
  const { call, acceptCall, rejectCall, endCall } = useVideoCall();
  const {
    subscribeVideoCallOffer,
    subscribeVideoCallAnswer,
    subscribeVideoCallIce,
    emitVideoCallOffer,
    emitVideoCallAnswer,
    emitVideoCallIce,
  } = useSocket();
  const { t } = useTranslation();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    return () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [remoteStream]);

  useEffect(() => {
    if (!call || call.mode !== 'in-call') return;

    const conversationId = call.conversationId;
    const otherUserId = call.otherUserId;
    const isCaller = call.isCaller;

    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (e.streams[0]) setRemoteStream(e.streams[0]);
    };

    const cleanup = () => {
      pc.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setRemoteStream(null);
    };

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (isCaller) {
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              emitVideoCallOffer(conversationId, otherUserId, pc.localDescription);
            })
            .catch((err) => setMediaError(String(err)));
        }
      })
      .catch((err) => setMediaError(err?.message ?? 'Camera/mic access failed'));

    const unsubOffer = subscribeVideoCallOffer((payload) => {
      if (payload.conversationId !== conversationId || isCaller) return;
      const signal = payload.signal as RTCSessionDescriptionInit;
      if (!signal) return;
      pc.setRemoteDescription(new RTCSessionDescription(signal))
        .then(() => pc.createAnswer())
        .then((answer) => pc.setLocalDescription(answer))
        .then(() => {
          emitVideoCallAnswer(conversationId, otherUserId, pc.localDescription);
        })
        .catch((err) => setMediaError(String(err)));
    });

    const unsubAnswer = subscribeVideoCallAnswer((payload) => {
      if (payload.conversationId !== conversationId || !isCaller) return;
      const signal = payload.signal as RTCSessionDescriptionInit;
      if (!signal) return;
      pc.setRemoteDescription(new RTCSessionDescription(signal)).catch((err) =>
        setMediaError(String(err)),
      );
    });

    const unsubIce = subscribeVideoCallIce((payload) => {
      if (payload.conversationId !== conversationId) return;
      const signal = payload.signal as RTCIceCandidateInit;
      if (!signal) return;
      pc.addIceCandidate(new RTCIceCandidate(signal)).catch(() => {});
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        emitVideoCallIce(conversationId, otherUserId, e.candidate.toJSON());
      }
    };

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      cleanup();
    };
  }, [
    call?.conversationId,
    call?.mode,
    call?.otherUserId,
    call?.isCaller,
    subscribeVideoCallOffer,
    subscribeVideoCallAnswer,
    subscribeVideoCallIce,
    emitVideoCallOffer,
    emitVideoCallAnswer,
    emitVideoCallIce,
  ]);

  if (!call) return null;

  if (call.mode === 'calling') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-secondary border border-border rounded-xl p-6 flex flex-col items-center gap-4 min-w-[280px]">
          <p className="text-foreground-primary font-medium">
            {t('videoCall.calling') ?? 'Calling...'}
          </p>
          <p className="text-muted text-sm truncate max-w-full">
            {call.otherNickname || call.otherUserId}
          </p>
          <button
            type="button"
            onClick={endCall}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-error text-white hover:opacity-90"
          >
            <PhoneOffIcon className="w-5 h-5" />
            {t('videoCall.cancel') ?? 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  if (call.mode === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-secondary border border-border rounded-xl p-6 flex flex-col items-center gap-4 min-w-[280px]">
          <p className="text-foreground-primary font-medium">
            {t('videoCall.incoming') ?? 'Incoming video call'}
          </p>
          <p className="text-muted text-sm truncate max-w-full">
            {call.otherNickname || call.otherUserId}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={rejectCall}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-error text-white hover:opacity-90"
            >
              <PhoneOffIcon className="w-5 h-5" />
              {t('videoCall.decline') ?? 'Decline'}
            </button>
            <button
              type="button"
              onClick={acceptCall}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white hover:opacity-90"
            >
              <PhoneIcon className="w-5 h-5" />
              {t('videoCall.accept') ?? 'Accept'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (call.mode === 'in-call') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {mediaError && (
          <p className="text-error text-sm p-2 text-center">{mediaError}</p>
        )}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 min-h-0">
          <div className="relative rounded-lg overflow-hidden bg-secondary min-h-[200px]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-white text-sm drop-shadow">
              {call.otherNickname || call.otherUserId}
            </span>
          </div>
          <div className="relative rounded-lg overflow-hidden bg-secondary min-h-[200px]">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            <span className="absolute bottom-2 left-2 text-white text-sm drop-shadow">
              {t('videoCall.you') ?? 'You'}
            </span>
          </div>
        </div>
        <div className="shrink-0 p-4 flex justify-center">
          <button
            type="button"
            onClick={endCall}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-error text-white hover:opacity-90"
            aria-label={t('videoCall.endCall') ?? 'End call'}
          >
            <PhoneOffIcon className="w-6 h-6" />
            {t('videoCall.endCall') ?? 'End call'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
