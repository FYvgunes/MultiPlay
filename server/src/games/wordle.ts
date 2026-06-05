import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';
import {
  ANSWERS,
  VALID,
  isValid,
  randomAnswer,
  letters,
} from './data/wordleWords.js';

// ---- Sabitler ----
const MAX_ROWS = 6;
const WORD_LEN = 5;

type Mark = 'hit' | 'present' | 'miss';

export interface WordleRow {
  word: string; // BÜYÜK 5 harf
  marks: Mark[];
}

export interface WordleState {
  answer: string; // gizli cevap (BÜYÜK)
  rows: { 0: WordleRow[]; 1: WordleRow[] };
  done: [boolean, boolean];
  solved: [boolean, boolean];
}

type WordleMove = { guess: string };

// Türkçe büyütme: i->İ, ı->I doğru olsun. tr-TR locale kullanırız.
function toUpperTr(s: string): string {
  return s.toLocaleUpperCase('tr-TR');
}

/** Sadece bilinen 5 Türkçe harften mi oluşuyor? */
const LETTER_SET = new Set([
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ',
  'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T',
  'U', 'Ü', 'V', 'Y', 'Z',
]);

function isFiveTurkishLetters(word: string): boolean {
  const ls = letters(word);
  if (ls.length !== WORD_LEN) return false;
  return ls.every((c) => LETTER_SET.has(c));
}

/** Wordle işaretleme: önce tam isabetler, sonra kalan harflerden 'present'. */
function scoreGuess(guess: string, answer: string): Mark[] {
  const g = letters(guess);
  const a = letters(answer);
  const marks: Mark[] = new Array(WORD_LEN).fill('miss');

  // Cevaptaki harf sayıları.
  const remaining = new Map<string, number>();
  for (const c of a) remaining.set(c, (remaining.get(c) ?? 0) + 1);

  // 1. geçiş: tam isabetler.
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === a[i]) {
      marks[i] = 'hit';
      remaining.set(g[i], (remaining.get(g[i]) ?? 0) - 1);
    }
  }
  // 2. geçiş: kalan sayıdan 'present'.
  for (let i = 0; i < WORD_LEN; i++) {
    if (marks[i] === 'hit') continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      marks[i] = 'present';
      remaining.set(g[i], left - 1);
    }
  }
  return marks;
}

/** Bir koltuk bitti mi? (çözdü ya da hak doldu) */
function seatDone(state: WordleState, seat: 0 | 1): boolean {
  return state.solved[seat] || state.rows[seat].length >= MAX_ROWS;
}

/** Bir tahminin geçmiş (guess, marks) kısıtlarına uyup uymadığı. */
function consistentWith(candidate: string, row: WordleRow): boolean {
  return scoreGuess(row.word, candidate).join('') === row.marks.join('');
}

/** Bu koltuğun geçmişine göre olası cevap adaylarını yeniden hesaplar. */
function candidatesFor(rows: WordleRow[]): string[] {
  return ANSWERS.filter((w) => rows.every((r) => consistentWith(w, r)));
}

