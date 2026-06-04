import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { RoomSnapshot } from '@oyun/shared';
import { sounds } from './sounds';

export type Promo = 'q' | 'r' | 'b' | 'n';
export type TargetKind = 'move' | 'capture';

interface ChessState {
  fen: string;
  history: string[];
  lastMove?: { from: string; to: string };
}

function pieceCount(fen: string): number {
  let n = 0;
  for (const ch of fen.split(' ')[0]) if (/[a-zA-Z]/.test(ch)) n++;
  return n;
}

/**
 * Satrancın tüm etkileşim/ses mantığı burada; 2D ve 3D tahtalar bu hook'u
 * paylaşır, sadece çizim farklıdır.
 */
export function useChessGame(
  snapshot: RoomSnapshot,
  sendMove: (payload: unknown) => void,
) {
  const state = snapshot.state as ChessState;

  // Optimistik gösterim.
  const [fen, setFen] = useState(state.fen);

  // Otoriter durum değişince ses çal (kendi + rakip + bot hamlesi).
  const prevFen = useRef(state.fen);
  useEffect(() => {
    const prev = prevFen.current;
    const next = state.fen;
    if (prev !== next) {
      if (new Chess(next).inCheck()) sounds.check();
      else if (pieceCount(next) < pieceCount(prev)) sounds.capture();
      else sounds.move();
      prevFen.current = next;
    }
    setFen(next);
  }, [state.fen]);

  const endPlayed = useRef(false);
  useEffect(() => {
    if (snapshot.status.over && !endPlayed.current) {
      endPlayed.current = true;
      sounds.end();
    }
    if (!snapshot.status.over) endPlayed.current = false;
  }, [snapshot.status.over]);

  const game = useMemo(() => new Chess(fen), [fen]);
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const yourColor: 'w' | 'b' = yourSeat === 1 ? 'b' : 'w';
  const orientation: 'white' | 'black' = yourSeat === 1 ? 'black' : 'white';
  const turn = game.turn();
  const over = snapshot.status.over;
  const yourTurn = isPlayer && !over && turn === yourColor;

  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  useEffect(() => {
    if (!yourTurn) setSelected(null);
  }, [yourTurn, fen]);

  const targets = useMemo(() => {
    const m = new Map<string, TargetKind>();
    if (!selected) return m;
    const moves = game.moves({ square: selected, verbose: true }) as Array<{
      to: Square;
    }>;
    for (const mv of moves) {
      const t = game.get(mv.to);
      m.set(mv.to, t && t.color !== yourColor ? 'capture' : 'move');
    }
    return m;
  }, [selected, game, yourColor]);

  const checkSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    for (const row of game.board())
      for (const sq of row)
        if (sq && sq.type === 'k' && sq.color === turn) return sq.square;
    return null;
  }, [game, turn]);

  function legal(from: Square, to: Square): boolean {
    const moves = game.moves({ square: from, verbose: true }) as Array<{
      to: Square;
    }>;
    return moves.some((m) => m.to === to);
  }
  function isPromotion(from: Square, to: Square): boolean {
    const p = game.get(from);
    if (!p || p.type !== 'p') return false;
    const r = to[1];
    return (p.color === 'w' && r === '8') || (p.color === 'b' && r === '1');
  }
  function tryMove(from: Square, to: Square, promotion?: Promo): boolean {
    const probe = new Chess(fen);
    try {
      const res = probe.move({ from, to, promotion: promotion ?? 'q' });
      if (!res) return false;
      setFen(probe.fen());
      sendMove({ from, to, ...(promotion ? { promotion } : {}) });
      setSelected(null);
      return true;
    } catch {
      return false;
    }
  }
  function attemptMove(from: Square, to: Square): boolean {
    if (!legal(from, to)) return false;
    if (isPromotion(from, to)) {
      setPendingPromo({ from, to });
      setSelected(null);
      return true;
    }
    return tryMove(from, to);
  }

  function selectSquare(sq: Square) {
    if (!yourTurn) return;
    const p = game.get(sq);
    if (p && p.color === yourColor) setSelected(sq);
  }
  function handleSquareClick(sq: Square) {
    if (!yourTurn) return;
    if (selected) {
      if (sq === selected) {
        setSelected(null);
        return;
      }
      const p = game.get(sq);
      if (p && p.color === yourColor) {
        setSelected(sq);
        return;
      }
      if (!attemptMove(selected, sq)) setSelected(null);
      return;
    }
    const p = game.get(sq);
    if (p && p.color === yourColor) setSelected(sq);
  }
  function tryDrop(from: Square, to: Square): boolean {
    if (!yourTurn) return false;
    return attemptMove(from, to);
  }
  function choosePromo(p: Promo) {
    if (!pendingPromo) return;
    tryMove(pendingPromo.from, pendingPromo.to, p);
    setPendingPromo(null);
  }
  function cancelPromo() {
    setPendingPromo(null);
  }

  return {
    fen,
    game,
    isPlayer,
    yourColor,
    orientation,
    yourTurn,
    over,
    selected,
    targets,
    checkSquare,
    lastMove: state.lastMove,
    selectSquare,
    handleSquareClick,
    tryDrop,
    pendingPromo,
    choosePromo,
    cancelPromo,
  };
}

export type ChessGameApi = ReturnType<typeof useChessGame>;
