import { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../registry';
import { quizSounds } from './sounds';

interface QuizView {
  phase: 'loading' | 'ready' | 'question' | 'reveal' | 'over';
  category: string;
  kids: boolean;
  index: number;
  total: number;
  scores: number[];
  deadlineAt: number;
  question?: { text: string; options: string[] };
  answered: boolean[];
  yourAnswer: number | null;
  answers: (number | null)[];
  correctIndex?: number;
  explanation?: string;
}

const QUESTION_MS = 15000;

function TimerBar({ deadlineAt }: { deadlineAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, deadlineAt - now);
  const pct = Math.max(0, Math.min(100, (remaining / QUESTION_MS) * 100));
  const sec = Math.ceil(remaining / 1000);
  return (
    <div className="timer">
      <div className="timer-fill" style={{ width: `${pct}%` }} />
      <span className="timer-text">{sec}s</span>
    </div>
  );
}

export default function QuizGame({ snapshot, sendMove }: GameComponentProps) {
  const view = snapshot.state as QuizView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;

  // Reveal'da doğru/yanlış sesi (her soru için bir kez).
  const lastRevealed = useRef(-1);
  useEffect(() => {
    if (view.phase === 'reveal' && lastRevealed.current !== view.index) {
      lastRevealed.current = view.index;
      if (isPlayer && view.yourAnswer != null) {
        if (view.yourAnswer === view.correctIndex) quizSounds.correct();
        else quizSounds.wrong();
      }
    }
    if (view.phase === 'over' && lastRevealed.current !== 999) {
      lastRevealed.current = 999;
      quizSounds.end();
    }
  }, [view.phase, view.index]);

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

  // ---- Yükleniyor ----
  if (view.phase === 'loading') {
    return (
      <div className="quiz center-col">
        <p className="quiz-cat">{view.category}</p>
        <p className="muted">Sorular hazırlanıyor… 🤔</p>
      </div>
    );
  }

  // ---- Başlama ekranı ----
  if (view.phase === 'ready') {
    const ready = players.length >= 2;
    return (
      <div className="quiz center-col">
        <p className="quiz-cat">
          {view.kids ? '🧒 ' : ''}
          {view.category}
        </p>
        <p className="muted">{view.total} soru • doğru + hızlı = çok puan</p>
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
      <div className="quiz center-col">
        <h2>Yarışma bitti 🏁</h2>
        {scoreboard}
      </div>
    );
  }

  // ---- Soru / Reveal ----
  const q = view.question;
  const reveal = view.phase === 'reveal';
  const opponentSeat = yourSeat === 0 ? 1 : 0;

  function pick(i: number) {
    if (!isPlayer || reveal) return;
    if (view.yourAnswer != null) return;
    sendMove({ answerIndex: i });
  }

  function optionClass(i: number): string {
    const cls = ['quiz-opt'];
    if (reveal) {
      if (i === view.correctIndex) cls.push('correct');
      else if (view.answers[yourSeat ?? -1] === i) cls.push('wrong');
    } else if (view.yourAnswer === i) {
      cls.push('selected');
    }
    return cls.join(' ');
  }

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span className="quiz-cat-sm">
          {view.kids ? '🧒 ' : ''}
          {view.category}
        </span>
        <span className="quiz-progress">
          Soru {view.index + 1}/{view.total}
        </span>
      </div>
      {scoreboard}
      {!reveal && <TimerBar deadlineAt={view.deadlineAt} />}

      <div className="quiz-q">{q?.text}</div>

      <div className="quiz-opts">
        {q?.options.map((opt, i) => (
          <button
            key={i}
            className={optionClass(i)}
            onClick={() => pick(i)}
            disabled={reveal || !isPlayer || view.yourAnswer != null}
          >
            <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span>
            <span>{opt}</span>
            {reveal && view.answers[opponentSeat] === i && (
              <span className="opp-badge">rakip</span>
            )}
          </button>
        ))}
      </div>

      {!reveal && view.yourAnswer != null && (
        <p className="muted center">Cevabın alındı ✓ Rakip bekleniyor…</p>
      )}
      {!reveal && isPlayer && view.answered[opponentSeat] && (
        <p className="muted center">Rakip cevapladı ✓</p>
      )}

      {reveal && view.explanation && (
        <p className="quiz-explain">💡 {view.explanation}</p>
      )}
    </div>
  );
}
