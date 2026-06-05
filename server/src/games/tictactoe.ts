import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';

/** Hücre işareti: X, O ya da boş. */
type Mark = 'X' | 'O' | null;

/** XOX durumu: tahta + sıra + kazanan + kazanan üçlü (vurgu için). */
export interface TicTacToeState {
  board: Mark[]; // 9 hücre (0..8)
  turn: 0 | 1; // sıradaki koltuk
  winner: 'X' | 'O' | 'draw' | null;
  line: number[] | null; // kazanan 3 indeks
}

export interface TicTacToeMove {
  index: number; // 0..8
}

/** Koltuk -> işaret. Koltuk 0 = X, koltuk 1 = O. */
const SEAT_MARK = ['X', 'O'] as const;

/** Tüm kazanma üçlüleri (satır, sütun, çapraz). */
const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Tahtadan kazananı ve kazanan üçlüyü hesaplar. */
function evaluateBoard(board: Mark[]): {
  winner: 'X' | 'O' | 'draw' | null;
  line: number[] | null;
} {
  for (const l of LINES) {
    const [a, b, c] = l;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line: l };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

export const tictactoeModule: GameModule<TicTacToeState, TicTacToeMove> = {
  id: 'tictactoe',
  name: 'XOX',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): TicTacToeState {
    return {
      board: Array<Mark>(9).fill(null),
      turn: 0,
      winner: null,
      line: null,
    };
  },

  applyMove(state, move, seat): ApplyMoveResult<TicTacToeState> {
    // Oyun bittiyse hamle kabul edilmez.
    if (state.winner) {
      return { ok: false, error: 'Oyun bitti.' };
    }
    // Otoriter sıra kontrolü.
    if (seat !== state.turn) {
      return { ok: false, error: 'Sıra sizde değil.' };
    }
    // Geçerli hücre mi?
    const i = move.index;
    if (typeof i !== 'number' || i < 0 || i > 8 || !Number.isInteger(i)) {
      return { ok: false, error: 'Geçersiz hamle.' };
    }
    if (state.board[i] !== null) {
      return { ok: false, error: 'Bu hücre dolu.' };
    }

    const board = [...state.board];
    board[i] = SEAT_MARK[seat];
    const { winner, line } = evaluateBoard(board);

    return {
      ok: true,
      state: {
        board,
        turn: (seat === 0 ? 1 : 0) as 0 | 1,
        winner,
        line,
      },
    };
  },

  getStatus(state): GameStatus {
    if (!state.winner) {
      return { over: false, turn: SEAT_MARK[state.turn] };
    }
    if (state.winner === 'draw') {
      return { over: true, result: 'draw', reason: 'Berabere' };
    }
    return {
      over: true,
      result: state.winner,
      reason: `${state.winner} kazandı`,
    };
  },

  turnSeat(state): number | null {
    return state.winner ? null : state.turn;
  },

  getBotMove(state, seat, difficulty): TicTacToeMove | null {
    return botMove(state, seat, difficulty);
  },
};

// ---- Minimax (tahta küçük olduğu için tam arama) ----

/** difficulty -> rastgele (suboptimal) oynama olasılığı. */
function randomChance(d: number): number {
  return [0.5, 0.2, 0.05, 0][Math.max(1, Math.min(4, d)) - 1];
}

/** Boş hücre indeksleri. */
function emptyCells(board: Mark[]): number[] {
  const cells: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) cells.push(i);
  return cells;
}

/**
 * Minimax skoru: me (bizim işaret) açısından. + bizim kazancımız, - rakibin.
 * Daha çabuk kazanç / daha geç kayıp tercih edilir (depth ile).
 */
function minimax(
  board: Mark[],
  me: 'X' | 'O',
  current: 'X' | 'O',
  depth: number,
): number {
  const { winner } = evaluateBoard(board);
  if (winner === me) return 10 - depth;
  if (winner === 'draw') return 0;
  if (winner) return depth - 10; // rakip kazandı

  const cells = emptyCells(board);
  const maximizing = current === me;
  let best = maximizing ? -Infinity : Infinity;
  const next: 'X' | 'O' = current === 'X' ? 'O' : 'X';

  for (const i of cells) {
    board[i] = current;
    const score = minimax(board, me, next, depth + 1);
    board[i] = null;
    if (maximizing) {
      if (score > best) best = score;
    } else {
      if (score < best) best = score;
    }
  }
  return best;
}

function botMove(
  state: TicTacToeState,
  seat: number,
  difficulty: number,
): TicTacToeMove | null {
  const cells = emptyCells(state.board);
  if (cells.length === 0) return null;

  // Zorluğa göre bazen tamamen rastgele oyna (yenilebilir olsun).
  if (Math.random() < randomChance(difficulty)) {
    return { index: cells[Math.floor(Math.random() * cells.length)] };
  }

  const me = SEAT_MARK[seat] as 'X' | 'O';
  const board = [...state.board];
  let bestScore = -Infinity;
  let bestIndex = cells[0];

  for (const i of cells) {
    board[i] = me;
    const score = minimax(board, me, me === 'X' ? 'O' : 'X', 1);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return { index: bestIndex };
}
