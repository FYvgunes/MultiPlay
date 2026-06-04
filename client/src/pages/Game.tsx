import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RoomSnapshot, GameStatus } from '@oyun/shared';
import { socket, getPlayerId, getPlayerName } from '../socket';
import { getGameComponent } from '../games/registry';
import { isMuted, setMuted } from '../games/chess/sounds';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [over, setOver] = useState<GameStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  useEffect(() => {
    if (!roomId) return;

    function join() {
      socket.emit(
        'joinGame',
        { roomId: roomId!, playerId: getPlayerId(), name: getPlayerName() },
        (res) => {
          if ('error' in res) setError(res.error);
          else {
            setSnapshot(res);
            setError(null);
          }
        },
      );
    }

    const onConnect = () => {
      setConnected(true);
      join(); // yeniden bağlanınca odaya tekrar katıl
    };
    const onDisconnect = () => setConnected(false);
    const onState = (snap: RoomSnapshot) => setSnapshot(snap);
    const onOver = (status: GameStatus) => setOver(status);
    const onErr = (msg: string) => setError(msg);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameState', onState);
    socket.on('gameOver', onOver);
    socket.on('errorMsg', onErr);

    if (socket.connected) join();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameState', onState);
      socket.off('gameOver', onOver);
      socket.off('errorMsg', onErr);
    };
  }, [roomId]);

  function sendMove(payload: unknown) {
    socket.emit('move', { roomId: roomId!, payload }, (res) => {
      if (res && 'error' in res) setError(res.error);
    });
  }

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Oyun daveti', url }).catch(() => {});
      return;
    }
    // navigator.clipboard yalnızca güvenli bağlamda var; yoksa eski yöntem.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(flashCopied).catch(() => {
        legacyCopy(url) && flashCopied();
      });
    } else {
      legacyCopy(url) && flashCopied();
    }
  }

  function rematch() {
    socket.emit('rematch', { roomId: roomId! });
    setOver(null);
  }

  if (error) {
    return (
      <div className="page center">
        <p className="error">{error}</p>
        <button className="btn" onClick={() => navigate('/')}>
          Salona dön
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="page center">
        <p className="muted">Odaya katılınıyor…</p>
      </div>
    );
  }

  const GameComponent = getGameComponent(snapshot.gameId);
  const isSpectator = snapshot.yourSeat === null;
  const opponentSeats = snapshot.players.filter(
    (p) => p.seat !== snapshot.yourSeat,
  );
  const waiting = snapshot.players.length < 2;

  const effectiveStatus = over ?? snapshot.status;

  return (
    <div className="page game">
      <header className="game-bar">
        <button className="btn ghost" onClick={() => navigate('/')}>
          ← Salon
        </button>
        <span className="room-code">Oda: {snapshot.roomId}</span>
        <button
          className="icon-btn"
          onClick={toggleMute}
          title={muted ? 'Sesi aç' : 'Sesi kapat'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <span className={connected ? 'dot online' : 'dot offline'}>
          {connected ? 'Bağlı' : 'Bağlantı yok'}
        </span>
      </header>

      <div className="players">
        {snapshot.players.map((p) => (
          <span
            key={p.seat ?? 'x'}
            className={`player ${p.connected ? '' : 'gone'} ${
              p.seat === snapshot.yourSeat ? 'me' : ''
            }`}
          >
            {snapshot.gameId === 'chess'
              ? p.seat === 0
                ? '⚪ '
                : '⚫ '
              : ''}
            {p.name}
            {p.seat === snapshot.yourSeat ? ' (sen)' : ''}
            {!p.connected ? ' • çevrimdışı' : ''}
          </span>
        ))}
        {isSpectator && <span className="player spectator">👀 İzleyici</span>}
      </div>

      {waiting && (
        <div className="invite">
          <p>Rakip bekleniyor… Bu linki gönder:</p>
          <button className="btn" onClick={shareLink}>
            {copied ? '✓ Kopyalandı' : '🔗 Linki paylaş'}
          </button>
        </div>
      )}

      <div className="board-area">
        {GameComponent ? (
          <GameComponent snapshot={snapshot} sendMove={sendMove} />
        ) : (
          <p className="error">Bu oyun ({snapshot.gameId}) desteklenmiyor.</p>
        )}
      </div>

      {!effectiveStatus.over && !waiting && (
        <p className="turn">{turnLabel(snapshot, effectiveStatus)}</p>
      )}

      {effectiveStatus.over && (
        <div className="overlay">
          <div className="modal">
            <h2>Oyun bitti</h2>
            <p>{resultLabel(snapshot, effectiveStatus)}</p>
            <div className="modal-actions">
              {!isSpectator && (
                <button className="btn" onClick={rematch}>
                  Tekrar oyna
                </button>
              )}
              <button className="btn ghost" onClick={() => navigate('/')}>
                Salona dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Güvenli bağlam olmadan panoya kopyalama (eski yöntem). */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function turnLabel(snap: RoomSnapshot, status: GameStatus): string {
  if (snap.gameId !== 'chess') return status.turn ? `Sıra: ${status.turn}` : '';
  const myColor = snap.yourSeat === 1 ? 'b' : 'w';
  const opponent = snap.players.find((p) => p.seat !== snap.yourSeat);
  if (snap.yourSeat === null)
    return status.turn === 'w' ? 'Sıra: Beyaz' : 'Sıra: Siyah';
  if (status.turn === myColor) return 'Sıra sende ♟️';
  return opponent?.isBot ? '🤖 düşünüyor…' : 'Rakibin sırası…';
}

function resultLabel(snap: RoomSnapshot, status: GameStatus): string {
  const reason = status.reason ? `${status.reason}. ` : '';
  if (status.result === 'draw') return `${reason}Berabere.`;
  if (snap.gameId === 'chess') {
    const winnerColor = status.result === 'white' ? 'Beyaz' : 'Siyah';
    const youWon =
      (status.result === 'white' && snap.yourSeat === 0) ||
      (status.result === 'black' && snap.yourSeat === 1);
    if (snap.yourSeat === null) return `${reason}${winnerColor} kazandı.`;
    return youWon ? `${reason}Kazandın! 🎉` : `${reason}Kaybettin.`;
  }
  return `${reason}Kazanan: ${status.result ?? '-'}`;
}
