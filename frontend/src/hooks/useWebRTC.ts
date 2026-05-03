/**
 * useWebRTC — Perfect Negotiation Pattern (RFC 8829)
 *
 * Roles:
 *   solver = "polite"   peer  → will rollback on offer collision
 *   runner = "impolite" peer  → ignores colliding offers, sends the first offer
 *
 * Flow:
 *   1. Both peers acquire mic, add track, THEN emit webrtc:signal { type:'ready' }
 *   2. Adding the track fires onnegotiationneeded → runner creates offer automatically
 *   3. Solver receives offer → answers → ICE negotiation completes
 *   4. PTT = enable/disable the audio track; the peer connection stays open always
 *   5. On failure, both peers rebuild and re-announce ready after 4 s
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCOptions {
  socket: Socket | null;
  teamId: string;
  role: 'runner' | 'solver';
  enabled: boolean;
}

// ── ICE servers ──────────────────────────────────────────────────────────────
// Each entry must be a SEPARATE object — some browsers reject arrays in 'urls'
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // TCP TURN — punches through symmetric NAT (mobile 4G/5G)
  {
    urls: import.meta.env.VITE_TURN_SERVER_URL || 'turn:openrelay.metered.ca:443?transport=tcp',
    username: import.meta.env.VITE_TURN_SERVER_USERNAME || 'openrelayproject',
    credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || 'openrelayproject',
  },
  // UDP TURN fallback
  {
    urls: import.meta.env.VITE_TURN_SERVER_URL_ALT || 'turn:openrelay.metered.ca:80',
    username: import.meta.env.VITE_TURN_SERVER_USERNAME || 'openrelayproject',
    credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || 'openrelayproject',
  },
];

export function useWebRTC({ socket, teamId: _teamId, role, enabled }: UseWebRTCOptions) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  const pcRef        = useRef<RTCPeerConnection | null>(null);
  const localStream  = useRef<MediaStream | null>(null);
  const remoteAudio  = useRef<HTMLAudioElement | null>(null);
  const iceQueue     = useRef<RTCIceCandidateInit[]>([]);
  const makingOffer  = useRef(false);
  const ignoreOffer  = useRef(false);
  const reconnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPolite     = role === 'solver';

  // ── Remote audio element ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    audio.volume   = 1.0;
    audio.setAttribute('playsinline', 'true');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    remoteAudio.current = audio;

    // Keep listener alive — not one-shot — so every tap can unlock audio.
    // Capture phase ensures portal (AR scanner) events reach us too.
    const tryPlay = () => {
      if (audio.paused && audio.srcObject) audio.play().catch(() => {});
    };
    document.addEventListener('click',      tryPlay, true);
    document.addEventListener('touchstart', tryPlay, { passive: true, capture: true });

    return () => {
      audio.pause();
      audio.srcObject = null;
      document.body.contains(audio) && document.body.removeChild(audio);
      document.removeEventListener('click',      tryPlay, true);
      document.removeEventListener('touchstart', tryPlay, { capture: true } as EventListenerOptions);
    };
  }, []);

  // ── Acquire mic once; tracks stay muted until PTT ─────────────────────────
  const getMicStream = useCallback(async (): Promise<MediaStream | null> => {
    if (localStream.current) return localStream.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.getAudioTracks().forEach(t => (t.enabled = false)); // muted until PTT
      localStream.current = stream;
      console.log('[WT] Mic ready');
      return stream;
    } catch (err) {
      console.error('[WT] Mic error', err);
      return null;
    }
  }, []);

  // ── Drain queued ICE candidates ────────────────────────────────────────────
  const drainIce = useCallback(async (pc: RTCPeerConnection) => {
    while (iceQueue.current.length > 0) {
      const c = iceQueue.current.shift()!;
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[WT] ICE drain', e); }
    }
  }, []);

  // ── Build a fresh RTCPeerConnection ───────────────────────────────────────
  // Returns the new PC. Caller is responsible for adding tracks and announcing.
  const buildPC = useCallback((sock: Socket): RTCPeerConnection => {
    // Cleanly tear down existing connection
    if (pcRef.current) {
      pcRef.current.onicecandidate        = null;
      pcRef.current.ontrack               = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onnegotiationneeded   = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    makingOffer.current  = false;
    ignoreOffer.current  = false;
    iceQueue.current     = [];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
    pcRef.current = pc;

    // Send ICE candidates to the peer
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sock.emit('webrtc:signal', { signal: { candidate: candidate.toJSON() } });
    };

    // Play incoming audio as soon as a track arrives
    pc.ontrack = (ev) => {
      console.log('[WT] Remote track:', ev.track.kind);
      const audio = remoteAudio.current;
      if (!audio) return;
      audio.srcObject = ev.streams[0] ?? new MediaStream([ev.track]);
      audio.play().catch(() => {
        // Will be retried by the persistent touchstart/click listener
        console.warn('[WT] Autoplay blocked — will retry on next gesture');
      });
    };

    // Connection state monitoring + auto-reconnect
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[WT] ${s}`);
      setPeerConnected(s === 'connected');
      if (s === 'disconnected' || s === 'failed') {
        setIsIncoming(false);
        if (reconnTimer.current) clearTimeout(reconnTimer.current);
        reconnTimer.current = setTimeout(() => {
          console.log('[WT] Reconnecting...');
          // Full reconnect: rebuild PC, re-add mic, re-announce
          const newPc = buildPC(sock);
          getMicStream().then(stream => {
            if (!stream) {
              newPc.addTransceiver('audio', { direction: 'recvonly' });
            } else {
              stream.getTracks().forEach(t => newPc.addTrack(t, stream));
            }
            sock.emit('webrtc:signal', { signal: { type: 'ready' } });
          });
        }, 4000);
      }
    };

    // Perfect negotiation: browser fires this when SDP needs refreshing.
    // Only the impolite peer (runner) makes offers; solver only answers.
    // NOTE: we do NOT manually call this — addTrack() triggers it correctly.
    pc.onnegotiationneeded = async () => {
      if (isPolite) return; // Solver never initiates offers
      try {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') {
          console.warn('[WT] Raced during offer — aborting');
          return;
        }
        await pc.setLocalDescription(offer);
        sock.emit('webrtc:signal', { signal: { sdp: pc.localDescription } });
        console.log('[WT] Offer sent');
      } catch (e) {
        console.error('[WT] Offer failed', e);
      } finally {
        makingOffer.current = false;
      }
    };

    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPolite, getMicStream]);

  // ── Main signaling effect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !socket) return;

    buildPC(socket);

    // Step 1: acquire mic and add track BEFORE announcing ready.
    // The track addition will trigger onnegotiationneeded on the runner,
    // which creates and sends the offer automatically.
    getMicStream().then(stream => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState === 'closed') return;

      if (stream) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(stream.getAudioTracks()[0]);
        } else {
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          // ↑ This fires onnegotiationneeded → runner sends offer automatically
        }
      } else {
        // No mic — add a recvonly transceiver so we can still HEAR the peer
        if (pc.getTransceivers().length === 0) {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        }
      }

      // Step 2: tell the peer we're ready.
      // Runner: offer will already be in flight from onnegotiationneeded.
      // Solver: waits for runner's offer to arrive.
      socket.emit('webrtc:signal', { signal: { type: 'ready' } });
    });

    // ── Inbound signal handler ─────────────────────────────────────────────
    const handleSignal = async (data: { from: string; signal: any }) => {
      // Ignore messages from our own role (socket echoes if we're in the room)
      if (data.from === role) return;

      const pc = pcRef.current;
      if (!pc || pc.signalingState === 'closed') return;

      const { signal } = data;

      try {
        // Peer announced ready → solver acknowledges, no action needed
        // (runner's offer is already being sent via onnegotiationneeded)
        if (signal.type === 'ready') return;

        // SDP offer or answer ────────────────────────────────────────────────
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          const collision = desc.type === 'offer' &&
            (makingOffer.current || pc.signalingState !== 'stable');

          ignoreOffer.current = !isPolite && collision;
          if (ignoreOffer.current) return;

          if (collision) {
            // Polite peer (solver): rollback our own offer and accept theirs
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit),
              pc.setRemoteDescription(desc),
            ]);
          } else {
            await pc.setRemoteDescription(desc);
          }

          await drainIce(pc);

          if (desc.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:signal', { signal: { sdp: pc.localDescription } });
            console.log('[WT] Answer sent');
          }
        }

        // ICE candidate ──────────────────────────────────────────────────────
        if (signal.candidate) {
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); }
            catch (e) { if (!ignoreOffer.current) console.warn('[WT] ICE', e); }
          } else {
            iceQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WT] Signal error', err);
      }
    };

    // Re-announce every 8 s while not yet connected (handles late-joiners)
    const keepAlive = setInterval(() => {
      if (pcRef.current?.connectionState !== 'connected') {
        socket.emit('webrtc:signal', { signal: { type: 'ready' } });
      }
    }, 8000);

    socket.on('webrtc:signal', handleSignal);

    return () => {
      clearInterval(keepAlive);
      if (reconnTimer.current) clearTimeout(reconnTimer.current);
      socket.off('webrtc:signal', handleSignal);
      pcRef.current?.close();
      pcRef.current = null;
      localStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null;
      setPeerConnected(false);
    };
  }, [enabled, socket, role, isPolite, buildPC, getMicStream, drainIce]);

  // ── Incoming PTT status ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onStatus = (data: { from: string; transmitting: boolean }) => {
      if (data.from !== role) setIsIncoming(data.transmitting);
    };
    socket.on('webrtc:status', onStatus);
    return () => { socket.off('webrtc:status', onStatus); };
  }, [socket, role]);

  // ── PTT press: unmute mic + retry remote audio play ───────────────────────
  const startTransmit = useCallback(async () => {
    const stream = await getMicStream();
    stream?.getAudioTracks().forEach(t => (t.enabled = true));

    // PTT press is a confirmed user gesture — use it to unblock autoplay
    const audio = remoteAudio.current;
    if (audio && audio.paused && audio.srcObject) audio.play().catch(() => {});

    setIsTransmitting(true);
    socket?.emit('webrtc:status', { transmitting: true });
    console.log('[WT] PTT ON');
  }, [socket, getMicStream]);

  // ── PTT release: mute mic ──────────────────────────────────────────────────
  const stopTransmit = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(t => (t.enabled = false));
    setIsTransmitting(false);
    socket?.emit('webrtc:status', { transmitting: false });
    console.log('[WT] PTT OFF');
  }, [socket]);

  return { isTransmitting, isIncoming, peerConnected, startTransmit, stopTransmit };
}
