import type { GameModule, GameStatus, ApplyMoveResult, Seat } from '@oyun/shared';

// ---- Sabitler ----
const DRAW_MS = 3_500; // iki sayı çekimi arası süre
const ROWS = 3;
const COLS = 9;

type Phase = 'ready' | 'drawing' | 'over';

/**
 * Tombala kartı: 3 satır x 9 sütun. Her hücre ya bir sayı (1..90) ya da boş
 * (null). Her satırda tam 5 sayı, her sütunda 1-3 sayı, toplam 15 sayı bulunur.
 * Sütun içi sayılar artan sırada dizilir.
 */
export type Cell = number | null;
export type Card = Cell[][]; // [satır][sütun]

export interface TombalaState {
  phase: Phase;
  cards: Card[]; // koltuk -> kart
  marked: boolean[][][]; // koltuk -> [satır][sütun] işaretli mi
  drawn: number[]; // çekilen sayılar (sırasıyla)
  drawnSet: boolean[]; // 1..90 çekildi mi (index = sayı)
  current: number | null; // son çekilen sayı
  deadlineAt: number; // sıradaki çekim zamanı (epoch ms)
  cinko: number[]; // koltuk -> tamamlanan satır sayısı (0..3)
  firstCinkoSeat: number | null; // ilk çinko yapan koltuk
  secondCinkoSeat: number | null; // ikinci çinko yapan koltuk
  winner: number | null; // tombala/oyun sonu kazananı (koltuk)
  winReason: 'tombala' | 'most' | 'draw' | null;
  /**
   * Bot koltukları (varsa). onTimeout bu koltukların kartını çekilen sayıyla
   * otomatik işaretler. Tombala şu an yalnızca insan-vs-insan oynanır
   * (getBotMove yok), dolayısıyla pratikte boştur; alan, bota karşı moda
   * genişletmeyi ve test simülasyonunu mümkün kılar.
   */
  botSeats: number[];
}

type TombalaMove = { type: 'start' } | { type: 'mark'; number: number };

// ---- Yardımcılar ----

/** [lo, hi] aralığında rastgele tam sayı. */
function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Diziyi yerinde karıştırır (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Sütun c'nin sayı aralığı. col0 -> 1-9, col8 -> 80-90, diğerleri 10'lu. */
function colRange(c: number): [number, number] {
  if (c === 0) return [1, 9];
  if (c === 8) return [80, 90];
  return [c * 10, c * 10 + 9];
}

/**
 * Geçerli bir tombala kartı üretir:
 * - Her satırda tam 5 sayı (4 boş).
 * - Her sütunda 1-3 sayı (toplam 15, sütun başına en az 1).
 * - Sütun içi sayılar yukarıdan aşağı artan sırada.
 */
export function generateCard(): Card {
  // 1) Sütun başına kaç sayı düşeceğini belirle: her sütun >=1, toplam 15.
  // 9 sütun -> taban 1, kalan 6 sayıyı sütunlara dağıt (sütun max 3).
  const colCount = new Array(COLS).fill(1);
  let remaining = 15 - COLS; // 6
  while (remaining > 0) {
    const c = randInt(0, COLS - 1);
    if (colCount[c] < 3) {
      colCount[c]++;
      remaining--;
    }
  }

  // 2) Hücre yerleşimi: her satırda tam 5 olacak şekilde sütunları satırlara ata.
  // rowCount[r] = o satırdaki sayı adedi; hedef her satır 5.
  // Sütunları işleyerek, o sütunun colCount[c] sayısını farklı satırlara koy.
  const present: boolean[][] = Array.from({ length: ROWS }, () =>
    new Array(COLS).fill(false),
  );
  const rowCount = new Array(ROWS).fill(0);

  // Sütunları, kalan kapasiteyi dengeleyecek şekilde işlemek için karıştır.
  const colOrder = shuffle([...Array(COLS).keys()]);
  for (const c of colOrder) {
    // Bu sütun için colCount[c] satır seç; satırın kapasitesi kalan olmalı.
    const rows = shuffle([0, 1, 2]).sort((a, b) => {
      // Daha az dolu (daha çok yer kalan) satırlar önce gelsin.
      const capA = 5 - rowCount[a];
      const capB = 5 - rowCount[b];
      return capB - capA;
    });
    let placed = 0;
    for (const r of rows) {
      if (placed >= colCount[c]) break;
      if (rowCount[r] < 5) {
        present[r][c] = true;
        rowCount[r]++;
        placed++;
      }
    }
    // Nadiren kapasite sığmazsa (dengesiz dağılım) yeniden üret.
    if (placed < colCount[c]) {
      return generateCard();
    }
  }

  // Güvenlik: her satır tam 5 mi?
  if (rowCount.some((n: number) => n !== 5)) {
    return generateCard();
  }

  // 3) Her sütuna sayılarını yerleştir (artan sırada).
  const card: Card = Array.from({ length: ROWS }, () =>
    new Array<Cell>(COLS).fill(null),
  );
  for (let c = 0; c < COLS; c++) {
    const [lo, hi] = colRange(c);
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    shuffle(pool);
    const need = present.reduce((acc, row) => acc + (row[c] ? 1 : 0), 0);
    const chosen = pool.slice(0, need).sort((a, b) => a - b);
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      if (present[r][c]) {
        card[r][c] = chosen[k++];
      }
    }
  }

  return card;
}