/** Adaylar arasından harf-kapsama/frekans skoru en yüksek olanı seçer. */
function bestByCoverage(cands: string[]): string {
  // Adaylar üzerindeki harf frekansını hesapla.
  const freq = new Map<string, number>();
  for (const w of cands) {
    for (const c of new Set(letters(w))) {
      freq.set(c, (freq.get(c) ?? 0) + 1);
    }
  }
  let best = cands[0];
  let bestScore = -1;
  for (const w of cands) {
    let score = 0;
    for (const c of new Set(letters(w))) score += freq.get(c) ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const wordleModule: GameModule<WordleState, WordleMove> = {
  id: 'wordle',
  name: 'Wordle',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): WordleState {
    return {
      answer: randomAnswer(),
      rows: { 0: [], 1: [] },
      done: [false, false],
      solved: [false, false],
    };
  },

  applyMove(state, move, seat): ApplyMoveResult<WordleState> {
    const s = seat as 0 | 1;
    if (state.done[s]) {
      return { ok: false, error: 'Tahmin hakkın bitti.' };
    }
    const raw = (move as { guess?: unknown }).guess;
    if (typeof raw !== 'string') {
      return { ok: false, error: 'Geçersiz tahmin.' };
    }
    const guess = toUpperTr(raw.trim());
    if (!isFiveTurkishLetters(guess)) {
      return { ok: false, error: '5 harfli bir kelime gir.' };
    }
    if (!isValid(guess)) {
      return { ok: false, error: 'Listede yok.' };
    }

    const marks = scoreGuess(guess, state.answer);
    const row: WordleRow = { word: guess, marks };

    const rows: WordleState['rows'] = {
      0: s === 0 ? [...state.rows[0], row] : state.rows[0],
      1: s === 1 ? [...state.rows[1], row] : state.rows[1],
    };
    const solved: [boolean, boolean] = [...state.solved];
    const done: [boolean, boolean] = [...state.done];

    if (guess === state.answer) {
      solved[s] = true;
      done[s] = true;
    } else if (rows[s].length >= MAX_ROWS) {
      done[s] = true;
    }

    return { ok: true, state: { ...state, rows, solved, done } };
  },

  getStatus(state): GameStatus {
    const over = state.done[0] && state.done[1];
    if (!over) return { over: false };

    const n0 = state.rows[0].length;
    const n1 = state.rows[1].length;
    const a = state.answer;

    if (state.solved[0] && state.solved[1]) {
      if (n0 < n1) return { over: true, result: 'p0', reason: `Kelime: ${a}` };
      if (n1 < n0) return { over: true, result: 'p1', reason: `Kelime: ${a}` };
      return { over: true, result: 'draw', reason: `Berabere! Kelime: ${a}` };
    }
    if (state.solved[0]) {
      return { over: true, result: 'p0', reason: `Kelime: ${a}` };
    }
    if (state.solved[1]) {
      return { over: true, result: 'p1', reason: `Kelime: ${a}` };
    }
    return { over: true, result: 'draw', reason: `Kimse bulamadı! Kelime: ${a}` };
  },

  pendingSeats(state): number[] {
    return [0, 1].filter((s) => state.done[s] === false);
  },

  getBotMove(state, seat, difficulty): WordleMove | null {
    const s = seat as 0 | 1;
    if (state.done[s]) return null;

    const myRows = state.rows[s];
    const cands = candidatesFor(myRows);
    const validList = [...VALID];
    const d = Math.max(1, Math.min(4, difficulty));

    let guess: string;
    if (d === 1) {
      // Zayıf: geri bildirimi yok say, rastgele geçerli kelime.
      guess = pick(validList);
    } else if (cands.length === 0) {
      // Adaylar tükendi (tutarsızlık): geçerli listeden seç.
      guess = pick(validList);
    } else if (d === 2) {
      guess = pick(cands);
    } else if (d === 3) {
      guess = bestByCoverage(cands);
    } else {
      // d === 4: en iyi daraltan / iyi sezgisel.
      guess = bestByCoverage(cands);
    }

    if (!isValid(guess) || letters(guess).length !== WORD_LEN) {
      guess = pick(validList);
    }
    return { guess };
  },

  getBotDelayMs(): number {
    return 900 + Math.floor(Math.random() * 1300); // 0.9–2.2 sn
  },

  viewFor(state, seat) {
    const over = state.done[0] && state.done[1];

    // İzleyici: harfleri gizle, sadece sayılar/çözüldü bilgisi.
    if (seat !== 0 && seat !== 1) {
      return {
        spectator: true,
        maxRows: MAX_ROWS,
        wordLen: WORD_LEN,
        over,
        seats: [0, 1].map((i) => ({
          guessCount: state.rows[i as 0 | 1].length,
          solved: state.solved[i as 0 | 1],
          done: state.done[i as 0 | 1],
        })),
        answer: over ? state.answer : undefined,
      };
    }

    const me = seat as 0 | 1;
    const opp: 0 | 1 = me === 0 ? 1 : 0;

    return {
      spectator: false,
      maxRows: MAX_ROWS,
      wordLen: WORD_LEN,
      over,
      // Kendi satırların tam (kelime + işaretler).
      rows: state.rows[me],
      solved: state.solved[me],
      done: state.done[me],
      // Hâlâ tahmin edebilir miyim?
      pending: !state.done[me],
      // Rakip: sadece sayaç + çözüldü/bitti, HARF YOK.
      opponent: {
        guessCount: state.rows[opp].length,
        solved: state.solved[opp],
        done: state.done[opp],
      },
      // Cevap yalnızca oyun bitince.
      answer: over ? state.answer : undefined,
    };
  },
};
