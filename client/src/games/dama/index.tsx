import { useEffect, useMemo, useState } from 'react';
import type { GameComponentProps } from '../registry';

// ---- Türk Daması client tahtası ----
// State sunucudan tam gelir. Etkileşim: taşına dokun -> legal inişler vurgulanır
// -> bir inişe dokun. Çoklu alma zincirinde sıradaki adımlar sorulmaya devam
// eder; başka alma kalmayınca otomatik gönderilir.

interface Cell {
  seat: 0 | 1;
  king: boolean;
}
interface Pos {
  r: number;
  c: number;
}
interface DamaState {
  board: (Cell | null)[][];
  turn: 0 | 1;
  winner: 'p0' | 'p1' | 'draw' | null;
  reason?: string;
  lastPath?: Pos[];
}

const SIZE = 8;

const DIRS: Pos[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

function forwardDir(seat: 0 | 1): number {
  return seat === 0 ? -1 : 1;
}
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
function cloneBoard(b: (Cell | null)[][]): (Cell | null)[][] {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

interface StepInfo {
  to: Pos;
  captured: Pos | null;
}

function manCaptureSteps(
  board: (Cell | null)[][],
  from: Pos,
  seat: 0 | 1,
): StepInfo[] {
  const out: StepInfo[] = [];
  for (const d of manStepDirs(seat)) {
    const mr = from.r + d.r;
    const mc = from.c + d.c;
    const lr = from.r + 2 * d.r;
    const lc = from.c + 2 * d.c;
    if (!inBounds(lr, lc)) continue;
    const mid = board[mr]?.[mc];
    if (mid && mid.seat !== seat && board[lr][lc] === null) {
      out.push({ to: { r: lr, c: lc }, captured: { r: mr, c: mc } });
    }
  }
  return out;
}
function kingCaptureSteps(
  board: (Cell | null)[][],
  from: Pos,
  seat: 0 | 1,
): StepInfo[] {
  const out: StepInfo[] = [];
  for (const d of DIRS) {
    let r = from.r + d.r;
    let c = from.c + d.c;
    while (inBounds(r, c) && board[r][c] === null) {
      r += d.r;
      c += d.c;
    }
    if (!inBounds(r, c)) continue;
    const target = board[r][c];
    if (!target || target.seat === seat) continue;
    const captured: Pos = { r, c };
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
function captureSteps(
  board: (Cell | null)[][],
  from: Pos,
  cell: Cell,
): StepInfo[] {
  return cell.king
    ? kingCaptureSteps(board, from, cell.seat)
    : manCaptureSteps(board, from, cell.seat);
}
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

/** Yapılan tek adımı tahtaya uygula (zincir devamını hesaplamak için). */
function applyStep(
  board: (Cell | null)[][],
  from: Pos,
  step: StepInfo,
  piece: Cell,
): (Cell | null)[][] {
  const nb = cloneBoard(board);
  nb[from.r][from.c] = null;
  if (step.captured) nb[step.captured.r][step.captured.c] = null;
  nb[step.to.r][step.to.c] = { ...piece };
  return nb;
}

/** Bir koltuk için alma var mı (Alma zorunlu! ipucu). */
function sideHasCapture(board: (Cell | null)[][], seat: 0 | 1): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r][c];
      if (cell && cell.seat === seat && captureSteps(board, { r, c }, cell).length)
        return true;
    }
  }
  return false;
}

