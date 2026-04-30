import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────────────────
// Derive the WebSocket base URL from the same env var the REST API uses.
// We strip the trailing `/api` so we connect to the root server.
// ─────────────────────────────────────────────────────────────────────────────
function getSocketUrl(): string {
  let h = import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || '';

  if (!h) {
    // In local dev, the Vite dev server proxies /socket.io → backend.
    // Always use window.location.origin so the browser sends a wss:// (same-
    // origin) upgrade — plain ws:// would be blocked as mixed content when
    // the page is served over https://.
    return window.location.origin;
  }

  if (!h.startsWith('http') && !h.startsWith('//')) h = `https://${h}`;

  // Render internal hostname fix (same as api.ts)
  try {
    const u = new URL(h);
    if (u.hostname !== 'localhost' && !u.hostname.includes('.')) {
      u.hostname = `${u.hostname}.onrender.com`;
      h = u.toString();
    }
  } catch { /* fallback */ }

  // Remove any trailing /api suffix — Socket.io connects at root
  return h.replace(/\/api\/?$/, '').replace(/\/$/, '');
}


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  /** Call this to switch tokens (e.g. after login / role change). */
  connect: (token: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  status: 'disconnected',
  connect: () => { },
  disconnect: () => { },
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const connectedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = useCallback((token: string) => {
    // If we're already connecting/connected to this exact token, do nothing
    if (socketRef.current && connectedTokenRef.current === token) {
      return;
    }

    // Tear down any existing connection first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus('connecting');

    const newSocket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket'], // Force websocket to prevent polling floods
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect', () => setStatus('connected'));
    newSocket.on('disconnect', () => setStatus('disconnected'));
    newSocket.on('connect_error', () => setStatus('error'));

    socketRef.current = newSocket;
    connectedTokenRef.current = token;
    setSocket(newSocket);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    connectedTokenRef.current = null;
    setSocket(null);
    setStatus('disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  return (
    <SocketContext.Provider value={{ socket, status, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────
export function useSocket() {
  return useContext(SocketContext);
}
