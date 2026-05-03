/**
 * useWebRTCListener — Admin-only, receive-only WebRTC hook.
 *
 * Joins a specific team's walkie-talkie call without transmitting audio.
 * Admin hears both runner and solver, but cannot be heard.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: import.meta.env.VITE_TURN_SERVER_URL || 'turn:openrelay.metered.ca:443?transport=tcp',
    username: import.meta.env.VITE_TURN_SERVER_USERNAME || 'openrelayproject',
    credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || 'openrelayproject',
  },
];

interface UseWebRTCListenerOptions {
  socket: Socket | null;
  targetTeamId: string | null; // null = not listening
}

export function useWebRTCListener({ socket, targetTeamId }: UseWebRTCListenerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [runnerTransmitting, setRunnerTransmitting] = useState(false);
  const [solverTransmitting, setSolverTransmitting] = useState(false);

  // One PC per active speaker — runner and solver can both have a track
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const iceQueue   = useRef<RTCIceCandidateInit[]>([]);
  const activeTeam = useRef<string | null>(null);

  // Create a hidden audio element
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    audio.volume = 1.0;
    audio.setAttribute('playsinline', 'true');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;

    const tryPlay = () => {
      if (audio.paused && audio.srcObject) audio.play().catch(() => {});
    };
    document.addEventListener('click', tryPlay, true);
    document.addEventListener('touchstart', tryPlay, { passive: true, capture: true });

    return () => {
      audio.pause();
      audio.srcObject = null;
      document.body.contains(audio) && document.body.removeChild(audio);
      document.removeEventListener('click', tryPlay, true);
      document.removeEventListener('touchstart', tryPlay, { capture: true } as EventListenerOptions);
    };
  }, []);

  const buildPC = useCallback((sock: Socket, teamId: string): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    iceQueue.current = [];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
    pcRef.current = pc;

    // Send ICE candidates back to the team
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sock.emit('webrtc:signal', {
          targetTeamId: teamId,
          signal: { candidate: candidate.toJSON() },
        });
      }
    };

    // Play any incoming audio track
    pc.ontrack = (ev) => {
      console.log('[Admin WT] Remote track received:', ev.track.kind);
      const audio = audioRef.current;
      if (!audio) return;
      // Mix all tracks into the audio element
      const stream = (audio.srcObject as MediaStream) || new MediaStream();
      if (!(audio.srcObject instanceof MediaStream)) {
        audio.srcObject = stream;
      }
      (audio.srcObject as MediaStream).addTrack(ev.track);
      audio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[Admin WT] ${s}`);
      setIsListening(s === 'connected');
    };

    // Admin is always the "polite" (answering) peer
    // No onnegotiationneeded needed — admin only receives
    return pc;
  }, []);

  // Start / stop listening when targetTeamId changes
  useEffect(() => {
    if (!socket) return;

    // Stop listening to previous team
    if (activeTeam.current && activeTeam.current !== targetTeamId) {
      socket.emit('webrtc:unlisten', { teamId: activeTeam.current });
      pcRef.current?.close();
      pcRef.current = null;
      setIsListening(false);
      setRunnerTransmitting(false);
      setSolverTransmitting(false);
      activeTeam.current = null;
    }

    if (!targetTeamId) return;

    activeTeam.current = targetTeamId;

    // Build a receive-only peer connection
    const pc = buildPC(socket, targetTeamId);

    // Add a receive-only audio transceiver so we can receive audio
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Tell server we're listening — server will join us to the team's WebRTC signals
    socket.emit('webrtc:listen', { teamId: targetTeamId });

    // Announce ourselves to the team so they know to send their offer
    socket.emit('webrtc:signal', {
      targetTeamId,
      signal: { type: 'ready' },
    });

    console.log(`[Admin WT] Started listening to team ${targetTeamId}`);

    // Handle incoming signals from team members
    const handleSignal = async (data: { from: string; signal: any; teamId?: string }) => {
      // Only process signals from the team we're monitoring
      if (data.teamId && data.teamId !== targetTeamId) return;

      const p = pcRef.current;
      if (!p || p.signalingState === 'closed') return;

      const { signal } = data;
      if (signal.type === 'ready') return;

      try {
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          await p.setRemoteDescription(desc);

          // Drain queued ICE candidates
          while (iceQueue.current.length > 0) {
            const c = iceQueue.current.shift()!;
            await p.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }

          if (desc.type === 'offer') {
            const answer = await p.createAnswer();
            await p.setLocalDescription(answer);
            socket.emit('webrtc:signal', {
              targetTeamId,
              signal: { sdp: p.localDescription },
            });
            console.log('[Admin WT] Answer sent');
          }
        }

        if (signal.candidate) {
          if (p.remoteDescription) {
            await p.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            iceQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[Admin WT] Signal error', err);
      }
    };

    // PTT status from team members
    const handleStatus = (data: { from: string; transmitting: boolean; teamId?: string }) => {
      if (data.teamId && data.teamId !== targetTeamId) return;
      if (data.from === 'runner') setRunnerTransmitting(data.transmitting);
      if (data.from === 'solver') setSolverTransmitting(data.transmitting);
    };

    socket.on('webrtc:signal', handleSignal);
    socket.on('webrtc:status', handleStatus);

    return () => {
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:status', handleStatus);
    };
  }, [socket, targetTeamId, buildPC]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket && activeTeam.current) {
        socket.emit('webrtc:unlisten', { teamId: activeTeam.current });
      }
      pcRef.current?.close();
    };
  }, [socket]);

  return { isListening, runnerTransmitting, solverTransmitting };
}