function eqPos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export default function DamaGame({ snapshot, sendMove }: GameComponentProps) {
  const state = snapshot.state as DamaState;
  const board = state.board;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const over = snapshot.status.over;
  const yourTurn = isPlayer && !over && state.turn === yourSeat;

  // Zincir kurma durumu: seçili kaynak + şu ana kadarki yol + canlı tahta.
  const [path, setPath] = useState<Pos[] | null>(null);

  // Sıra/state değişince seçim sıfırlansın.
  useEffect(() => {
    setPath(null);
  }, [state.turn, yourTurn, snapshot.status.over]);

  // Yön: seat1 ise tahtayı çevir ki kendi tarafı altta olsun.
  const flip = yourSeat === 1;
  const rows = useMemo(() => {
    const idx = [...Array(SIZE).keys()];
    return flip ? idx.reverse() : idx;
  }, [flip]);
  const cols = useMemo(() => {
    const idx = [...Array(SIZE).keys()];
    return flip ? idx.reverse() : idx;
  }, [flip]);

  const seat01 = (yourSeat ?? 0) as 0 | 1;
  const mustCapture = useMemo(
    () => (yourTurn ? sideHasCapture(board, seat01) : false),
    [board, yourTurn, seat01],
  );

  // Aktif (zincir içindeki) taşın canlı konumu ve canlı tahta.
  const liveBoard = useMemo(() => {
    if (!path || path.length < 2) return board;
    // Yolu uygula (görsel canlı tahta).
    let b = cloneBoard(board);
    const piece = board[path[0].r][path[0].c]!;
    let cur = path[0];
    b[cur.r][cur.c] = null;
    for (let i = 1; i < path.length; i++) {
      const to = path[i];
      const dr = Math.sign(to.r - cur.r);
      const dc = Math.sign(to.c - cur.c);
      let r = cur.r + dr;
      let c = cur.c + dc;
      while (r !== to.r || c !== to.c) {
        b[r][c] = null;
        r += dr;
        c += dc;
      }
      cur = to;
    }
    b[cur.r][cur.c] = { ...piece };
    return b;
  }, [board, path]);

  const activePos = path ? path[path.length - 1] : null;

  // Aktif taş için geçerli iniş kareleri (vurgu).
  const targets = useMemo(() => {
    const map = new Map<string, 'move' | 'capture'>();
    if (!yourTurn) return map;
    if (!path) return map;
    const src = path[0];
    const cell = liveBoard[activePos!.r]?.[activePos!.c];
    if (!cell) return map;
    if (path.length === 1) {
      // Sadece kaynak seçili; başlangıç adımları.
      const caps = captureSteps(board, src, cell);
      if (mustCapture) {
        for (const s of caps) map.set(`${s.to.r},${s.to.c}`, 'capture');
      } else {
        const caps0 = captureSteps(board, src, cell);
        for (const s of caps0) map.set(`${s.to.r},${s.to.c}`, 'capture');
        const simples = cell.king
          ? kingSimpleSteps(board, src)
          : manSimpleSteps(board, src, cell.seat);
        for (const t of simples) map.set(`${t.r},${t.c}`, 'move');
      }
    } else {
      // Zincir içindeyiz: sadece almalar geçerli.
      const caps = captureSteps(liveBoard, activePos!, cell);
      for (const s of caps) map.set(`${s.to.r},${s.to.c}`, 'capture');
    }
    return map;
  }, [yourTurn, path, board, liveBoard, activePos, mustCapture]);

  function send(finalPath: Pos[]) {
    sendMove({ path: finalPath });
    setPath(null);
  }

  function onCellClick(r: number, c: number) {
    if (!yourTurn) return;
    const clicked: Pos = { r, c };

    // Henüz seçim yok: kendi taşını seç.
    if (!path) {
      const cell = board[r][c];
      if (cell && cell.seat === yourSeat) {
        // Alma zorunluysa, alma yapamayan taş seçilemez.
        if (mustCapture && captureSteps(board, clicked, cell).length === 0) return;
        setPath([clicked]);
      }
      return;
    }

    // Seçili kaynağa tekrar tıklarsa iptal.
    if (path.length === 1 && eqPos(path[0], clicked)) {
      setPath(null);
      return;
    }
    // Başka kendi taşına tıklarsa (zincir başlamadıysa) seçimi değiştir.
    if (path.length === 1) {
      const cell = board[r][c];
      if (cell && cell.seat === yourSeat && !eqPos(path[0], clicked)) {
        if (mustCapture && captureSteps(board, clicked, cell).length === 0) return;
        setPath([clicked]);
        return;
      }
    }

    const kind = targets.get(`${r},${c}`);
    if (!kind) return; // geçersiz hedef

    const newPath = [...path, clicked];

    if (kind === 'move') {
      // Basit hamle: hemen gönder.
      send(newPath);
      return;
    }

    // Alma: zincir devam edebilir mi?
    const cell = liveBoard[activePos!.r][activePos!.c]!;
    const nb = applyStep(liveBoard, activePos!, { to: clicked, captured: null }, cell);
    // captured'ı doğru hesaplamak için arada taşı temizleyelim: applyStep
    // captured=null aldığı için yolu canlı board mantığıyla yeniden kuralım.
    // Basitçe: liveBoard'dan aradaki taşı kaldırmış canlı board üret.
    const lb2 = cloneBoard(liveBoard);
    {
      const dr = Math.sign(clicked.r - activePos!.r);
      const dc = Math.sign(clicked.c - activePos!.c);
      let rr = activePos!.r + dr;
      let cc = activePos!.c + dc;
      while (rr !== clicked.r || cc !== clicked.c) {
        lb2[rr][cc] = null;
        rr += dr;
        cc += dc;
      }
      lb2[activePos!.r][activePos!.c] = null;
      lb2[clicked.r][clicked.c] = { ...cell };
    }
    void nb;
    const more = captureSteps(lb2, clicked, cell);
    if (more.length > 0) {
      // Zincir devam: yolu uzat, kullanıcıdan sonraki adımı bekle.
      setPath(newPath);
    } else {
      // Zincir bitti: gönder.
      send(newPath);
    }
  }

  const players = snapshot.players;
  const nameFor = (seat: 0 | 1) =>
    players.find((p) => p.seat === seat)?.name ?? (seat === 0 ? 'Açık' : 'Koyu');

  const turnText = over
    ? statusText(snapshot.status, players)
    : state.turn === yourSeat
      ? 'Sıra sizde'
      : `Sıra: ${nameFor(state.turn)}`;

  const lastSet = new Set(
    (state.lastPath ?? []).map((p) => `${p.r},${p.c}`),
  );

  return (
    <div className="dm-game center-col">
      <div className="dm-scoreboard scoreboard">
        <div className={`score dm-score ${state.turn === 0 && !over ? 'on' : ''}`}>
          <span className="dm-chip dm-chip-light" />
          {nameFor(0)}
        </div>
        <div className={`score dm-score ${state.turn === 1 && !over ? 'on' : ''}`}>
          <span className="dm-chip dm-chip-dark" />
          {nameFor(1)}
        </div>
      </div>

      <div className="dm-status">
        {turnText}
        {mustCapture && !over && <span className="dm-must"> · Alma zorunlu!</span>}
      </div>

      <div className="dm-board">
        {rows.map((r) => (
          <div className="dm-row" key={r}>
            {cols.map((c) => {
              const cell = liveBoard[r][c];
              const key = `${r},${c}`;
              const t = targets.get(key);
              const isSel = !!path && eqPos(path[0], { r, c });
              const isActive = !!activePos && eqPos(activePos, { r, c });
              const dark = (r + c) % 2 === 1;
              const cls = [
                'dm-cell',
                dark ? 'dm-dark' : 'dm-light',
                lastSet.has(key) ? 'dm-last' : '',
                t === 'move' ? 'dm-hint' : '',
                t === 'capture' ? 'dm-cap-hint' : '',
                isSel || isActive ? 'dm-sel' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  className={cls}
                  key={c}
                  onClick={() => onCellClick(r, c)}
                >
                  {cell && (
                    <div
                      className={`dm-piece ${cell.seat === 0 ? 'dm-p-light' : 'dm-p-dark'} ${cell.king ? 'dm-king' : ''}`}
                    >
                      {cell.king && <span className="dm-crown">♛</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!isPlayer && <p className="muted dm-spectate">İzleyici modu</p>}
    </div>
  );
}

function statusText(
  status: { result?: string; reason?: string },
  players: { seat: number | null; name: string }[],
): string {
  if (status.result === 'draw') return `Berabere · ${status.reason ?? ''}`;
  const seat = status.result === 'p0' ? 0 : 1;
  const name = players.find((p) => p.seat === seat)?.name ?? (seat === 0 ? 'Açık' : 'Koyu');
  return `${name} kazandı · ${status.reason ?? ''}`;
}
