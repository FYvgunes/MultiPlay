import { useEffect, useRef } from 'react';
import type { GameComponentProps } from '../registry';
import { sounds } from '../chess/sounds';

/** Sunucudan gelen XOX durumu (tam state, viewFor yok). */
interface TicTacToeView {
  board: ('X' | 'O' | null)[];
  turn: 0 | 1;
  winner: 'X' | 'O' | 'draw' | null;
  line: number[] | null;
}

/** Koltuk -> işaret. Koltuk 0 = X, koltuk 1 = O. */
const SEAT_MARK = ['X', 'O'] as const;

export default function TicTacToeGame({
  snapshot,
  sendMove,
}: GameComponentProps) {
  const view = snapshot.state as TicTacToeView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;
  const yourMark = isPlayer ? SEAT_MARK[yourSeat as 0 | 1] : null;
  const myTurn = isPlayer && !view.winner && view.turn === yourSeat;

  // Hamle/bitiş sesi: dolu hücre sayısı değişince çal.
  const lastCount = useRef(view.board.filter((c) => c !== null).length);
  useEffect(() => {
    const count = view.board.filter((c) => c !== null).length;
    if (count !== lastCount.current) {
      lastCount.current = count;
      if (view.winner) sounds.end();
      else sounds.move();
    }
  }, [view.board, view.winner]);

  function nameFor(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Oyuncu ${seat + 1}`;
  }

  function play(i: number) {
    if (!myTurn) return;
    if (view.board[i] !== null) return;
    sendMove({ index: i });
  }

  // ---- Durum satırı ----
  let status: string;
  if (view.winner === 'draw') {
    status = 'Berabere!';
  } else if (view.winner) {
    const winnerSeat = view.winner === 'X' ? 0 : 1;
    status = `${view.winner} (${nameFor(winnerSeat)}) kazandı! 🎉`;
  } else if (isPlayer) {
    status = myTurn
      ? `Sıra sende (${yourMark})`
      : `Rakibin sırası… (${SEAT_MARK[view.turn]})`;
  } else {
    status = `Sıra: ${SEAT_MARK[view.turn]} (${nameFor(view.turn)})`;
  }

  return (
    <div className="xox center-col">
      <div className="scoreboard">
        {[0, 1].map((s) => (
          <span key={s} className={`score ${s === yourSeat ? 'me' : ''}`}>
            {SEAT_MARK[s as 0 | 1]} · {nameFor(s)}
          </span>
        ))}
      </div>

      <p className="xox-status">{status}</p>

      <div className="xox-board">
        {view.board.map((cell, i) => {
          const cls = ['xox-cell'];
          if (cell === 'X') cls.push('x');
          if (cell === 'O') cls.push('o');
          if (view.line?.includes(i)) cls.push('win');
          const disabled =
            cell !== null || !myTurn || !!view.winner || !isPlayer;
          return (
            <button
              key={i}
              className={cls.join(' ')}
              onClick={() => play(i)}
              disabled={disabled}
              aria-label={`Hücre ${i + 1}${cell ? `: ${cell}` : ''}`}
            >
              {cell === 'X' ? '⨯' : cell === 'O' ? 'O' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
