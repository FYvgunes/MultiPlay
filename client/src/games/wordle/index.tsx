import { useEffect, useState } from 'react';
import type { GameComponentProps } from '../registry';

type Mark = 'hit' | 'present' | 'miss';

interface WordleRow {
  word: string;
  marks: Mark[];
}

interface OppView {
  guessCount: number;
  solved: boolean;
  done: boolean;
}

interface WordleView {
  spectator: boolean;
  maxRows: number;
  wordLen: number;
  over: boolean;
  rows?: WordleRow[];
  solved?: boolean;
  done?: boolean;
  pending?: boolean;
  opponent?: OppView;
  answer?: string;
  // izleyici alanı
  seats?: { guessCount: number; solved: boolean; done: boolean }[];
}

const KEYBOARD: string[][] = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
];

/** Bir harfin en iyi (bilinen) işareti: hit > present > miss. */
function bestMarks(rows: WordleRow[]): Record<string, Mark> {
  const rank: Record<Mark, number> = { miss: 0, present: 1, hit: 2 };
  const out: Record<string, Mark> = {};
  for (const r of rows) {
    const ls = [...r.word];
    for (let i = 0; i < ls.length; i++) {
      const c = ls[i];
      const m = r.marks[i];
      if (!out[c] || rank[m] > rank[out[c]]) out[c] = m;
    }
  }
  return out;
}

export default function WordleGame({ snapshot, sendMove }: GameComponentProps) {
  const view = snapshot.state as WordleView;
  const yourSeat = snapshot.yourSeat;
  const isPlayer = yourSeat === 0 || yourSeat === 1;
  const players = snapshot.players;

  const WORD_LEN = view.wordLen ?? 5;
  const MAX_ROWS = view.maxRows ?? 6;

  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');

  const myRows = view.rows ?? [];
  const canType =
    isPlayer && !view.over && view.pending === true && (view.done ?? false) === false;

  // Sunucudan yeni satır gelince ya da bittiğinde yazımı temizle.
  useEffect(() => {
    setGuess('');
  }, [myRows.length, view.over, view.done]);

  // Hata mesajını kısa süre sonra temizle.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 2200);
    return () => clearTimeout(id);
  }, [error]);

  function nameFor(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Oyuncu ${seat + 1}`;
  }

  function press(letter: string) {
    if (!canType) return;
    setError('');
    setGuess((g) => ([...g].length >= WORD_LEN ? g : g + letter));
  }
  function backspace() {
    if (!canType) return;
    setGuess((g) => [...g].slice(0, -1).join(''));
  }
  function submit() {
    if (!canType) return;
    if ([...guess].length !== WORD_LEN) {
      setError(`${WORD_LEN} harfli bir kelime gir.`);
      return;
    }
    sendMove({ guess });
    setError('');
    setGuess(''); // sunucu doğrulamasına güven; hata gelirse errorMsg gösterilir.
  }

  // Fiziksel klavye desteği.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!canType) return;
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key.length === 1) {
        const up = e.key.toLocaleUpperCase('tr-TR');
        const flat = KEYBOARD.flat();
        if (flat.includes(up)) press(up);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keyMarks = bestMarks(myRows);
  const opp = view.opponent;
  const oppSeat = yourSeat === 0 ? 1 : 0;

  // Skor tablosu (tahmin sayıları).
  const scoreboard = (
    <div className="scoreboard">
      {[0, 1].map((s) => {
        const count =
          s === yourSeat
            ? myRows.length
            : view.spectator
              ? (view.seats?.[s]?.guessCount ?? 0)
              : (opp?.guessCount ?? 0);
        const solved =
          s === yourSeat
            ? (view.solved ?? false)
            : view.spectator
              ? (view.seats?.[s]?.solved ?? false)
              : (opp?.solved ?? false);
        return (
          <span key={s} className={`score ${s === yourSeat ? 'me' : ''}`}>
            {nameFor(s)}: <b>{count}/{MAX_ROWS}</b>
            {solved ? ' ✓' : ''}
          </span>
        );
      })}
    </div>
  );

  // İzleyici görünümü: harf yok.
  if (view.spectator) {
    return (
      <div className="wd center-col">
        <h3>Wordle</h3>
        {scoreboard}
        {view.over && view.answer && (
          <p className="muted">Kelime: <b>{view.answer}</b></p>
        )}
        <p className="muted">İzleyici modu — harfler gizli.</p>
      </div>
    );
  }

  // Oyuncu grid'i: dolu satırlar + (varsa) yazım satırı + boş satırlar.
  const typingRowIndex = canType ? myRows.length : -1;
  const rowsToRender = [];
  for (let r = 0; r < MAX_ROWS; r++) {
    const tiles = [];
    const filledRow = myRows[r];
    const isTyping = r === typingRowIndex;
    const typedLetters = isTyping ? [...guess] : [];
    for (let c = 0; c < WORD_LEN; c++) {
      let letter = '';
      let cls = 'wd-tile';
      if (filledRow) {
        letter = [...filledRow.word][c] ?? '';
        cls += ` ${filledRow.marks[c]} filled`;
      } else if (isTyping) {
        letter = typedLetters[c] ?? '';
        if (letter) cls += ' filled';
      }
      tiles.push(
        <div key={c} className={cls}>
          {letter}
        </div>,
      );
    }
    rowsToRender.push(
      <div key={r} className="wd-row">
        {tiles}
      </div>,
    );
  }

  return (
    <div className="wd center-col">
      {scoreboard}

      <div className="wd-grid">{rowsToRender}</div>

      {error && <p className="wd-error">{error}</p>}

      {view.over ? (
        <p className="muted wd-result">
          {view.solved ? 'Bildin! ' : 'Bitti. '}
          {view.answer ? <>Kelime: <b>{view.answer}</b></> : null}
        </p>
      ) : (
        <div className="wd-opp">
          Rakip: <b>{opp?.guessCount ?? 0}/{MAX_ROWS}</b> tahmin
          {opp?.solved ? ' ✓ buldu' : opp?.done ? ' (bitti)' : ''}
        </div>
      )}

      <div className="wd-keyboard">
        {KEYBOARD.map((row, ri) => (
          <div key={ri} className="wd-krow">
            {ri === KEYBOARD.length - 1 && (
              <button
                className="wd-key wd-wide"
                onClick={submit}
                disabled={!canType}
              >
                ENTER
              </button>
            )}
            {row.map((k) => (
              <button
                key={k}
                className={`wd-key ${keyMarks[k] ?? ''}`}
                onClick={() => press(k)}
                disabled={!canType}
              >
                {k}
              </button>
            ))}
            {ri === KEYBOARD.length - 1 && (
              <button
                className="wd-key wd-wide"
                onClick={backspace}
                disabled={!canType}
              >
                SİL
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