/** Bir koltuğun işaretlediği toplam sayı adedi. */
function markedCount(state: TombalaState, seat: number): number {
  let n = 0;
  const m = state.marked[seat];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (m[r][c]) n++;
    }
  }
  return n;
}

/** Bir satır tamamen işaretli mi? */
function rowComplete(state: TombalaState, seat: number, r: number): boolean {
  const card = state.cards[seat];
  const m = state.marked[seat];
  for (let c = 0; c < COLS; c++) {
    if (card[r][c] !== null && !m[r][c]) return false;
  }
  return true;
}

/** Tamamlanmış satır sayısı. */
function completedRows(state: TombalaState, seat: number): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    if (rowComplete(state, seat, r)) n++;
  }
  return n;
}

/** Kart 15 sayının tamamı işaretli mi? */
function isTombala(state: TombalaState, seat: number): boolean {
  return markedCount(state, seat) === 15;
}

/** Çinko durumunu günceller (ilk/ikinci çinko sahibini kaydeder). */
function updateCinko(state: TombalaState, seat: number): void {
  const rows = completedRows(state, seat);
  state.cinko[seat] = rows;
  if (rows >= 1 && state.firstCinkoSeat === null) {
    state.firstCinkoSeat = seat;
  } else if (
    rows >= 2 &&
    state.secondCinkoSeat === null &&
    state.firstCinkoSeat !== null
  ) {
    state.secondCinkoSeat = seat;
  }
}

/** Bir koltuğun kartında belirli sayının hücresini işaretler (varsa). */
function markNumberOnSeat(
  state: TombalaState,
  seat: number,
  num: number,
): boolean {
  const card = state.cards[seat];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (card[r][c] === num && !state.marked[seat][r][c]) {
        state.marked[seat][r][c] = true;
        return true;
      }
    }
  }
  return false;
}

/** Bir koltuğun kartında çekilmiş ama henüz işaretlenmemiş ilk sayı (bot için). */
function firstUnmarkedDrawn(state: TombalaState, seat: number): number | null {
  const card = state.cards[seat];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = card[r][c];
      if (v !== null && state.drawnSet[v] && !state.marked[seat][r][c]) {
        return v;
      }
    }
  }
  return null;
}

/** Oyunu bir koltuğun tombala'sı ile bitirir. */
function finishWithTombala(state: TombalaState, seat: number): TombalaState {
  return {
    ...state,
    phase: 'over',
    deadlineAt: 0,
    current: state.current,
    winner: seat,
    winReason: 'tombala',
  };
}

/** Tüm sayılar çekildi, tombala olmadan: en çok işaretleyen kazanır. */
function finishByMost(state: TombalaState): TombalaState {
  const m0 = markedCount(state, 0);
  const m1 = markedCount(state, 1);
  let winner: number | null = null;
  let winReason: 'most' | 'draw' = 'draw';
  if (m0 > m1) {
    winner = 0;
    winReason = 'most';
  } else if (m1 > m0) {
    winner = 1;
    winReason = 'most';
  }
  return { ...state, phase: 'over', deadlineAt: 0, winner, winReason };
}

