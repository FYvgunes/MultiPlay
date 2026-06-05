import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';

// ---- Türk Daması (Turkish draughts) ----
// Ortogonal kurallar (çapraz DEĞİL). 8x8 tahta, [row][col], 0..7.
// Koltuk 0 = açık (light), "yukarı" doğru ilerler (yüksek row -> 0).
// Koltuk 1 = koyu (dark), "aşağı" doğru ilerler (0 -> 7).
// Kurulum: koyu (seat1) row 1 ve 2; açık (seat0) row 5 ve 6.
// Erler bir kare ileri/yana gider (geri DEĞİL, çapraz DEĞİL).
// Alma zorunlu; çoklu alma zinciri zorunlu. Dama (king) uçan kale gibi alır.

/** Bir taş: hangi koltuğa ait ve dama (king) mı. */
export interface Cell {
  seat: 0 | 1;
  king: boolean;
}

export interface DamaState {
  board: (Cell | null)[][]; // [row][col]
  turn: 0 | 1;
  /** Oyun bittiyse kazanan koltuk ('p0'/'p1') ya da 'draw'; sürerken null. */
  winner: 'p0' | 'p1' | 'draw' | null;
  reason?: string;
  /** Son hamlenin yolu (vurgu için). */
  lastPath?: Pos[];
  /** Almasız ve ersiz (yalnız dama oynayan) ardışık yarım hamle sayısı. */
  idle?: number;
}

/**
 * Bu kadar yarım hamle boyunca ilerleme (alma ya da dama'ya terfi) olmazsa
 * beraberlik. "İlerleme"yi yalnız alma/terfi sayar; yan/ileri sade er hamlesi
 * ya da dama gezdirme saymaz — aksi halde taşlar sonsuza dek mekik dokuyabilir.
 */
const IDLE_LIMIT = 50;

export interface Pos {
  r: number;
  c: number;
}

export interface DamaMove {
  path: Pos[]; // [from, step1, step2, ...]
}

const SIZE = 8;

/** Ortogonal yönler. */
const DIRS: Pos[] = [
  { r: -1, c: 0 }, // yukarı
  { r: 1, c: 0 }, // aşağı
  { r: 0, c: -1 }, // sol
  { r: 0, c: 1 }, // sağ
];

/** Bir erin "ileri" row yönü: seat0 yukarı (-1), seat1 aşağı (+1). */
function forwardDir(seat: 0 | 1): number {
  return seat === 0 ? -1 : 1;
}

