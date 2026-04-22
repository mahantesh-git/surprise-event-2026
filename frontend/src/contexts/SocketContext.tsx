import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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
  connect: () => {},
  disconnect: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  function connect(token: string) {
    // Tear down any existing connection first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus('connecting');

    const socket = io(getSocketUrl(), {
      auth: { token },
      // Start with polling so the initial HTTP request flows through
      // Vite's HTTPS proxy cleanly. Socket.io will then attempt to
      // upgrade to WebSocket automatically. In production (Render)
      // WebSocket is used directly from the start.
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    socketRef.current = socket;
  }

  function disconnect() {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }

  // Cleanup on unmount
  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, status, connect, disconnect }}>
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
