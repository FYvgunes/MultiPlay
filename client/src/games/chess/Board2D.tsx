import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { woodPieces } from './woodPieces';
import type { ChessGameApi } from './useChessGame';

function useBoardWidth() {
  const [w, setW] = useState(() =>
    Math.min(typeof window !== 'undefined' ? window.innerWidth - 24 : 360, 520),
  );
  useEffect(() => {
    const onResize = () => setW(Math.min(window.innerWidth - 24, 520));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

export default function Board2D({ api }: { api: ChessGameApi }) {
  const boardWidth = useBoardWidth();

  const styles: Record<string, React.CSSProperties> = {};
  if (api.lastMove) {
    styles[api.lastMove.from] = { background: 'rgba(255,213,79,0.4)' };
    styles[api.lastMove.to] = { background: 'rgba(255,213,79,0.45)' };
  }
  if (api.checkSquare)
    styles[api.checkSquare] = { background: 'rgba(229,57,53,0.55)' };
  if (api.selected) styles[api.selected] = { background: 'rgba(255,213,79,0.5)' };
  for (const [sq, kind] of api.targets) {
    styles[sq] =
      kind === 'capture'
        ? {
            background:
              'radial-gradient(circle, transparent 54%, rgba(229,57,53,0.55) 55%)',
            borderRadius: '50%',
          }
        : {
            background:
              'radial-gradient(circle, rgba(27,27,47,0.45) 24%, transparent 26%)',
          };
  }

  return (
    <Chessboard
      position={api.fen}
      onPieceDrop={(s, t) => api.tryDrop(s as Square, t as Square)}
      onPieceDragBegin={(_p, s) => api.selectSquare(s as Square)}
      onSquareClick={(s) => api.handleSquareClick(s as Square)}
      boardOrientation={api.orientation}
      boardWidth={boardWidth}
      arePiecesDraggable={api.yourTurn}
      isDraggablePiece={({ piece }) =>
        api.isPlayer && piece[0] === api.yourColor
      }
      customSquareStyles={styles}
      customPieces={woodPieces}
      animationDuration={200}
      customBoardStyle={{
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 0 6px #3b2616',
      }}
      customDarkSquareStyle={{
        backgroundColor: '#9c6b3c',
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12))',
      }}
      customLightSquareStyle={{
        backgroundColor: '#e9c99b',
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,0,0,0.05))',
      }}
    />
  );
}
