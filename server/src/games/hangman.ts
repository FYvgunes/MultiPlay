import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';
import { HANGMAN_WORDS } from './data/hangmanWords.js';

// ---- Sabitler ----
const MAX_WRONG = 6;
const BASE_POINTS = 10; // doğru harfin her geçişi için puan

// Türkçe alfabe (29 harf). Geçerli tahmin harfleri bunlar.
const TURKISH_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z',
] as const;
const ALPHABET_SET = new Set<string>(TURKISH_ALPHABET);

// Bot için Türkçe harf sıklık sırası (en sıktan en seyreğe).
const FREQ_ORDER = 'AEİKLRNMTUDSOBÜYŞZGÇHĞVCÖPFJ'.split('');

export interface HangmanState {
  word: string; // BÜYÜK, gizli
  category: string;
  guessed: string[]; // denenen harfler, BÜYÜK
  wrong: number;
  maxWrong: number;
  turn: 0 | 1;
  scores: [number, number];
  over: boolean;
  won: boolean; // kelime tamamen açıldı mı
}

export interface HangmanMove {
  letter: string;
}

interface HangmanConfig {
  category?: string;
}

/** Türkçe büyük harfe çevirir (i->İ, ı korunur). */
function trUpper(s: string): string {
  return s
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .toUpperCase();
}

/** Kelimedeki boşluk olmayan tüm harfler tahmin edildiyse kelime açılmıştır. */
function isWordRevealed(word: string, guessed: string[]): boolean {
  const set = new Set(guessed);
  for (const ch of word) {
    if (ch === ' ') continue;
    if (!set.has(ch)) return false;
  }
  return true;
}

/** Açık harfleri gösterir, gizli (boşluk olmayan) harfleri '_' yapar. */
function maskWord(word: string, guessed: string[]): string {
  const set = new Set(guessed);
  let out = '';
  for (const ch of word) {
    if (ch === ' ') out += ' ';
    else out += set.has(ch) ? ch : '_';
  }
  return out;
}

function pickWord(config?: unknown): { word: string; category: string } {
  const c = (config ?? {}) as HangmanConfig;
  const pool = c.category
    ? HANGMAN_WORDS.filter((w) => w.category === c.category)
    : HANGMAN_WORDS;
  const list = pool.length > 0 ? pool : HANGMAN_WORDS;
  const chosen = list[Math.floor(Math.random() * list.length)];
  return { word: trUpper(chosen.word), category: chosen.category };
}

export const hangmanModule: GameModule<HangmanState, HangmanMove> = {
  id: 'hangman',
  name: 'Adam Asmaca',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(config): HangmanState {
    const { word, category } = pickWord(config);
    return {
      word,
      category,
      guessed: [],
      wrong: 0,
      maxWrong: MAX_WRONG,
      turn: 0,
      scores: [0, 0],
      over: false,
      won: false,
    };
  },

  applyMove(state, move, seat): ApplyMoveResult<HangmanState> {
    if (state.over) return { ok: false, error: 'Oyun bitti.' };
    if (seat !== state.turn) return { ok: false, error: 'Sıra sizde değil.' };

    const letter = trUpper(String(move?.letter ?? '').trim());
    if (!ALPHABET_SET.has(letter)) {
      return { ok: false, error: 'Geçersiz harf.' };
    }
    if (state.guessed.includes(letter)) {
      return { ok: false, error: 'Bu harf zaten denendi.' };
    }

    const guessed = [...state.guessed, letter];
    const scores: [number, number] = [state.scores[0], state.scores[1]];
    let wrong = state.wrong;

    // Harfin kelimedeki geçiş sayısı.
    let occurrences = 0;
    for (const ch of state.word) if (ch === letter) occurrences++;

    if (occurrences > 0) {
      scores[seat] += BASE_POINTS * occurrences;
    } else {
      wrong += 1;
    }

    // Adil sıra: her zaman diğer koltuğa geç.
    const turn: 0 | 1 = seat === 0 ? 1 : 0;

    let over = false;
    let won = false;
    if (isWordRevealed(state.word, guessed)) {
      won = true;
      over = true;
    } else if (wrong >= state.maxWrong) {
      over = true;
      won = false;
    }

    return {
      ok: true,
      state: { ...state, guessed, scores, wrong, turn, over, won },
    };
  },

  getStatus(state): GameStatus {
    if (!state.over) return { over: false };
    const [a, b] = state.scores;
    const result = a > b ? 'p0' : b > a ? 'p1' : 'draw';
    const reason = state.won
      ? `Kelime: ${state.word}`
      : `Adam asıldı! Kelime: ${state.word}`;
    return { over: true, result, reason };
  },

  turnSeat(state): number | null {
    return state.over ? null : state.turn;
  },

  getBotMove(state, _seat, difficulty): HangmanMove | null {
    const d = Math.max(1, Math.min(4, difficulty));
    const remaining = FREQ_ORDER.filter((l) => !state.guessed.includes(l));
    // Alfabede olup sıklık listesinde olmayan harfler de aday (güvenlik için).
    const extra = TURKISH_ALPHABET.filter(
      (l) => !state.guessed.includes(l) && !FREQ_ORDER.includes(l),
    );
    const pool = [...remaining, ...extra];
    if (pool.length === 0) return null;

    if (d <= 1) {
      // Kolay: tamamen rastgele bir denenmemiş harf.
      return { letter: pool[Math.floor(Math.random() * pool.length)] };
    }
    if (d >= 4) {
      // Usta: her zaman kalan en sık harf.
      return { letter: pool[0] };
    }
    // 2-3: sıklık sırasını tercih et ama biraz rastgelelik kat.
    // Daha yüksek zorlukta listenin başına daha çok yaklaşır.
    const window = d === 2 ? Math.min(6, pool.length) : Math.min(3, pool.length);
    return { letter: pool[Math.floor(Math.random() * window)] };
  },

  getBotDelayMs(): number {
    return 700 + Math.floor(Math.random() * 800); // 0.7–1.5 sn
  },

  viewFor(state, seat) {
    return {
      category: state.category,
      masked: maskWord(state.word, state.guessed),
      guessed: state.guessed,
      wrong: state.wrong,
      maxWrong: state.maxWrong,
      turn: state.turn,
      scores: state.scores,
      over: state.over,
      won: state.won,
      word: state.over ? state.word : undefined,
      yourSeat: seat,
    };
  },
};
