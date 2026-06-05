import { useEffect, useState } from 'react';
import type { GameComponentProps } from '../registry';

// ---- Tipler (server viewFor çıktısıyla aynı) ----
type Cell = number | null;
type Card = Cell[][]; // [satır][sütun]

interface OppProgress {
  markedCount: number;
  cinko: boolean;
  cinkoRows: number;
  tombala: boolean;
}

interface TombalaView {
  phase: 'ready' | 'drawing' | 'over';
  spectator?: boolean;
  yourSeat?: number;
  card?: Card;
  marked?: boolean[][];
  myCinko?: number;
  myTombala?: boolean;
  // izleyici alanları
  cards?: Card[];
  markedAll?: boolean[][][];
  drawn: number[];
  drawnSet: boolean[];
  current: number | null;
  deadlineAt: number;
  opponent?: OppProgress;
  progress?: OppProgress[];
  winner: number | null;
  winReason: 'tombala' | 'most' | 'draw' | null;
  firstCinkoSeat: number | null;
  secondCinkoSeat: number | null;
}

const DRAW_MS = 3500;

function TimerBar({ deadlineAt }: { deadlineAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, deadlineAt - now);
  const pct = Math.max(0, Math.min(100, (remaining / DRAW_MS) * 100));
  const sec = Math.ceil(remaining / 1000);
  return (
    <div className="timer">
      <div className="timer-fill" style={{ width: `${pct}%` }} />
      <span className="timer-text">{sec}s sonra</span>
    </div>
  );
}

/** Tek bir kartı 3x9 ızgara olarak çizer. */
function CardGrid({
  card,
  marked,
  drawnSet,
  interactive,
  onMark,
}: {
  card: Card;
  marked: boolean[][];
  drawnSet: boolean[];
  interactive: boolean;
  onMark?: (num: number) => void;
}) {
  return (
    <div className="tb-card">
      {card.map((row, r) =>
        row.map((cell, c) => {
          if (cell === null) {
            return <div key={`${r}-${c}`} className="tb-cell tb-blank" />;
          }
          const isMarked = marked[r]?.[c] === true;
          const isDrawn = drawnSet[cell] === true;
          const clickable = interactive && isDrawn && !isMarked;
          const cls = ['tb-cell'];
          if (isMarked) cls.push('tb-marked');
          else if (clickable) cls.push('tb-clickable');
          return (
            <button
              key={`${r}-${c}`}
              className={cls.join(' ')}
              disabled={!clickable}
              onClick={() => clickable && onMark?.(cell)}
            >
              {cell}
              {isMarked && <span className="tb-tick">✓</span>}
            </button>
          );
        }),
      )}
    </div>
  );
}

/** 1-90 çekilen sayılar ızgarası. */
function DrawnGrid({
  drawnSet,
  current,
}: {
  drawnSet: boolean[];
  current: number | null;
}) {
  const nums: number[] = [];
  for (let n = 1; n <= 90; n++) nums.push(n);
  return (
    <div className="tb-drawn-grid">
      {nums.map((n) => {
        const cls = ['tb-drawn-cell'];
        if (drawnSet[n]) cls.push('tb-drawn-on');
        if (n === current) cls.push('tb-drawn-current');
        return (
          <span key={n} className={cls.join(' ')}>
            {n}
          </span>
        );
      })}
    </div>
  );
}

export default function TombalaGame({ snapshot, sendMove }: GameComponentProps) {
  const view = snapshot.state as TombalaView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;

  function nameFor(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Oyuncu ${seat + 1}`;
  }

  // ---- Başlama ekranı ----
  if (view.phase === 'ready') {
    const ready = players.length >= 2;
    return (
      <div className="tb center-col">
        <div className="tb-logo">🎱</div>
        <h2 className="tb-title">Tombala</h2>
        <p className="muted">
          90 sayı çekilir, kartını işaretle — önce dolduran kazanır!
        </p>
        {ready ? (
          isPlayer ? (
            <button className="btn" onClick={() => sendMove({ type: 'start' })}>
              ▶ Başlat
            </button>
          ) : (
            <p className="muted">Oyuncular başlatabilir…</p>
          )
        ) : (
          <p className="muted">Rakip bekleniyor…</p>
        )}
        {isPlayer && view.card && (
          <div className="tb-card-wrap">
            <p className="muted tb-card-label">Kartın</p>
            <CardGrid
              card={view.card}
              marked={view.marked ?? []}
              drawnSet={view.drawnSet}
              interactive={false}
            />
          </div>
        )}
      </div>
    );
  }

  // ---- Oyun bitti ----
  if (view.phase === 'over') {
    const winner = view.winner;
    let headline = 'Beraberlik 🤝';
    if (winner !== null) {
      const tombala = view.winReason === 'tombala';
      headline = `${nameFor(winner)} kazandı ${tombala ? '🎉 TOMBALA!' : '🏆'}`;
    }
    return (
      <div className="tb center-col">
        <h2 className="tb-title">{headline}</h2>
        {isPlayer && view.card && (
          <div className="tb-card-wrap">
            <p className="muted tb-card-label">
              Kartın — {view.myTombala ? 'TOMBALA' : `${markedTotal(view)}/15`}
            </p>
            <CardGrid
              card={view.card}
              marked={view.marked ?? []}
              drawnSet={view.drawnSet}
              interactive={false}
            />
          </div>
        )}
        {view.opponent && (
          <p className="muted">
            Rakip: {view.opponent.markedCount}/15
            {view.opponent.tombala ? ' • TOMBALA' : ''}
          </p>
        )}
        <DrawnGrid drawnSet={view.drawnSet} current={view.current} />
      </div>
    );
  }

  // ---- Oyun sürüyor (drawing) ----
  const opp = view.opponent;
  const myMarked = markedTotal(view);

  return (
    <div className="tb">
      <div className="tb-current-wrap">
        <span className="muted">Çekilen sayı</span>
        <div className="tb-current" key={view.current ?? 0}>
          {view.current ?? '—'}
        </div>
        <TimerBar deadlineAt={view.deadlineAt} />
      </div>

      <div className="tb-status">
        <span className={`tb-badge ${view.myTombala ? 'tb-badge-win' : ''}`}>
          Sen: {myMarked}/15 ✓
        </span>
        {(view.myCinko ?? 0) >= 1 && (
          <span className="tb-badge tb-badge-cinko">ÇİNKO! 🎉</span>
        )}
        {view.myTombala && (
          <span className="tb-badge tb-badge-win">TOMBALA!</span>
        )}
        {opp && (
          <span className="tb-badge tb-badge-opp">
            Rakip: {opp.markedCount}/15 ✓
            {opp.cinko ? ' • ÇİNKO' : ''}
            {opp.tombala ? ' • TOMBALA' : ''}
          </span>
        )}
      </div>

      {isPlayer && view.card && (
        <div className="tb-card-wrap">
          <CardGrid
            card={view.card}
            marked={view.marked ?? []}
            drawnSet={view.drawnSet}
            interactive={true}
            onMark={(num) => sendMove({ type: 'mark', number: num })}
          />
          <p className="muted tb-hint">
            Çekilen ve kartında olan sayıya dokunarak işaretle.
          </p>
        </div>
      )}

      <DrawnGrid drawnSet={view.drawnSet} current={view.current} />
    </div>
  );
}

/** Görünümdeki kendi kartının işaretli sayısı. */
function markedTotal(view: TombalaView): number {
  if (!view.marked) return 0;
  let n = 0;
  for (const row of view.marked) for (const m of row) if (m) n++;
  return n;
}
