import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';
import { botWord, trUpper, firstLetterUpper } from './data/namecityWords.js';

// ---- Sabitler ----
const CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya'];
const ROUNDS = 5;
const ROUND_MS = 60_000;
const REVEAL_MS = 6_000;
// Yeterince kelime barındıran harfler (Ğ, J ve nadir başlangıçlar hariç).
const LETTERS = 'ABCÇDEFGHİKLMNOÖPRSŞTUÜVYZ'.split('');

type Phase = 'ready' | 'round' | 'reveal' | 'over';

// koltuk -> kategori -> metin
type SeatAnswers = Record<string, string>;

export interface NameCityState {
  phase: Phase;
  round: number; // 0-based
  total: number;
  letter: string;
  deadlineAt: number;
  answers: Record<number, SeatAnswers>; // { 0: {...}, 1: {...} }
  submitted: boolean[]; // [seat0, seat1]
  scores: [number, number];
  // Az önce açılan turun koltuk-başına kategori puanları (reveal gösterimi).
  roundScores: Record<number, Record<string, number>>;
}

type NameCityMove =
  | { type: 'start' }
  | { type: 'fill'; category: string; value: string }
  | { type: 'submit' };

function emptyAnswers(): Record<number, SeatAnswers> {
  const mk = (): SeatAnswers => {
    const o: SeatAnswers = {};
    for (const c of CATEGORIES) o[c] = '';
    return o;
  };
  return { 0: mk(), 1: mk() };
}

function emptyRoundScores(): Record<number, Record<string, number>> {
  const mk = (): Record<string, number> => {
    const o: Record<string, number> = {};
    for (const c of CATEGORIES) o[c] = 0;
    return o;
  };
  return { 0: mk(), 1: mk() };
}