/** Erin (man) gidebileceği yönler: ileri + yanlar (geri yok). */
function manStepDirs(seat: 0 | 1): Pos[] {
  const fwd = forwardDir(seat);
  return [
    { r: fwd, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 },
  ];
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function cloneBoard(board: (Cell | null)[][]): (Cell | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function backRowFor(seat: 0 | 1): number {
  // seat0 (yukarı ilerler) row 0'da terfi; seat1 row 7'de terfi.
  return seat === 0 ? 0 : SIZE - 1;
}

// ---- Hamle üretimi ----
// Bir hamle, yol (path) olarak temsil edilir. Alma zinciri varsa zorunludur;
// dolayısıyla legalMoves önce almaları toplar, yoksa basit adımları döner.

interface PathStep {
  to: Pos; // inilen kare
  captured: Pos | null; // bu adımda alınan taş (varsa)
}

/** Bir er için tek adımda olası ALMA hamleleri (yön + alınan + iniş). */
function manCaptureSteps(
  board: (Cell | null)[][],
  from: Pos,
  seat: 0 | 1,
): PathStep[] {
  const out: PathStep[] = [];
  // Er alırken ileri ve yana (geri DEĞİL) atlayabilir.
  for (const d of manStepDirs(seat)) {
    const mr = from.r + d.r;
    const mc = from.c + d.c; // ortadaki (düşman) kare
    const lr = from.r + 2 * d.r;
    const lc = from.c + 2 * d.c; // iniş karesi
    if (!inBounds(lr, lc)) continue;
    const mid = board[mr]?.[mc];
    const land = board[lr][lc];
    if (mid && mid.seat !== seat && land === null) {
      out.push({ to: { r: lr, c: lc }, captured: { r: mr, c: mc } });
    }
  }
  return out;
}

/** Dama (king) için tek adımda olası ALMA hamleleri (uçan kale). */
function kingCaptureSteps(
  board: (Cell | null)[][],
  from: Pos,
  seat: 0 | 1,
): PathStep[] {
  const out: PathStep[] = [];
  for (const d of DIRS) {
    let r = from.r + d.r;
    let c = from.c + d.c;
    // Önce ilk taşa kadar boşlukları geç.
    while (inBounds(r, c) && board[r][c] === null) {
      r += d.r;
      c += d.c;
    }
    if (!inBounds(r, c)) continue;
    const target = board[r][c];
    if (!target || target.seat === seat) continue; // dostsa/yoksa bu yön biter
    const captured: Pos = { r, c };
    // Düşmanın arkasındaki her boş kareye inilebilir.
    let lr = r + d.r;
    let lc = c + d.c;
    while (inBounds(lr, lc) && board[lr][lc] === null) {
      out.push({ to: { r: lr, c: lc }, captured });
      lr += d.r;
      lc += d.c;
    }
  }
  return out;
}

function captureStepsFor(
  board: (Cell | null)[][],
  from: Pos,
  cell: Cell,
): PathStep[] {
  return cell.king
    ? kingCaptureSteps(board, from, cell.seat)
    : manCaptureSteps(board, from, cell.seat);
}

/**
 * Bir taştan başlayan tüm alma zincirlerini (path) üretir. Alınan taşlar
 * zincir boyunca tahtadan KALDIRILIR (aynı taşı iki kez atlamamak için),
 * ama hareketli taş zincir bitene kadar terfi ETMEZ (standart kural).
 */
function captureChains(
  board: (Cell | null)[][],
  from: Pos,
  cell: Cell,
): Pos[][] {
  const chains: Pos[][] = [];

  function recurse(
    b: (Cell | null)[][],
    pos: Pos,
    piece: Cell,
    path: Pos[],
  ): void {
    const steps = captureStepsFor(b, pos, piece);
    if (steps.length === 0) {
      if (path.length > 1) chains.push(path);
      return;
    }
    for (const step of steps) {
      const nb = cloneBoard(b);
      // Taşı taşı; alınan taşı kaldır.
      nb[pos.r][pos.c] = null;
      if (step.captured) nb[step.captured.r][step.captured.c] = null;
      nb[step.to.r][step.to.c] = { ...piece };
      recurse(nb, step.to, piece, [...path, step.to]);
    }
  }

  recurse(board, from, cell, [from]);
  return chains;
}

/** Bir er için basit (almasız) adımlar. */
function manSimpleSteps(
  board: (Cell | null)[][],
  from: Pos,
  seat: 0 | 1,
): Pos[] {
  const out: Pos[] = [];
  for (const d of manStepDirs(seat)) {
    const r = from.r + d.r;
    const c = from.c + d.c;
    if (inBounds(r, c) && board[r][c] === null) out.push({ r, c });
  }
  return out;
}

/** Dama için basit (almasız) adımlar: kale gibi boş karelere. */
function kingSimpleSteps(board: (Cell | null)[][], from: Pos): Pos[] {
  const out: Pos[] = [];
  for (const d of DIRS) {
    let r = from.r + d.r;
    let c = from.c + d.c;
    while (inBounds(r, c) && board[r][c] === null) {
      out.push({ r, c });
      r += d.r;
      c += d.c;
    }
  }
  return out;
}

/**
 * Sıradaki koltuk için TÜM legal hamleler. Alma varsa SADECE almalar döner
 * (alma zorunlu). NOT: "en çok taş alma" zorunluluğu uygulanmamıştır; sadece
 * mandatory-capture + tam zincirler uygulanır.
 */
export function legalMoves(state: DamaState, seat: 0 | 1): DamaMove[] {
  const { board } = state;
  const captures: DamaMove[] = [];
  const simples: DamaMove[] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r][c];
      if (!cell || cell.seat !== seat) continue;
      const from: Pos = { r, c };
      const chains = captureChains(board, from, cell);
      for (const ch of chains) captures.push({ path: ch });
      if (captures.length === 0) {
        const steps = cell.king
          ? kingSimpleSteps(board, from)
          : manSimpleSteps(board, from, seat);
        for (const to of steps) simples.push({ path: [from, to] });
      }
    }
  }

  // Alma varsa simple'lar atılır (zorunlu). captures doluyken simples zaten
  // toplanmamış olabilir; garanti için captures > 0 ise simples'ı yok say.
  if (captures.length > 0) return captures;
  return simples;
}

