import type { GameModule, GameStatus, ApplyMoveResult } from '@oyun/shared';
import { generateQuestions, type QuizQuestion } from '../ai/quizGenerator.js';

// ---- Sabitler ----
const COUNT = 10;
const QUESTION_MS = 15_000;
const REVEAL_MS = 3_500;
const BASE_POINTS = 10;
const SPEED_BONUS_MAX = 5;

type Phase = 'loading' | 'ready' | 'question' | 'reveal' | 'over';

export interface QuizState {
  phase: Phase;
  category: string;
  kids: boolean;
  questions: QuizQuestion[];
  index: number;
  questionStartedAt: number;
  deadlineAt: number;
  answers: (number | null)[]; // koltuk -> seçilen şık (aktif soru)
  elapsed: (number | null)[]; // koltuk -> cevap süresi (ms)
  scores: number[]; // [seat0, seat1]
}

interface QuizConfig {
  category?: string;
  kids?: boolean;
}

type QuizMove = { type: 'start' } | { answerIndex: number };

function freshQuestionFields(now: number) {
  return {
    questionStartedAt: now,
    deadlineAt: now + QUESTION_MS,
    answers: [null, null] as (number | null)[],
    elapsed: [null, null] as (number | null)[],
  };
}

function speedBonus(elapsedMs: number): number {
  const remaining = Math.max(0, (QUESTION_MS - elapsedMs) / QUESTION_MS);
  return Math.round(SPEED_BONUS_MAX * remaining);
}

/** Aktif soruyu puanlar ve reveal aşamasına geçirir. */
function toReveal(state: QuizState, now: number): QuizState {
  const q = state.questions[state.index];
  const scores = [...state.scores];
  for (let s = 0; s < 2; s++) {
    if (state.answers[s] === q.correctIndex) {
      scores[s] += BASE_POINTS + speedBonus(state.elapsed[s] ?? QUESTION_MS);
    }
  }
  return {
    ...state,
    phase: 'reveal',
    scores,
    deadlineAt: now + REVEAL_MS,
  };
}

function startQuestion(state: QuizState, index: number, now: number): QuizState {
  return { ...state, phase: 'question', index, ...freshQuestionFields(now) };
}

export const quizModule: GameModule<QuizState, QuizMove> = {
  id: 'quiz',
  name: 'Bilgi Yarışması',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(config): QuizState {
    const c = (config ?? {}) as QuizConfig;
    return {
      phase: 'loading',
      category: c.category || 'Genel Kültür',
      kids: !!c.kids,
      questions: [],
      index: 0,
      questionStartedAt: 0,
      deadlineAt: 0,
      answers: [null, null],
      elapsed: [null, null],
      scores: [0, 0],
    };
  },

  async init(state): Promise<QuizState> {
    const questions = await generateQuestions({
      category: state.category,
      kids: state.kids,
      difficulty: state.kids ? 1 : 2,
      count: COUNT,
      seed: String(Date.now()),
    });
    return { ...state, questions, phase: 'ready', index: 0, scores: [0, 0] };
  },

  applyMove(state, move, seat): ApplyMoveResult<QuizState> {
    const now = Date.now();

    // Yarışmayı başlat (her oyuncu basabilir; bot basmaz).
    if ((move as { type?: string }).type === 'start') {
      if (state.phase !== 'ready') {
        return { ok: false, error: 'Şu an başlatılamaz.' };
      }
      if (state.questions.length === 0) {
        return { ok: false, error: 'Sorular hazır değil.' };
      }
      return { ok: true, state: startQuestion(state, 0, now) };
    }

    // Cevap
    if (state.phase !== 'question') {
      return { ok: false, error: 'Şu an cevap kabul edilmiyor.' };
    }
    const answerIndex = (move as { answerIndex?: number }).answerIndex;
    if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex > 3) {
      return { ok: false, error: 'Geçersiz cevap.' };
    }
    if (state.answers[seat] !== null) {
      return { ok: false, error: 'Bu soruyu zaten cevapladın.' };
    }

    const answers = [...state.answers];
    const elapsed = [...state.elapsed];
    answers[seat] = answerIndex;
    elapsed[seat] = now - state.questionStartedAt;

    let next: QuizState = { ...state, answers, elapsed };
    // Her iki koltuk da cevapladıysa reveal'a geç.
    if (answers[0] !== null && answers[1] !== null) {
      next = toReveal(next, now);
    }
    return { ok: true, state: next };
  },

  onTimeout(state): ApplyMoveResult<QuizState> {
    const now = Date.now();
    if (state.phase === 'question') {
      return { ok: true, state: toReveal(state, now) };
    }
    if (state.phase === 'reveal') {
      const nextIndex = state.index + 1;
      if (nextIndex >= state.questions.length) {
        return { ok: true, state: { ...state, phase: 'over', deadlineAt: 0 } };
      }
      return { ok: true, state: startQuestion(state, nextIndex, now) };
    }
    return { ok: false };
  },

  getDeadline(state): number | null {
    return state.phase === 'question' || state.phase === 'reveal'
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
    if (state.phase !== 'question') return [];
    return [0, 1].filter((s) => state.answers[s] === null);
  },

  getBotMove(state, seat, difficulty): QuizMove | null {
    if (state.phase !== 'question') return null;
    const q = state.questions[state.index];
    if (!q) return null;
    const pCorrect = [0.45, 0.6, 0.78, 0.92][
      Math.max(1, Math.min(4, difficulty)) - 1
    ];
    if (Math.random() < pCorrect) return { answerIndex: q.correctIndex };
    // Yanlış: doğru olmayan rastgele bir şık.
    const wrong = [0, 1, 2, 3].filter((i) => i !== q.correctIndex);
    return { answerIndex: wrong[Math.floor(Math.random() * wrong.length)] };
  },

  getBotDelayMs(): number {
    return 1200 + Math.floor(Math.random() * 2800); // 1.2–4.0 sn
  },

  viewFor(state, seat) {
    const reveal = state.phase === 'reveal' || state.phase === 'over';
    const q = state.questions[state.index];
    const showQuestion =
      (state.phase === 'question' || state.phase === 'reveal') && q;

    return {
      phase: state.phase,
      category: state.category,
      kids: state.kids,
      index: state.index,
      total: state.questions.length,
      scores: state.scores,
      deadlineAt: state.deadlineAt,
      question: showQuestion ? { text: q.text, options: q.options } : undefined,
      answered: state.answers.map((a) => a !== null),
      yourAnswer: seat === 0 || seat === 1 ? state.answers[seat] : null,
      answers: reveal ? state.answers : [null, null],
      correctIndex: reveal && q ? q.correctIndex : undefined,
      explanation: reveal && q ? q.explanation : undefined,
    };
  },
};
