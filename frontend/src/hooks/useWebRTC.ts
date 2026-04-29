import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCOptions {
  socket: Socket | null;
  teamId: string;
  role: 'runner' | 'solver';
  enabled: boolean;
}

export function useWebRTC({ socket, teamId, role, enabled }: UseWebRTCOptions) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isSignaling = useRef(false);

  // Initialize Remote Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = false;
    audio.volume = 1.0;
    // @ts-ignore
    audio.playsinline = true;
    audio.setAttribute('playsinline', 'true');
    
    document.body.appendChild(audio);
    remoteAudio.current = audio;
    
    const unlock = () => {
      audio.play().catch(() => {});
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    return () => {
      audio.pause();
      audio.srcObject = null;
      if (document.body.contains(audio)) {
        document.body.removeChild(audio);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const processIceQueue = useCallback(async () => {
    if (!pc.current || !pc.current.remoteDescription) return;
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      if (candidate) {
        try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.error('[WebRTC] Ice error', e); }
      }
    }
  }, []);

  const initLocalStream = useCallback(async () => {
    if (localStream.current) return localStream.current;
    try {
      console.log('[WebRTC] Initializing Mic...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      stream.getAudioTracks().forEach(t => t.enabled = false);
      localStream.current = stream;
      return stream;
    } catch (e) {
      console.error('[WebRTC] Mic error', e);
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pc.current) return pc.current;

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    const newPc = new RTCPeerConnection(config);

    newPc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', { signal: { candidate: event.candidate } });
      }
    };

    newPc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track: ${event.track.kind}`);
      if (remoteAudio.current) {
        const stream = event.streams[0] || new MediaStream([event.track]);
        remoteAudio.current.srcObject = stream;
        remoteAudio.current.play().catch(e => console.warn('[WebRTC] Play blocked', e));
      }
    };

    newPc.onconnectionstatechange = () => {
      console.log(`[WebRTC] State: ${newPc.connectionState}`);
      setPeerConnected(newPc.connectionState === 'connected');
      if (newPc.connectionState === 'disconnected' || newPc.connectionState === 'failed') {
        setIsIncoming(false);
      }
    };

    newPc.onnegotiationneeded = async () => {
      if (isSignaling.current) return;
      isSignaling.current = true;
      try {
        console.log('[WebRTC] Negotiating...');
        const offer = await newPc.createOffer();
        await newPc.setLocalDescription(offer);
        socket?.emit('webrtc:signal', { signal: { sdp: offer } });
      } catch (e) {
        console.error('[WebRTC] Negotiation error', e);
      } finally {
        isSignaling.current = false;
      }
    };

    pc.current = newPc;
    return newPc;
  }, [socket]);

  useEffect(() => {
    if (!enabled || !socket) return;

    const handleSignal = async (data: { from: string; signal: any }) => {
      if (data.from === role) return;
      const connection = createPeerConnection();

      if (data.signal.type === 'ready') {
        if (role === 'solver') {
          console.log('[WebRTC] Solver initiating...');
          const stream = await initLocalStream();
          if (stream) {
            const senders = connection.getSenders();
            if (senders.length === 0) {
              stream.getTracks().forEach(t => connection.addTrack(t, stream));
            }
          } else {
            connection.addTransceiver('audio', { direction: 'sendrecv' });
          }
        }
        return;
      }

      if (data.signal.sdp) {
        try {
          console.log(`[WebRTC] Handling SDP: ${data.signal.sdp.type}`);
          await connection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          await processIceQueue();
          
          if (data.signal.sdp.type === 'offer') {
            const stream = await initLocalStream();
            if (stream) {
              // Replace or add track to the answer
              const senders = connection.getSenders();
              const audioSender = senders.find(s => s.track?.kind === 'audio');
              if (audioSender) {
                await audioSender.replaceTrack(stream.getAudioTracks()[0]);
              } else {
                stream.getTracks().forEach(t => connection.addTrack(t, stream));
              }
            }
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            socket.emit('webrtc:signal', { signal: { sdp: answer } });
          }
        } catch (err) { console.error('[WebRTC] SDP error', err); }
      } else if (data.signal.candidate) {
        if (connection.remoteDescription) {
          try { await connection.addIceCandidate(new RTCIceCandidate(data.signal.candidate)); }
          catch (e) { console.error('[WebRTC] Ice error', e); }
        } else {
          iceCandidateQueue.current.push(data.signal.candidate);
        }
      }
    };

    socket.on('webrtc:signal', handleSignal);
    
    const interval = setInterval(() => {
      if (pc.current?.connectionState !== 'connected') {
        socket.emit('webrtc:signal', { signal: { type: 'ready' } });
      }
    }, 5000);

    initLocalStream().then(() => {
      socket.emit('webrtc:signal', { signal: { type: 'ready' } });
    });

    return () => {
      clearInterval(interval);
      socket.off('webrtc:signal', handleSignal);
      pc.current?.close();
      pc.current = null;
      if (localStream.current) {
        localStream.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [enabled, socket, role, createPeerConnection, processIceQueue, initLocalStream]);

  const startTransmit = useCallback(async () => {
    setIsTransmitting(true);
    socket?.emit('webrtc:status', { transmitting: true });
    
    const stream = await initLocalStream();
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = true);
      console.log('[WebRTC] Transmitting...');
    }
  }, [socket, initLocalStream]);

  const stopTransmit = useCallback(async () => {
    setIsTransmitting(false);
    socket?.emit('webrtc:status', { transmitting: false });
    
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => t.enabled = false);
      console.log('[WebRTC] Stopped Transmitting');
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleStatus = (data: { transmitting: boolean }) => {
      setIsIncoming(data.transmitting);
    };
    socket.on('webrtc:status', handleStatus);
    return () => { socket.off('webrtc:status', handleStatus); };
  }, [socket]);

  return {
    isTransmitting,
    isIncoming,
    peerConnected,
    startTransmit,
    stopTransmit
  };
}