/** İki yolun eşitliği. */
function samePath(a: Pos[], b: Pos[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false;
  }
  return true;
}

function validPos(p: unknown): p is Pos {
  if (!p || typeof p !== 'object') return false;
  const { r, c } = p as Pos;
  return (
    Number.isInteger(r) &&
    Number.isInteger(c) &&
    r >= 0 &&
    r < SIZE &&
    c >= 0 &&
    c < SIZE
  );
}

/**
 * Bir hamleyi (önceden legal olduğu doğrulanmış path) tahtaya uygular.
 * Alınan taşları kaldırır, gerekirse terfi eder. Yeni tahtayı döner.
 */
function applyPath(
  board: (Cell | null)[][],
  path: Pos[],
  seat: 0 | 1,
): (Cell | null)[][] {
  const nb = cloneBoard(board);
  const from = path[0];
  const piece = nb[from.r][from.c]!;
  nb[from.r][from.c] = null;
  let cur = from;
  for (let i = 1; i < path.length; i++) {
    const to = path[i];
    // İki kare arasında alınan düşman taşı varsa kaldır (ortogonal hat).
    const dr = Math.sign(to.r - cur.r);
    const dc = Math.sign(to.c - cur.c);
    let r = cur.r + dr;
    let c = cur.c + dc;
    while (r !== to.r || c !== to.c) {
      if (nb[r][c]) nb[r][c] = null; // arada en fazla 1 düşman olur
      r += dr;
      c += dc;
    }
    cur = to;
  }
  // Terfi: zincir bittiğinde son kare karşı arka sıradaysa ve er ise.
  const last = path[path.length - 1];
  const newPiece: Cell = { ...piece };
  if (!newPiece.king && last.r === backRowFor(seat)) newPiece.king = true;
  nb[last.r][last.c] = newPiece;
  return nb;
}

/** Tahtada bir koltuğun taş sayısı. */
function countPieces(board: (Cell | null)[][], seat: 0 | 1): number {
  let n = 0;
  for (const row of board) for (const cell of row) if (cell?.seat === seat) n++;
  return n;
}

/** Oyunun bitip bitmediğini hesaplar ve winner/reason atar. */
function computeWinner(
  board: (Cell | null)[][],
  toMove: 0 | 1,
): { winner: 'p0' | 'p1' | 'draw' | null; reason?: string } {
  const myCount = countPieces(board, toMove);
  if (myCount === 0) {
    return { winner: toMove === 0 ? 'p1' : 'p0', reason: 'Taş kalmadı' };
  }
  const oppCount = countPieces(board, toMove === 0 ? 1 : 0);
  if (oppCount === 0) {
    return { winner: toMove === 0 ? 'p0' : 'p1', reason: 'Taş kalmadı' };
  }
  // Sıradaki tarafın hamlesi yoksa kaybeder.
  const moves = legalMoves({ board, turn: toMove, winner: null }, toMove);
  if (moves.length === 0) {
    return { winner: toMove === 0 ? 'p1' : 'p0', reason: 'Hamle yok' };
  }
  return { winner: null };
}

