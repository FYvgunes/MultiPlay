import { lazy, Suspense, useState } from 'react';
import type { GameComponentProps } from '../registry';
import { useChessGame, type Promo } from './useChessGame';
import Board2D from './Board2D';

// 3D ağır (three.js); sadece gerektiğinde yüklensin.
const Board3D = lazy(() => import('./Board3D'));

type View = '2d' | '3d';

const VIEW_KEY = 'oyun.chessView';
function initialView(): View {
  return (localStorage.getItem(VIEW_KEY) as View) || '3d';
}

export default function ChessGame({ snapshot, sendMove }: GameComponentProps) {
  const api = useChessGame(snapshot, sendMove);
  const [view, setView] = useState<View>(initialView);

  function setMode(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* boşver */
    }
  }

  return (
    <div className="chess-game">
      <div className="view-toggle">
        <button
          className={view === '3d' ? 'on' : ''}
          onClick={() => setMode('3d')}
        >
          3D
        </button>
        <button
          className={view === '2d' ? 'on' : ''}
          onClick={() => setMode('2d')}
        >
          2D
        </button>
      </div>

      <div className="board-area">
        {view === '3d' ? (
          <Suspense fallback={<p className="muted">3D yükleniyor…</p>}>
            <Board3D api={api} />
          </Suspense>
        ) : (
          <Board2D api={api} />
        )}
      </div>

      {api.pendingPromo && (
        <div className="promo-overlay" onClick={api.cancelPromo}>
          <div className="promo-box" onClick={(e) => e.stopPropagation()}>
            <p>Terfi seç</p>
            <div className="promo-pieces">
              {(['q', 'r', 'b', 'n'] as Promo[]).map((p) => (
                <button key={p} onClick={() => api.choosePromo(p)}>
                  {pieceGlyph(p, api.yourColor)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pieceGlyph(p: Promo, color: string): string {
  const white: Record<Promo, string> = { q: '♕', r: '♖', b: '♗', n: '♘' };
  const black: Record<Promo, string> = { q: '♛', r: '♜', b: '♝', n: '♞' };
  return color === 'w' ? white[p] : black[p];
}
