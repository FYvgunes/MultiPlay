import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameInfo } from '@oyun/shared';
import { socket, getPlayerId, getPlayerName, setPlayerName } from '../socket';

const ICONS: Record<string, string> = {
  chess: '♟️',
  quiz: '❓',
  tictactoe: '⭕',
  hangman: '🔤',
  namecity: '🏙️',
  wordle: '🟩',
  checkers: '🔴',
  tombala: '🎱',
};

const SOON: { id: string; name: string }[] = [
  { id: 'checkers', name: 'Dama' },
  { id: 'tictactoe', name: 'XOX' },
  { id: 'tombala', name: 'Tombala' },
];

const LEVELS = [
  { d: 1, label: 'Kolay' },
  { d: 2, label: 'Orta' },
  { d: 3, label: 'Zor' },
  { d: 4, label: 'Usta' },
];

// Quiz kategorileri
const ADULT_CATS = [
  'Genel Kültür', 'Tarih', 'Coğrafya', 'Bilim',
  'Spor', 'Sanat & Edebiyat', 'Film & Müzik', 'Teknoloji',
];
const KIDS_CATS = [
  'Hayvanlar', 'Basit Matematik', 'Kelimeler', 'Renkler & Şekiller', 'Masal & Çizgi Film',
];

interface CreateOpts {
  vsBot?: boolean;
  difficulty?: number;
  config?: unknown;
}

export default function Lobby() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameInfo[]>([]);
  const [name, setName] = useState(getPlayerName());
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<GameInfo | null>(null);
  // Quiz: seçilen kategori (+ çocuk modu)
  const [quizCat, setQuizCat] = useState<{ category: string; kids: boolean } | null>(null);

  useEffect(() => {
    socket.emit('listGames', (list) => setGames(list));
  }, []);

  function createGame(gameId: string, opts?: CreateOpts) {
    if (busy) return;
    setBusy(true);
    if (name.trim()) setPlayerName(name.trim());
    socket.emit(
      'createGame',
      {
        gameId,
        playerId: getPlayerId(),
        name: name.trim(),
        vsBot: opts?.vsBot,
        difficulty: opts?.difficulty,
        config: opts?.config,
      },
      (res) => {
        setBusy(false);
        setPicked(null);
        setQuizCat(null);
        if ('error' in res) {
          alert(res.error);
          return;
        }
        navigate(`/game/${res.roomId}`);
      },
    );
  }

  function closeModal() {
    if (busy) return;
    setPicked(null);
    setQuizCat(null);
  }

  const liveIds = new Set(games.map((g) => g.id));
  const soon = SOON.filter((s) => !liveIds.has(s.id));

  return (
    <div className="page lobby">
      <header className="hero">
        <div className="logo">♞</div>
        <h1>Aile Oyun Salonu</h1>
        <p>Oyun seç, ailenle ya da bota karşı oyna.</p>
      </header>

      <label className="field">
        <span>Adın</span>
        <input
          value={name}
          maxLength={20}
          placeholder="Örn. Dede"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p className="section-title">Oyunlar</p>
      <div className="game-grid">
        {games.map((g) => (
          <button key={g.id} className="game-card" disabled={busy} onClick={() => setPicked(g)}>
            <span className="game-icon">{ICONS[g.id] ?? '🎲'}</span>
            <span className="game-name">{g.name}</span>
            <span className="game-meta">
              {g.minPlayers === g.maxPlayers ? `${g.maxPlayers} oyuncu` : `${g.minPlayers}-${g.maxPlayers} oyuncu`}
            </span>
          </button>
        ))}
        {soon.map((s) => (
          <div key={s.id} className="game-card soon">
            <span className="badge-soon">Yakında</span>
            <span className="game-icon">{ICONS[s.id] ?? '🎲'}</span>
            <span className="game-name">{s.name}</span>
            <span className="game-meta">çok yakında</span>
          </div>
        ))}
        {games.length === 0 && <p className="muted">Sunucuya bağlanılıyor…</p>}
      </div>

      <div className="how">
        <h3>Nasıl oynanır?</h3>
        <ol>
          <li>Bir oyuna dokun.</li>
          <li>“Arkadaşla” seçip linki paylaş ya da “Bota karşı” oyna.</li>
          <li>Karşı taraf linki açınca oyun başlar.</li>
        </ol>
      </div>

      {/* ---- Quiz modalı (kategori + mod) ---- */}
      {picked && picked.id === 'quiz' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            {!quizCat ? (
              <>
                <h2>❓ Bilgi Yarışması</h2>
                <p className="muted">Kategori seç</p>
                <p className="section-title">Genel</p>
                <div className="cat-grid">
                  {ADULT_CATS.map((c) => (
                    <button key={c} className="cat-btn" onClick={() => setQuizCat({ category: c, kids: false })}>
                      {c}
                    </button>
                  ))}
                </div>
                <p className="section-title" style={{ marginTop: 14 }}>🧒 Çocuk</p>
                <div className="cat-grid">
                  {KIDS_CATS.map((c) => (
                    <button key={c} className="cat-btn kids" onClick={() => setQuizCat({ category: c, kids: true })}>
                      {c}
                    </button>
                  ))}
                </div>
                <button className="btn ghost" style={{ marginTop: 16 }} onClick={closeModal}>Vazgeç</button>
              </>
            ) : (
              <>
                <h2>{quizCat.kids ? '🧒 ' : ''}{quizCat.category}</h2>
                <p className="muted">Nasıl oynamak istersin?</p>
                <div className="modal-actions">
                  <button className="btn" disabled={busy} onClick={() => createGame('quiz', { vsBot: false, config: quizCat })}>
                    🔗 Arkadaşla (link)
                  </button>
                </div>
                <p className="section-title" style={{ marginTop: 18 }}>🤖 Bota karşı</p>
                <div className="level-grid">
                  {LEVELS.map((l) => (
                    <button key={l.d} className="btn ghost" disabled={busy}
                      onClick={() => createGame('quiz', { vsBot: true, difficulty: l.d, config: quizCat })}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <button className="btn ghost" style={{ marginTop: 16 }} disabled={busy} onClick={() => setQuizCat(null)}>← Kategori değiştir</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Diğer oyunlar (satranç) modalı ---- */}
      {picked && picked.id !== 'quiz' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{ICONS[picked.id] ?? '🎲'} {picked.name}</h2>
            <p className="muted">Nasıl oynamak istersin?</p>
            <div className="modal-actions">
              <button className="btn" disabled={busy} onClick={() => createGame(picked.id, { vsBot: false })}>
                🔗 Arkadaşla (link)
              </button>
            </div>
            <p className="section-title" style={{ marginTop: 18 }}>🤖 Bota karşı</p>
            <div className="level-grid">
              {LEVELS.map((l) => (
                <button key={l.d} className="btn ghost" disabled={busy}
                  onClick={() => createGame(picked.id, { vsBot: true, difficulty: l.d })}>
                  {l.label}
                </button>
              ))}
            </div>
            <button className="btn ghost" style={{ marginTop: 16 }} disabled={busy} onClick={closeModal}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
}
