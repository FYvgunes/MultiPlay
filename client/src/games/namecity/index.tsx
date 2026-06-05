import { useEffect, useState } from 'react';
import type { GameComponentProps } from '../registry';

interface NameCityView {
  phase: 'ready' | 'round' | 'reveal' | 'over';
  round: number;
  total: number;
  letter: string;
  categories: string[];
  scores: number[];
  deadlineAt: number;
  submitted: boolean[];
  yourSubmitted: boolean;
  answers: Record<number, Record<string, string>>;
  roundScores: Record<number, Record<string, number>>;
}

const ROUND_MS = 60000;

function TimerBar({ deadlineAt }: { deadlineAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, deadlineAt - now);
  const pct = Math.max(0, Math.min(100, (remaining / ROUND_MS) * 100));
  const sec = Math.ceil(remaining / 1000);
  return (
    <div className="timer">
      <div className="timer-fill" style={{ width: `${pct}%` }} />
      <span className="timer-text">{sec}s</span>
    </div>
  );
}

export default function NameCityGame({ snapshot, sendMove }: GameComponentProps) {
  const view = snapshot.state as NameCityView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;

  function nameFor(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Oyuncu ${seat + 1}`;
  }

  const scoreboard = (
    <div className="scoreboard">
      {[0, 1].map((s) => (
        <span key={s} className={`score ${s === yourSeat ? 'me' : ''}`}>
          {nameFor(s)}: <b>{view.scores[s] ?? 0}</b>
        </span>
      ))}
    </div>
  );

  // ---- Başlama ekranı ----
  if (view.phase === 'ready') {
    const ready = players.length >= 2;
    return (
      <div className="namecity nc-center center-col">
        <h2 className="nc-title">İsim-Şehir</h2>
        <p className="muted">Harf gelince 5 kategoriyi doldur</p>
        {scoreboard}
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
      </div>
    );
  }

  // ---- Oyun bitti ----
  if (view.phase === 'over') {
    return (
      <div className="namecity nc-center center-col">
        <h2 className="nc-title">Oyun bitti 🏁</h2>
        {scoreboard}
      </div>
    );
  }

  // ---- Reveal: iki oyuncunun cevap karşılaştırma tablosu ----
  if (view.phase === 'reveal') {
    const oppSeat = yourSeat === 0 ? 1 : 0;
    const leftSeat = isPlayer ? (yourSeat as number) : 0;
    const rightSeat = isPlayer ? oppSeat : 1;
    return (
      <div className="namecity">
        <div className="nc-top">
          <span className="nc-letter-badge nc-letter-sm">{view.letter}</span>
          <span className="nc-progress">
            Tur {view.round + 1}/{view.total}
          </span>
        </div>
        {scoreboard}
        <table className="nc-reveal">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>{nameFor(leftSeat)}</th>
              <th>{nameFor(rightSeat)}</th>
            </tr>
          </thead>
          <tbody>
            {view.categories.map((cat) => {
              const lAns = view.answers[leftSeat]?.[cat] ?? '';
              const rAns = view.answers[rightSeat]?.[cat] ?? '';
              const lPts = view.roundScores[leftSeat]?.[cat] ?? 0;
              const rPts = view.roundScores[rightSeat]?.[cat] ?? 0;
              return (
                <tr key={cat}>
                  <td className="nc-cat">{cat}</td>
                  <td>
                    <span className="nc-ans">{lAns || '—'}</span>
                    <span className={`nc-pts pts-${lPts}`}>+{lPts}</span>
                  </td>
                  <td>
                    <span className="nc-ans">{rAns || '—'}</span>
                    <span className={`nc-pts pts-${rPts}`}>+{rPts}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Round: harf + zamanlayıcı + 5 input ----
  const oppSeat = yourSeat === 0 ? 1 : 0;
  const myAnswers = isPlayer ? view.answers[yourSeat as number] ?? {} : {};
  const locked = view.yourSubmitted || !isPlayer;
  const oppSubmitted = isPlayer && view.submitted[oppSeat];

  function onFill(category: string, value: string) {
    if (locked) return;
    sendMove({ type: 'fill', category, value });
  }

  return (
    <div className="namecity">
      <div className="nc-top">
        <span className="nc-progress">
          Tur {view.round + 1}/{view.total}
        </span>
      </div>
      <div className="nc-letter-wrap">
        <span className="nc-letter-badge">{view.letter}</span>
      </div>
      {scoreboard}
      <TimerBar deadlineAt={view.deadlineAt} />

      <div className="nc-fields">
        {view.categories.map((cat) => (
          <label key={cat} className="nc-field">
            <span className="nc-field-label">{cat}</span>
            <input
              type="text"
              className="nc-input"
              value={myAnswers[cat] ?? ''}
              disabled={locked}
              placeholder={`${view.letter} ile başlayan…`}
              onChange={(e) => onFill(cat, e.target.value)}
            />
          </label>
        ))}
      </div>

      {isPlayer && !view.yourSubmitted && (
        <button
          className="btn nc-submit"
          onClick={() => sendMove({ type: 'submit' })}
        >
          Bitti ✓
        </button>
      )}

      {view.yourSubmitted && (
        <p className="muted nc-center">Cevapların alındı, rakip bekleniyor…</p>
      )}
      {oppSubmitted && <p className="muted nc-center">Rakip bitirdi ✓</p>}
    </div>
  );
}
