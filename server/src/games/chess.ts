import { Chess } from 'chess.js';
import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';

/** Satranç durumu: otoriter FEN + SAN geçmişi + son hamle (vurgu için). */
export interface ChessState {
  fen: string;
  history: string[];
  lastMove?: { from: string; to: string };
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

/** Koltuk -> renk. Koltuk 0 beyaz, koltuk 1 siyah. */
const SEAT_COLOR = ['w', 'b'] as const;

export const chessModule: GameModule<ChessState, ChessMove> = {
  id: 'chess',
  name: 'Satranç',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): ChessState {
    const c = new Chess();
    return { fen: c.fen(), history: [] };
  },

  applyMove(state, move, seat): ApplyMoveResult<ChessState> {
    const c = new Chess(state.fen);

    // Otoriter sıra kontrolü: koltuğun rengi, sıradaki renk olmalı.
    if (c.turn() !== SEAT_COLOR[seat]) {
      return { ok: false, error: 'Sıra sizde değil.' };
    }

    try {
      const result = c.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? 'q',
      });
      if (!result) return { ok: false, error: 'Geçersiz hamle.' };
      return {
        ok: true,
        state: {
          fen: c.fen(),
          history: [...state.history, result.san],
          lastMove: { from: result.from, to: result.to },
        },
      };
    } catch {
      return { ok: false, error: 'Geçersiz hamle.' };
    }
  },

  getStatus(state): GameStatus {
    const c = new Chess(state.fen);
    if (c.isCheckmate()) {
      const winner = c.turn() === 'w' ? 'black' : 'white';
      return { over: true, result: winner, reason: 'Şah mat' };
    }
    if (c.isStalemate()) return { over: true, result: 'draw', reason: 'Pat' };
    if (c.isInsufficientMaterial())
      return { over: true, result: 'draw', reason: 'Yetersiz materyal' };
    if (c.isThreefoldRepetition())
      return { over: true, result: 'draw', reason: 'Üç kez tekrar' };
    if (c.isDraw()) return { over: true, result: 'draw', reason: 'Beraberlik' };
    return { over: false, turn: c.turn() };
  },

  turnSeat(state): number | null {
    return new Chess(state.fen).turn() === 'w' ? 0 : 1;
  },

  getBotMove(state, _seat, difficulty): ChessMove | null {
    return bestMove(state.fen, difficulty);
  },
};

// ---- Basit alfa-beta satranç motoru (Kolay..Usta) ----

const VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};
const MATE = 1_000_000;

// difficulty -> arama derinliği ve "gevşeklik" (suboptimal hamle payı)
function depthFor(d: number): number {
  return [2, 2, 3, 3][Math.max(1, Math.min(4, d)) - 1];
}
function slackFor(d: number): number {
  return [140, 45, 15, 0][Math.max(1, Math.min(4, d)) - 1];
}

// Konum tabloları (rank8 satırı başta; beyaz açısından). Siyah için dikey
// ayna (idx ^ 56). Akıllı oyun + alfa-beta budaması sağlar.
/* prettier-ignore */
const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function evaluate(c: Chess): number {
  // Beyaz açısından: materyal + konum.
  let s = 0;
  const board = c.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const idx = r * 8 + f;
      const base = VALUE[cell.type] + PST[cell.type][cell.color === 'w' ? idx : idx ^ 56];
      s += cell.color === 'w' ? base : -base;
    }
  }
  return s;
}

interface VMove {
  from: string;
  to: string;
  promotion?: string;
  captured?: string;
  san: string;
}

function ordered(c: Chess): VMove[] {
  const moves = c.moves({ verbose: true }) as unknown as VMove[];
  // Önce taş alan hamleler (alınan taş değeri yüksek olan başta).
  return moves.sort((a, b) => {
    const av = a.captured ? VALUE[a.captured] : 0;
    const bv = b.captured ? VALUE[b.captured] : 0;
    return bv - av;
  });
}

function search(c: Chess, depth: number, alpha: number, beta: number): number {
  if (c.isCheckmate()) {
    // Sıradaki taraf mat olmuş: ona kötü. Daha çabuk matı tercih için +depth.
    return c.turn() === 'w' ? -(MATE + depth) : MATE + depth;
  }
  if (c.isDraw() || c.isStalemate() || c.isInsufficientMaterial()) return 0;
  if (depth === 0) return evaluate(c);

  const white = c.turn() === 'w';
  let best = white ? -Infinity : Infinity;
  for (const m of ordered(c)) {
    c.move(m);
    const v = search(c, depth - 1, alpha, beta);
    c.undo();
    if (white) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }
  return best;
}

function toChessMove(m: VMove): ChessMove {
  return {
    from: m.from,
    to: m.to,
    promotion: (m.promotion as ChessMove['promotion']) ?? undefined,
  };
}

function bestMove(fen: string, difficulty: number): ChessMove | null {
  const c = new Chess(fen);
  const moves = ordered(c);
  if (moves.length === 0) return null;

  // Kolay: bazen tamamen rastgele oynar (yenilebilir olsun).
  if (difficulty <= 1 && Math.random() < 0.35) {
    return toChessMove(moves[Math.floor(Math.random() * moves.length)]);
  }

  const depth = depthFor(difficulty);
  const white = c.turn() === 'w';
  const scored = moves.map((m) => {
    c.move(m);
    const score = search(c, depth - 1, -Infinity, Infinity);
    c.undo();
    return { m, score };
  });

  // Bot için en iyi skor (beyazsa büyük, siyahsa küçük iyi).
  scored.sort((a, b) => (white ? b.score - a.score : a.score - b.score));
  const bestScore = scored[0].score;

  // Zorluğa göre: en iyiye yakın hamleler arasından rastgele seç (çeşitlilik
  // ve düşük seviyelerde "beat edilebilirlik").
  const slack = slackFor(difficulty);
  const pool = scored.filter((s) => Math.abs(s.score - bestScore) <= slack);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? scored[0];

  return {
    from: pick.m.from,
    to: pick.m.to,
    promotion: (pick.m.promotion as ChessMove['promotion']) ?? undefined,
  };
}