function pickLetter(prev: string): string {
  const pool = LETTERS.filter((l) => l !== prev);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Bir cevap geçerli mi? (boş değil, len>=2, baş harf tur harfine eşit) */
function isValid(value: string, letter: string): boolean {
  const t = value.trim();
  if (t.length < 2) return false;
  return firstLetterUpper(t) === letter;
}

/** Türkçe küçük harfe çevirerek karşılaştırma normalizasyonu. */
function normLower(s: string): string {
  return s
    .trim()
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i')
    .toLowerCase();
}

/** Aktif turu puanlar ve reveal aşamasına geçirir. */
function scoreRound(state: NameCityState, now: number): NameCityState {
  const scores: [number, number] = [state.scores[0], state.scores[1]];
  const roundScores = emptyRoundScores();
  const letter = state.letter;

  for (const cat of CATEGORIES) {
    const a0 = state.answers[0][cat] ?? '';
    const a1 = state.answers[1][cat] ?? '';
    const v0 = isValid(a0, letter);
    const v1 = isValid(a1, letter);

    let p0 = 0;
    let p1 = 0;
    if (v0 && v1) {
      if (normLower(a0) === normLower(a1)) {
        p0 = 5;
        p1 = 5;
      } else {
        p0 = 10;
        p1 = 10;
      }
    } else {
      if (v0) p0 = 10;
      if (v1) p1 = 10;
    }
    roundScores[0][cat] = p0;
    roundScores[1][cat] = p1;
    scores[0] += p0;
    scores[1] += p1;
  }

  return {
    ...state,
    phase: 'reveal',
    scores,
    roundScores,
    deadlineAt: now + REVEAL_MS,
  };
}

function startRound(state: NameCityState, round: number, now: number): NameCityState {
  return {
    ...state,
    phase: 'round',
    round,
    letter: pickLetter(state.letter),
    deadlineAt: now + ROUND_MS,
    answers: emptyAnswers(),
    submitted: [false, false],
    roundScores: emptyRoundScores(),
  };
}

export const namecityModule: GameModule<NameCityState, NameCityMove> = {
  id: 'namecity',
  name: 'İsim-Şehir',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): NameCityState {
    return {
      phase: 'ready',
      round: 0,
      total: ROUNDS,
      letter: '',
      deadlineAt: 0,
      answers: emptyAnswers(),
      submitted: [false, false],
      scores: [0, 0],
      roundScores: emptyRoundScores(),
    };
  },

  applyMove(state, move, seat): ApplyMoveResult<NameCityState> {
    const now = Date.now();
    const type = (move as { type?: string }).type;

    // Oyunu başlat (her oyuncu basabilir; bot basmaz).
    if (type === 'start') {
      if (state.phase !== 'ready') {
        return { ok: false, error: 'Şu an başlatılamaz.' };
      }
      return { ok: true, state: startRound(state, 0, now) };
    }

    if (type === 'fill') {
      if (state.phase !== 'round') {
        return { ok: false, error: 'Şu an cevap girilemez.' };
      }
      if (state.submitted[seat]) {
        return { ok: false, error: 'Cevapların zaten alındı.' };
      }
      const category = (move as { category?: string }).category ?? '';
      if (!CATEGORIES.includes(category)) {
        return { ok: false, error: 'Geçersiz kategori.' };
      }
      const value = String((move as { value?: unknown }).value ?? '');
      const answers = {
        0: { ...state.answers[0] },
        1: { ...state.answers[1] },
      };
      answers[seat as 0 | 1][category] = value;
      return { ok: true, state: { ...state, answers } };
    }

    if (type === 'submit') {
      if (state.phase !== 'round') {
        return { ok: false, error: 'Şu an gönderilemez.' };
      }
      if (state.submitted[seat]) {
        return { ok: false, error: 'Cevapların zaten alındı.' };
      }
      const submitted = [...state.submitted];
      submitted[seat] = true;
      let next: NameCityState = { ...state, submitted };
      if (submitted[0] && submitted[1]) {
        next = scoreRound(next, now);
      }
      return { ok: true, state: next };
    }

    return { ok: false, error: 'Geçersiz hamle.' };
  },

  onTimeout(state): ApplyMoveResult<NameCityState> {
    const now = Date.now();
    if (state.phase === 'round') {
      // Süre bitti: olduğu gibi puanla, reveal'a geç.
      return { ok: true, state: scoreRound(state, now) };
    }
    if (state.phase === 'reveal') {
      const nextRound = state.round + 1;
      if (nextRound >= state.total) {
        return { ok: true, state: { ...state, phase: 'over', deadlineAt: 0 } };
      }
      return { ok: true, state: startRound(state, nextRound, now) };
    }
    return { ok: false };
  },

  getDeadline(state): number | null {
    return state.phase === 'round' || state.phase === 'reveal'
      ? state.deadlineAt
      : null;
  },

  getStatus(state): GameStatus {
    if (state.phase !== 'over') return { over: false };
    const [a, b] = state.scores;
    const result = a > b ? 'p0' : b > a ? 'p1' : 'draw';
    return { over: true, result, reason: `${a} - ${b}` };
  },

  pendingSeats(state): number[] {
    if (state.phase !== 'round') return [];
    return [0, 1].filter((s) => state.submitted[s] === false);
  },

  getBotMove(state, seat, difficulty): NameCityMove | null {
    if (state.phase !== 'round') return null;
    if (state.submitted[seat]) return null;

    // Zorluğa göre doldurulacak kategori sayısı.
    const fillCount = [2, 3, 4, 5][Math.max(1, Math.min(4, difficulty)) - 1];
    const letter = trUpper(state.letter);
    const mine = state.answers[seat] ?? {};

    // Botun hedeflediği ilk N kategoriden henüz boş olan ilkini doldur.
    const targets = CATEGORIES.slice(0, fillCount);
    for (const cat of targets) {
      if ((mine[cat] ?? '').trim() !== '') continue; // zaten dolu
      const word = botWord(cat, letter);
      if (word) {
        return { type: 'fill', category: cat, value: word };
      }
      // Bu harf için kelime yok: bu kategoriyi boş bırakıp devam et.
    }

    // Doldurulabilecek kategori kalmadı: gönder.
    return { type: 'submit' };
  },

  getBotDelayMs(): number {
    return 500 + Math.floor(Math.random() * 700); // 0.5–1.2 sn
  },

  viewFor(state, seat) {
    const reveal = state.phase === 'reveal' || state.phase === 'over';
    const isPlayer = seat === 0 || seat === 1;
    const me = isPlayer ? (seat as 0 | 1) : 0;

    // Round sırasında SADECE kendi cevapların; reveal/over'da her ikisi.
    let answers: Record<number, SeatAnswers>;
    if (reveal) {
      answers = { 0: { ...state.answers[0] }, 1: { ...state.answers[1] } };
    } else {
      const mineOnly: Record<number, SeatAnswers> = { 0: {}, 1: {} };
      if (isPlayer) mineOnly[me] = { ...state.answers[me] };
      answers = mineOnly;
    }

    return {
      phase: state.phase,
      round: state.round,
      total: state.total,
      letter: state.letter,
      categories: CATEGORIES,
      scores: state.scores,
      deadlineAt: state.deadlineAt,
      submitted: state.submitted,
      yourSubmitted: isPlayer ? state.submitted[me] : false,
      answers,
      roundScores: reveal ? state.roundScores : emptyRoundScores(),
    };
  },
};
