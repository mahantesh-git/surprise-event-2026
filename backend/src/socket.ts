import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { ObjectId } from 'mongodb';
import { verifyToken } from './auth';
import { getTeamsCollection } from './db';

let io: SocketServer | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Initialise the Socket.io server (call once, right after http.createServer)
// ─────────────────────────────────────────────────────────────────────────────
export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    // Prefer WS, fall back to long-polling so Render's proxy works fine
    transports: ['websocket', 'polling'],
    // Graceful ping / disconnect handling
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── JWT auth middleware ───────────────────────────────────────────────────
  io.use((socket, next) => {
    const raw = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!raw || typeof raw !== 'string') {
      return next(new Error('AUTH_REQUIRED'));
    }
    try {
      const payload = verifyToken(raw);
      (socket as any).auth = payload;
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const auth = (socket as any).auth;

    if (auth.kind === 'team') {
      // Join private room regardless of arena
      socket.join(`team_${auth.teamId}`);

      // Arena 1 — join A1-specific room
      if ((auth as any).arena === 'arena1') {
        socket.join(`a1:${auth.teamId}`);
        // Arena 1 code-update relay: Solver → Runner (same team)
        socket.on('a1:code-update', (data: { html: string; css: string; js: string }) => {
          socket.to(`a1:${auth.teamId}`).emit('a1:code-update', data);
        });
        return; // Arena 1 teams don't need runner/solver sub-handlers below
      }

      if (auth.role === 'runner') {
        socket.join('runners');
        attachRunnerHandlers(socket, auth);
      } else {
        socket.join('solvers');
      }

      // WebRTC Signaling relay (Team-internal only)

      socket.on('webrtc:signal', (data: { signal: any }) => {
        // Broadcast to the team room, excluding the sender
        socket.to(`team_${auth.teamId}`).emit('webrtc:signal', {
          from: auth.role, // helps the recipient know if it's runner or solver
          signal: data.signal
        });
      });

      socket.on('webrtc:status', (data: { transmitting: boolean }) => {
        socket.to(`team_${auth.teamId}`).emit('webrtc:status', {
          from: auth.role,
          transmitting: data.transmitting
        });
      });

      // Burn Swap Permission Flow
      socket.on('swap:request', () => {
        socket.to(`team_${auth.teamId}`).emit('swap:requested', { from: auth.role });
      });
      socket.on('swap:accept', () => {
        socket.to(`team_${auth.teamId}`).emit('swap:accepted', { from: auth.role });
      });
      socket.on('swap:decline', () => {
        socket.to(`team_${auth.teamId}`).emit('swap:declined', { from: auth.role });
      });
    } else if (auth.kind === 'admin') {
      socket.join('admin');
    }
  });

  return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runner-specific event handlers
// ─────────────────────────────────────────────────────────────────────────────
function attachRunnerHandlers(socket: Socket, auth: { teamId: string }) {
  // Simple token-bucket rate limiter: max 20 location events/sec per runner
  let tokenBucket = 20;
  const refillTimer = setInterval(() => { tokenBucket = 20; }, 1000);

  // DB write throttle: persist at most once every 2 s per runner.
  // Admin gets instant WS pushes; the DB write is just for REST fallback
  // clients that reconnect and need a last-known position.
  let dbWriteTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingDbPayload: { lat: number; lng: number; h: number | null } | null = null;

  const scheduleDbWrite = (lat: number, lng: number, h: number | null) => {
    pendingDbPayload = { lat, lng, h };
    if (dbWriteTimer) return;
    dbWriteTimer = setTimeout(async () => {
      dbWriteTimer = null;
      const p = pendingDbPayload;
      pendingDbPayload = null;
      if (!p) return;
      try {
        const teams = await getTeamsCollection();
        await teams.updateOne(
          { _id: new ObjectId(auth.teamId) },
          {
            $set: {
              'gameState.currentLat': p.lat,
              'gameState.currentLng': p.lng,
              'gameState.currentHeading': p.h,
              updatedAt: new Date(),
            },
          }
        );
      } catch {
        // Silent — GPS failures must never crash the game
      }
    }, 2000);
  };

  socket.on(
    'location:stream',
    (data: { lat: number; lng: number; heading: number | null; timestamp?: number }) => {
      if (tokenBucket <= 0) return;
      tokenBucket--;

      const { lat, lng, heading } = data;

      if (
        typeof lat !== 'number' || typeof lng !== 'number' ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180
      ) return;

      const h = typeof heading === 'number' && isFinite(heading) ? heading : null;

      // 1. Broadcast to admin instantly — no DB wait
      io?.to('admin').emit('runner:location', {
        teamId: auth.teamId,
        lat,
        lng,
        heading: h,
        timestamp: data.timestamp ?? Date.now(),
      });

      // 1b. Broadcast to the team room so the solver can track the runner
      io?.to(`team_${auth.teamId}`).emit('runner:location', {
        lat,
        lng,
        heading: h,
        timestamp: data.timestamp ?? Date.now(),
      });

      // 2. Persist to DB throttled (2 s window)
      scheduleDbWrite(lat, lng, h);
    }
  );

  socket.on('disconnect', () => {
    clearInterval(refillTimer);
    if (dbWriteTimer) clearTimeout(dbWriteTimer);
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Public broadcast helpers (called from REST handlers in index.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** Broadcast a full leaderboard snapshot to all connected admin sockets. */
export async function broadcastLeaderboard() {
  if (!io) return;
  try {
    const teams = await getTeamsCollection();
    const docs = await teams
      .find({}, { sort: { 'gameState.round': -1, 'gameState.startTime': 1 } })
      .toArray();

    const leaderboard = docs.map(team => ({
      id: team._id.toString(),
      name: team.name,
      round: team.gameState.round,
      solvedCount: team.gameState.roundsDone.filter(Boolean).length,
      score: team.score || 0,
      stage: team.gameState.stage,
      startTime: team.gameState.startTime,
      finishTime: team.gameState.finishTime,
      currentLat: team.gameState.currentLat ?? null,
      currentLng: team.gameState.currentLng ?? null,
      currentHeading: team.gameState.currentHeading ?? null,
      helpRequested: team.gameState.helpRequested || false,
      lastValidatedAt: team.gameState.lastValidatedAt || null,
    }));

    io.to('admin').emit('leaderboard:update', { leaderboard });
  } catch {
    // Silent — admin HUD polling is still the fallback
  }
}

/** Push an admin chat message directly to the target team room (or everyone). */
export function notifyTeamMessage(teamId: string | 'all', event: string, data: unknown) {
  if (!io) return;
  if (teamId === 'all') {
    io.emit(event, data);
  } else {
    io.to(`team_${teamId}`).emit(event, data);
  }
}

/** Send a game-wide system notification (pause, resume, etc.). */
export function broadcastGameEvent(event: string, data: unknown) {
  io?.emit(event, data);
}

export function getIo(): SocketServer | null {
  return io;
}
