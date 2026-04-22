import basicSsl from '@vitejs/plugin-basic-ssl';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Node.js v24 treats unhandled 'error' events on TLS sockets as fatal.
 * Mobile browsers (and some desktop ones) abruptly drop TLS connections
 * during HMR reloads — causing ECONNRESET / ECONNABORTED errors that are
 * completely benign. This plugin attaches silent error handlers so they
 * don't crash the dev server.
 */
function suppressTlsErrors(): Plugin {
  return {
    name: 'suppress-tls-errors',
    configureServer(server) {
      const attachHandlers = () => {
        const http = server.httpServer;
        if (!http) return;

        // Error codes that are completely benign in a local HTTPS dev server.
        // They happen when mobile browsers abruptly drop a TLS connection
        // during HMR reloads, page navigations, or when rejecting a self-signed cert.
        const safeErrorCodes = new Set([
          'ECONNRESET',
          'ECONNABORTED',
          'EPIPE',
          'ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN',
          'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA',
        ]);

        const isSafe = (err: NodeJS.ErrnoException) =>
          !!(err.code && safeErrorCodes.has(err.code)) ||
          !!(err.message && (
            err.message.includes('ECONNRESET') ||
            err.message.includes('ssl')
          ));

        // ── Server-level errors (e.g. port already in use) ────────────────────
        http.on('error', (err: NodeJS.ErrnoException) => {
          if (isSafe(err)) return;
          console.error('[vite] https server error:', err);
        });

        // ── TLS handshake failures (browser rejects self-signed cert) ─────────
        http.on('tlsClientError', () => { /* swallow */ });

        // ── Per-socket errors (ECONNRESET mid-stream, EPIPE on HMR reload) ────
        // Node.js emits ECONNRESET on the individual TLSSocket, NOT on the
        // server. Without a listener on each socket, Node v24 treats it as an
        // unhandled error and crashes the process.
        http.on('connection', (socket: NodeJS.EventEmitter) => {
          socket.on('error', (err: NodeJS.ErrnoException) => {
            if (isSafe(err)) return;
            console.error('[vite] socket error:', err);
          });
        });
      };

      if (server.httpServer) {
        attachHandlers();
      }
    },
  };
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), basicSsl(), tailwindcss(), suppressTlsErrors()],
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
        },
        // Proxy Socket.io so the browser can connect via wss:// (same HTTPS
        // origin) without triggering a mixed-content block.
        '/socket.io': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
          ws: true,               // upgrade HTTP→WebSocket tunnel
        },
      },
    },
  };
});

