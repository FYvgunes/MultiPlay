import { customAlphabet } from 'nanoid';
import type {
  GameModule,
  RoomSnapshot,
  PlayerView,
  Seat,
  GameStatus,
} from '@oyun/shared';

// Karışması zor karakterlerden 6 haneli oda kodu (0/O, 1/I yok).
const newRoomId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

interface Player {
  playerId: string;
  name: string;
  seat: number;
  connected: boolean;
  isBot?: boolean;
}

export interface Room {
  id: string;
  module: GameModule;
  state: unknown;
  players: Player[]; // dizinin indeksi = koltuk
  createdAt: number;
  lastActivity: number;
  difficulty?: number; // bota karşı oyunlarda
  config?: unknown; // oyuna özel ayar (quiz: {category, kids})
  timer?: ReturnType<typeof setTimeout>; // süreli oyunlar için
}

const rooms = new Map<string, Room>();
const ROOM_TTL_MS = 60 * 60 * 1000; // 1 saat hareketsiz oda silinir

export function createRoom(module: GameModule, config?: unknown): Room {
  let id = newRoomId();
  while (rooms.has(id)) id = newRoomId();
  const now = Date.now();
  const room: Room = {
    id,
    module,
    state: module.createInitialState(config),
    players: [],
    createdAt: now,
    lastActivity: now,
    config,
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

const BOT_NAMES = ['🤖 Kolay Bot', '🤖 Orta Bot', '🤖 Zor Bot', '🤖 Usta Bot'];

/** Boş bir koltuğa bot oturtur (bota karşı oyun). */
export function addBot(room: Room, difficulty: number): void {
  if (room.players.length >= room.module.maxPlayers) return;
  const seat = room.players.length;
  const d = Math.max(1, Math.min(4, difficulty));
  room.players.push({
    playerId: `bot-${seat}`,
    name: BOT_NAMES[d - 1],
    seat,
    connected: true,
    isBot: true,
  });
  room.difficulty = d;
}

/** Hareket bekleyen koltuklardan biri bot ise o koltuğu döndürür. */
export function botSeatToMove(room: Room): number | null {
  const pending =
    room.module.pendingSeats?.(room.state) ??
    (() => {
      const s = room.module.turnSeat?.(room.state) ?? null;
      return s === null ? [] : [s];
    })();
  for (const seat of pending) {
    if (room.players[seat]?.isBot) return seat;
  }
  return null;
}

/**
 * Bir oyuncuyu odaya yerleştirir. Aynı playerId varsa yeniden bağlanma
 * (aynı koltuk); boş koltuk varsa yeni oyuncu; yoksa izleyici (null).
 */
export function joinRoom(
  room: Room,
  playerId: string,
  name: string,
): { seat: Seat; reconnected: boolean } {
  room.lastActivity = Date.now();

  const existing = room.players.find((p) => p.playerId === playerId);
  if (existing) {
    existing.connected = true;
    if (name) existing.name = name;
    return { seat: existing.seat, reconnected: true };
  }

  if (room.players.length < room.module.maxPlayers) {
    const seat = room.players.length;
    room.players.push({
      playerId,
      name: name || `Oyuncu ${seat + 1}`,
      seat,
      connected: true,
    });
    return { seat, reconnected: false };
  }

  // Koltuklar dolu ama içlerinde çevrimdışı biri varsa, yeni gelen onun
  // koltuğunu devralır (stale oda kendini toparlar).
  const ghost = room.players.find((p) => !p.connected);
  if (ghost) {
    ghost.playerId = playerId;
    ghost.name = name || ghost.name;
    ghost.connected = true;
    return { seat: ghost.seat, reconnected: false };
  }

  // Tüm koltuklar dolu ve bağlı -> izleyici.
  return { seat: null, reconnected: false };
}

export function setConnected(
  room: Room,
  playerId: string,
  connected: boolean,
): Player | undefined {
  const p = room.players.find((pl) => pl.playerId === playerId);
  if (p) {
    p.connected = connected;
    room.lastActivity = Date.now();
  }
  return p;
}

export function getSeat(room: Room, playerId: string): Seat {
  return room.players.find((p) => p.playerId === playerId)?.seat ?? null;
}

export function resetGame(room: Room): void {
  room.state = room.module.createInitialState(room.config);
  room.lastActivity = Date.now();
}

function playerViews(room: Room): PlayerView[] {
  return room.players.map((p) => ({
    seat: p.seat,
    name: p.name,
    connected: p.connected,
    isBot: p.isBot,
  }));
}

export function getStatus(room: Room): GameStatus {
  return room.module.getStatus(room.state);
}

/** Belirli bir oyuncuya gönderilecek tam oda anlık görüntüsü. */
export function snapshotFor(room: Room, playerId: string): RoomSnapshot {
  const seat = getSeat(room, playerId);
  const view = room.module.viewFor
    ? room.module.viewFor(room.state, seat)
    : room.state;
  return {
    roomId: room.id,
    gameId: room.module.id,
    gameName: room.module.name,
    yourSeat: seat,
    players: playerViews(room),
    state: view,
    status: room.module.getStatus(room.state),
  };
}

// Periyodik temizlik: uzun süre hareketsiz odaları kaldır.
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) rooms.delete(id);
  }
}, 10 * 60 * 1000).unref?.();