export const damaModule: GameModule<DamaState, DamaMove> = {
  id: 'dama',
  name: 'Dama',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): DamaState {
    const board: (Cell | null)[][] = Array.from({ length: SIZE }, () =>
      Array<Cell | null>(SIZE).fill(null),
    );
    // Koyu (seat1) row 1,2; açık (seat0) row 5,6. Tüm sütunlar.
    for (let c = 0; c < SIZE; c++) {
      board[1][c] = { seat: 1, king: false };
      board[2][c] = { seat: 1, king: false };
      board[5][c] = { seat: 0, king: false };
      board[6][c] = { seat: 0, king: false };
    }
    return { board, turn: 0, winner: null, idle: 0 };
  },

  applyMove(state, move, seat): ApplyMoveResult<DamaState> {
    if (state.winner) return { ok: false, error: 'Oyun bitti.' };
    if (seat !== state.turn) return { ok: false, error: 'Sıra sizde değil.' };

    // Payload doğrulama.
    if (
      !move ||
      !Array.isArray(move.path) ||
      move.path.length < 2 ||
      !move.path.every(validPos)
    ) {
      return { ok: false, error: 'Geçersiz hamle.' };
    }

    const seat01 = seat as 0 | 1;
    const moves = legalMoves(state, seat01);
    const hasCapture =
      moves.length > 0 && moves[0].path.length >= 2 && isCaptureMove(state, moves[0]);

    // Gönderilen path, legal hamlelerden biriyle birebir eşleşmeli.
    const matched = moves.find((m) => samePath(m.path, move.path));
    if (!matched) {
      // Alma zorunluyken almasız hamle denenmişse ayrı mesaj.
      if (hasCapture && !isCaptureMove(state, move)) {
        return { ok: false, error: 'Alma zorunlu.' };
      }
      return { ok: false, error: 'Geçersiz hamle.' };
    }

    const nb = applyPath(state.board, matched.path, seat01);
    const nextTurn = (seat01 === 0 ? 1 : 0) as 0 | 1;

    // İlerleme: yalnız ALMA ya da dama'ya TERFİ sayacı sıfırlar. Sade er/dama
    // hamleleri (yan-yan mekik dahil) saymaz; böylece oyun mutlaka sonlanır.
    const start = matched.path[0];
    const end = matched.path[matched.path.length - 1];
    const moverWasKing = state.board[start.r][start.c]?.king === true;
    const promoted = !moverWasKing && nb[end.r][end.c]?.king === true;
    const progressed = isCaptureMove(state, matched) || promoted;
    const idle = progressed ? 0 : (state.idle ?? 0) + 1;

    let { winner, reason } = computeWinner(nb, nextTurn);
    if (!winner && idle >= IDLE_LIMIT) {
      winner = 'draw';
      reason = 'Beraberlik (ilerleme yok)';
    }

    return {
      ok: true,
      state: {
        board: nb,
        turn: nextTurn,
        winner,
        reason,
        lastPath: matched.path,
        idle,
      },
    };
  },

  getStatus(state): GameStatus {
    if (state.winner) {
      if (state.winner === 'draw')
        return { over: true, result: 'draw', reason: state.reason ?? 'Berabere' };
      return {
        over: true,
        result: state.winner,
        reason: state.reason ?? 'Oyun bitti',
      };
    }
    return { over: false, turn: state.turn === 0 ? 'p0' : 'p1' };
  },

  turnSeat(state): number | null {
    return state.winner ? null : state.turn;
  },

  getBotMove(state, seat, difficulty): DamaMove | null {
    return botMove(state, seat as 0 | 1, difficulty);
  },
};

