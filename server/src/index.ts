import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@oyun/shared';
import { getModule, listGames } from './registry.js';
import {
  createRoom,
  getRoom,
  joinRoom,
  setConnected,
  getSeat,
  resetGame,
  snapshotFor,
  addBot,
  botSeatToMove,
  type Room,
} from './roomStore.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PORT = Number(process.env.PORT) || 3001;
const ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/games', (_req, res) => res.json(listGames()));

// Tek-host: derlenmiş arayüzü (client/dist) aynı adresten servis et.
// dist/index.js -> ../../client/dist
const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist',
);
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: API/socket dışındaki yolları index.html'e yönlendir.
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  console.log('📦 Arayüz servis ediliyor:', clientDist);
}

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: ORIGIN },
});

// socket.id -> bağlı olduğu oda + oyuncu kimliği (disconnect için).
const sockets = new Map<string, { roomId: string; playerId: string }>();

/** Odadaki herkese güncel durumu (her oyuncuya kendi görünümüyle) yollar. */
function broadcastState(room: Room) {
  for (const [socketId, ctx] of sockets) {
    if (ctx.roomId !== room.id) continue;
    io.to(socketId).emit('gameState', snapshotFor(room, ctx.playerId));
  }
  const status = room.module.getStatus(room.state);
  if (status.over) io.to(room.id).emit('gameOver', status);
}

/** Sıra bir bottaysa hamlesini yaptırır (gerekirse arka arkaya). */
async function maybeBotMove(room: Room) {
  for (;;) {
    if (room.module.getStatus(room.state).over) return;
    const seat = botSeatToMove(room);
    if (seat === null) return;
    await sleep(550); // doğal "düşünme" hissi
    const mv = room.module.getBotMove?.(room.state, seat, room.difficulty ?? 2);
    if (!mv) return;
    const res = room.module.applyMove(room.state, mv, seat);
    if (!res.ok || res.state === undefined) return;
    room.state = res.state;
    room.lastActivity = Date.now();
    broadcastState(room);
  }
}

io.on('connection', (socket) => {
  socket.on('listGames', (cb) => cb(listGames()));

  socket.on('createGame', ({ gameId, playerId, name, vsBot, difficulty }, cb) => {
    const module = getModule(gameId);
    if (!module) return cb({ error: 'Bilinmeyen oyun.' });
    if (vsBot && !module.getBotMove) {
      return cb({ error: 'Bu oyunda bot desteklenmiyor.' });
    }
    const room = createRoom(module);
    joinRoom(room, playerId, name ?? '');
    socket.join(room.id);
    sockets.set(socket.id, { roomId: room.id, playerId });
    if (vsBot) {
      addBot(room, difficulty ?? 2);
      void maybeBotMove(room); // bot beyazsa ilk hamleyi yapar
    }
    cb({ roomId: room.id });
  });

  socket.on('joinGame', ({ roomId, playerId, name }, cb) => {
    const room = getRoom(roomId);
    if (!room) return cb({ error: 'Oda bulunamadı.' });

    const { seat, reconnected } = joinRoom(room, playerId, name ?? '');
    socket.join(room.id);
    sockets.set(socket.id, { roomId: room.id, playerId });

    cb(snapshotFor(room, playerId));

    if (!reconnected && seat !== null) {
      socket.to(room.id).emit('opponentJoined', {
        seat,
        name: name || `Oyuncu ${seat + 1}`,
        connected: true,
      });
    }
    // Herkesi senkronla (oyuncu listesi/bağlantı durumu değişti).
    broadcastState(room);
  });

  socket.on('move', ({ roomId, payload }, cb) => {
    const room = getRoom(roomId);
    if (!room) return cb?.({ error: 'Oda bulunamadı.' });
    const ctx = sockets.get(socket.id);
    const seat = ctx ? getSeat(room, ctx.playerId) : null;
    if (seat === null) return cb?.({ error: 'İzleyici hamle yapamaz.' });

    const result = room.module.applyMove(room.state, payload, seat);
    if (!result.ok || result.state === undefined) {
      return cb?.({ error: result.error ?? 'Geçersiz hamle.' });
    }
    room.state = result.state;
    room.lastActivity = Date.now();
    cb?.({ ok: true });
    broadcastState(room);
    void maybeBotMove(room);
  });

  socket.on('resign', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    // Basit çözüm: teslim olanı bildir; oyun sonu durumu modüle bağlı
    // olmadığından genel bir gameOver yollanır.
    const ctx = sockets.get(socket.id);
    const seat = ctx ? getSeat(room, ctx.playerId) : null;
    if (seat === null) return;
    io.to(room.id).emit('gameOver', {
      over: true,
      reason: 'Teslim oldu',
      result: seat === 0 ? 'black' : 'white',
    });
  });

  socket.on('rematch', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    resetGame(room);
    broadcastState(room);
    void maybeBotMove(room);
  });

  socket.on('disconnect', () => {
    const ctx = sockets.get(socket.id);
    if (!ctx) return;
    sockets.delete(socket.id);
    const room = getRoom(ctx.roomId);
    if (!room) return;
    const player = setConnected(room, ctx.playerId, false);
    if (player) {
      socket.to(room.id).emit('opponentLeft', {
        seat: player.seat,
        name: player.name,
        connected: false,
      });
      broadcastState(room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Oyun sunucusu çalışıyor: http://localhost:${PORT}`);
});