export const tombalaModule: GameModule<TombalaState, TombalaMove> = {
  id: 'tombala',
  name: 'Tombala',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(): TombalaState {
    const cards = [generateCard(), generateCard()];
    const marked = cards.map(() =>
      Array.from({ length: ROWS }, () => new Array(COLS).fill(false)),
    );
    return {
      phase: 'ready',
      cards,
      marked,
      drawn: [],
      drawnSet: new Array(91).fill(false), // index 0 kullanılmaz
      current: null,
      deadlineAt: 0,
      cinko: [0, 0],
      firstCinkoSeat: null,
      secondCinkoSeat: null,
      winner: null,
      winReason: null,
      botSeats: [],
    };
  },

  applyMove(state, move, seat): ApplyMoveResult<TombalaState> {
    const now = Date.now();
    const m = move as TombalaMove;

    // ---- Başlat ----
    if (m.type === 'start') {
      if (state.phase !== 'ready') {
        return { ok: false, error: 'Şu an başlatılamaz.' };
      }
      // İlk sayıyı hemen çek, sonraki çekim için süre kur.
      const first = randInt(1, 90);
      const drawnSet = [...state.drawnSet];
      drawnSet[first] = true;
      let next: TombalaState = {
        ...state,
        phase: 'drawing',
        drawn: [first],
        drawnSet,
        current: first,
        deadlineAt: now + DRAW_MS,
      };
      // Bot koltuklarını otomatik işaretle + çinko/tombala kontrolü.
      next = autoMarkBots(next, first);
      return { ok: true, state: next };
    }

    // ---- İşaretle ----
    if (m.type === 'mark') {
      if (state.phase !== 'drawing') {
        return { ok: false, error: 'Şu an işaretlenemez.' };
      }
      const num = m.number;
      if (typeof num !== 'number' || num < 1 || num > 90) {
        return { ok: false, error: 'Geçersiz sayı.' };
      }
      if (!state.drawnSet[num]) {
        return { ok: false, error: 'Bu sayı henüz çekilmedi.' };
      }
      // Sayı bu koltuğun kartında ve işaretli değil mi?
      const card = state.cards[seat];
      let found = false;
      let already = false;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (card[r][c] === num) {
            found = true;
            if (state.marked[seat][r][c]) already = true;
          }
        }
      }
      if (!found) return { ok: false, error: 'Bu sayı kartında yok.' };
      if (already) return { ok: false, error: 'Zaten işaretli.' };

      // İşaretle (immutable kopya).
      const marked = state.marked.map((seatM, s) =>
        s === seat ? seatM.map((row) => [...row]) : seatM,
      );
      const cardSeat = state.cards[seat];
      outer: for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (cardSeat[r][c] === num) {
            marked[seat][r][c] = true;
            break outer;
          }
        }
      }

      let next: TombalaState = {
        ...state,
        marked,
        cinko: [...state.cinko],
      };
      updateCinko(next, seat);
      if (isTombala(next, seat)) {
        return { ok: true, state: finishWithTombala(next, seat) };
      }
      return { ok: true, state: next };
    }

    return { ok: false, error: 'Geçersiz hamle.' };
  },

  onTimeout(state): ApplyMoveResult<TombalaState> {
    const now = Date.now();
    if (state.phase !== 'drawing') return { ok: false };

    // Kalan sayılardan birini çek.
    const remaining: number[] = [];
    for (let n = 1; n <= 90; n++) {
      if (!state.drawnSet[n]) remaining.push(n);
    }
    if (remaining.length === 0) {
      // Tüm sayılar çekildi, kimsede tombala yok -> en çok işaretleyen kazanır.
      return { ok: true, state: finishByMost(state) };
    }

    const num = remaining[Math.floor(Math.random() * remaining.length)];
    const drawnSet = [...state.drawnSet];
    drawnSet[num] = true;
    let next: TombalaState = {
      ...state,
      drawn: [...state.drawn, num],
      drawnSet,
      current: num,
      deadlineAt: now + DRAW_MS,
    };

    // Bot koltuklarını otomatik işaretle + çinko/tombala kontrolü.
    next = autoMarkBots(next, num);
    if (next.phase === 'over') return { ok: true, state: next };

    // Son sayı da çekildiyse ve hâlâ devam ediyorsa, bir sonraki onTimeout
    // çekecek sayı bulamayıp en çok işaretleyene göre bitirir. deadlineAt
    // yine kurulu kalır ki çekirdek timer'ı tetiklesin.
    return { ok: true, state: next };
  },

  getDeadline(state): number | null {
    return state.phase === 'drawing' ? state.deadlineAt : null;
  },

  getStatus(state): GameStatus {
    if (state.phase !== 'over') return { over: false };
    if (state.winReason === 'draw' || state.winner === null) {
      return { over: true, result: 'draw', reason: 'Beraberlik' };
    }
    const result = state.winner === 0 ? 'p0' : 'p1';
    const reason =
      state.winReason === 'tombala'
        ? 'Tombala! 🎉'
        : 'En çok işaretleyen kazandı';
    return { over: true, result, reason };
  },

  // Çekim sırasında, kartında çekilmiş ama işaretlenmemiş sayısı olan koltuklar
  // "hareket bekliyor" sayılır. Çekirdek bunu yalnızca BOT koltuklarına süzer
  // (botSeatToMove), böylece bot kartını getBotMove ile işaretler.
  pendingSeats(state): number[] {
    if (state.phase !== 'drawing') return [];
    return [0, 1].filter((s) => firstUnmarkedDrawn(state, s) !== null);
  },

  // Bot, kartındaki çekilmiş-işaretlenmemiş ilk sayıyı işaretler (kusursuz).
  getBotMove(state, seat): TombalaMove | null {
    if (state.phase !== 'drawing') return null;
    const num = firstUnmarkedDrawn(state, seat);
    return num === null ? null : { type: 'mark', number: num };
  },

  getBotDelayMs(): number {
    return 400 + Math.floor(Math.random() * 600); // 0.4–1.0 sn
  },

  viewFor(state, seat: Seat): unknown {
    const opponentView = (s: number) => ({
      markedCount: markedCount(state, s),
      cinko: state.cinko[s] >= 1,
      cinkoRows: state.cinko[s],
      tombala: isTombala(state, s),
    });

    // İzleyici (seat null): her iki kartı da göster (gizli bilgi yok).
    if (seat === null) {
      return {
        phase: state.phase,
        spectator: true,
        cards: state.cards,
        marked: state.marked,
        drawn: state.drawn,
        drawnSet: state.drawnSet,
        current: state.current,
        deadlineAt: state.deadlineAt,
        progress: [opponentView(0), opponentView(1)],
        winner: state.winner,
        winReason: state.winReason,
        firstCinkoSeat: state.firstCinkoSeat,
        secondCinkoSeat: state.secondCinkoSeat,
      };
    }

    const opp = seat === 0 ? 1 : 0;
    return {
      phase: state.phase,
      yourSeat: seat,
      card: state.cards[seat],
      marked: state.marked[seat],
      myCinko: state.cinko[seat],
      myTombala: isTombala(state, seat),
      drawn: state.drawn,
      drawnSet: state.drawnSet,
      current: state.current,
      deadlineAt: state.deadlineAt,
      opponent: opponentView(opp),
      winner: state.winner,
      winReason: state.winReason,
      firstCinkoSeat: state.firstCinkoSeat,
      secondCinkoSeat: state.secondCinkoSeat,
    };
  },
};

/**
 * Çekilen sayıyı tüm BOT koltuklarının (state.botSeats) kartında otomatik
 * işaretler ve çinko/tombala kontrolü yapar. Bir bot tombala yaparsa oyunu
 * bitirir.
 */
function autoMarkBots(state: TombalaState, num: number): TombalaState {
  const botSeats = state.botSeats ?? [];
  if (botSeats.length === 0) return state;

  const marked = state.marked.map((seatM) => seatM.map((row) => [...row]));
  const working: TombalaState = {
    ...state,
    marked,
    cinko: [...state.cinko],
  };

  for (const s of botSeats) {
    markNumberOnSeat(working, s, num);
    updateCinko(working, s);
    if (isTombala(working, s)) {
      return finishWithTombala(working, s);
    }
  }
  return working;
}