/** Bir hamlenin alma (capture) olup olmadığı: en az bir taş atlanıyorsa. */
function isCaptureMove(state: DamaState, move: DamaMove): boolean {
  // İlk adımda |delta| > 1 ise (er) ya da arada taş varsa (dama) almadır.
  const a = move.path[0];
  const b = move.path[1];
  const dr = Math.abs(b.r - a.r);
  const dc = Math.abs(b.c - a.c);
  if (dr + dc <= 1) return false; // tek kare = basit
  // Arada bir düşman taş var mı?
  const sr = Math.sign(b.r - a.r);
  const sc = Math.sign(b.c - a.c);
  let r = a.r + sr;
  let c = a.c + sc;
  while (r !== b.r || c !== b.c) {
    if (state.board[r][c]) return true;
    r += sr;
    c += sc;
  }
  return false;
}

// ---- Bot: alfa-beta (minimax) ----

const MAN_VALUE = 100;
const KING_VALUE = 300;
const MATE = 1_000_000;

function depthFor(d: number): number {
  return [2, 3, 4, 5][Math.max(1, Math.min(4, d)) - 1];
}

/** Konum: ilerleme bonusu (er rakip tarafa yaklaştıkça değerli). */
function evaluate(board: (Cell | null)[][]): number {
  // seat0 (light) lehine pozitif; seat1 (dark) lehine negatif.
  let s = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      let v = cell.king ? KING_VALUE : MAN_VALUE;
      if (!cell.king) {
        // İlerleme: seat0 row 0'a (küçük r) yaklaşınca; seat1 row 7'ye.
        const adv = cell.seat === 0 ? 7 - r : r;
        v += adv * 4;
      }
      s += cell.seat === 0 ? v : -v;
    }
  }
  return s;
}

/** Hamleleri sırala: önce daha çok taş alanlar (budama için). */
function captureCount(move: DamaMove): number {
  return move.path.length - 1; // zincir uzunluğu ~ alınan taş sayısı (er)
}

function orderMoves(moves: DamaMove[]): DamaMove[] {
  return [...moves].sort((a, b) => captureCount(b) - captureCount(a));
}

/**
 * Negamax-benzeri alfa-beta; skor seat0 (light) açısından. maximizing = seat0.
 */
function search(
  board: (Cell | null)[][],
  toMove: 0 | 1,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const myCount = countPieces(board, toMove);
  if (myCount === 0) {
    // toMove kaybetti.
    return toMove === 0 ? -(MATE + depth) : MATE + depth;
  }
  const moves = legalMoves({ board, turn: toMove, winner: null }, toMove);
  if (moves.length === 0) {
    return toMove === 0 ? -(MATE + depth) : MATE + depth;
  }
  if (depth === 0) return evaluate(board);

  const maximizing = toMove === 0;
  let best = maximizing ? -Infinity : Infinity;
  const next = (toMove === 0 ? 1 : 0) as 0 | 1;

  for (const m of orderMoves(moves)) {
    const nb = applyPath(board, m.path, toMove);
    const v = search(nb, next, depth - 1, alpha, beta);
    if (maximizing) {
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

function botMove(state: DamaState, seat: 0 | 1, difficulty: number): DamaMove | null {
  const moves = legalMoves(state, seat);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  // Kolay: bazen tamamen rastgele oyna.
  if (difficulty <= 1 && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = depthFor(difficulty);
  const maximizing = seat === 0;
  const next = (seat === 0 ? 1 : 0) as 0 | 1;

  const scored = orderMoves(moves).map((m) => {
    const nb = applyPath(state.board, m.path, seat);
    const score = search(nb, next, depth - 1, -Infinity, Infinity);
    return { m, score };
  });

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  const bestScore = scored[0].score;
  // Yakın hamleler arasından rastgele (çeşitlilik).
  const slack = difficulty <= 2 ? 30 : 0;
  const pool = scored.filter((s) => Math.abs(s.score - bestScore) <= slack);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? scored[0];
  return pick.m;
}
