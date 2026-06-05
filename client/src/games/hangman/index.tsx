import type { GameComponentProps } from '../registry';

// viewFor'dan gelen görünüm (sunucu: server/src/games/hangman.ts)
interface HangmanView {
  category: string;
  masked: string; // açık harfler + '_' + ' '
  guessed: string[];
  wrong: number;
  maxWrong: number;
  turn: 0 | 1;
  scores: number[];
  over: boolean;
  won: boolean;
  word?: string;
}

// Türkçe alfabe klavyesi (29 harf).
const ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z',
];

export default function HangmanGame({ snapshot, sendMove }: GameComponentProps) {
  const view = snapshot.state as HangmanView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;

  function nameFor(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Oyuncu ${seat + 1}`;
  }

  const myTurn = isPlayer && !view.over && view.turn === yourSeat;
  const lives = Math.max(0, view.maxWrong - view.wrong);

  // Açıkça gösterilen harfler (masked içinde görünenler) -> "doğru" sayılır.
  const revealedSet = new Set(view.masked.split('').filter((c) => c !== '_' && c !== ' '));

  function keyClass(letter: string): string {
    const cls = ['hm-key'];
    if (view.guessed.includes(letter)) {
      cls.push('hm-key-used');
      cls.push(revealedSet.has(letter) ? 'hm-key-hit' : 'hm-key-miss');
    }
    return cls.join(' ');
  }

  function pick(letter: string) {
    if (!myTurn) return;
    if (view.guessed.includes(letter)) return;
    sendMove({ letter });
  }

  const scoreboard = (
    <div className="scoreboard hm-scoreboard">
      {[0, 1].map((s) => (
        <span key={s} className={`score ${s === yourSeat ? 'me' : ''}`}>
          {nameFor(s)}: <b>{view.scores[s] ?? 0}</b>
        </span>
      ))}
    </div>
  );

  const hearts = '❤️'.repeat(lives) + '🖤'.repeat(view.wrong);

  return (
    <div className="hm">
      <div className="hm-top">
        <span className="hm-cat">{view.category}</span>
        <span className="hm-lives" title={`Kalan can: ${lives}`}>
          {lives === 0 ? '💀' : hearts} <small>Kalan can: {lives}</small>
        </span>
      </div>

      {scoreboard}

      <div className="hm-word">
        {view.masked.split('').map((ch, i) =>
          ch === ' ' ? (
            <span key={i} className="hm-space" />
          ) : (
            <span key={i} className={`hm-tile ${ch === '_' ? 'hm-tile-empty' : 'hm-tile-filled'}`}>
              {ch === '_' ? '' : ch}
            </span>
          ),
        )}
      </div>

      {!view.over && (
        <p className="hm-turn">
          {myTurn ? (
            <b>Sıra sende! Bir harf seç.</b>
          ) : isPlayer ? (
            <span className="muted">Sıra {nameFor(view.turn)} oyuncusunda…</span>
          ) : (
            <span className="muted">Sıra: {nameFor(view.turn)}</span>
          )}
        </p>
      )}

      {view.over && (
        <div className="hm-result center-col">
          <h2>{view.won ? '🎉 Kelime bulundu!' : '💀 Adam asıldı!'}</h2>
          <p className="hm-answer">
            Kelime: <b>{view.word}</b>
          </p>
        </div>
      )}

      <div className="hm-keyboard">
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            className={keyClass(letter)}
            onClick={() => pick(letter)}
            disabled={!myTurn || view.guessed.includes(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
