import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@oyun/shared';

// Sunucu adresi:
// - VITE_SERVER_URL verilmişse onu kullan
// - Geliştirmede aynı makinenin 3001 portu (LAN'da telefon erişebilsin)
// - Prod'da (tek-host) aynı origin → io() boş bırakılır
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : undefined);

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: AppSocket = io(SERVER_URL, {
  autoConnect: true,
});

/**
 * Rastgele kimlik üretir. crypto.randomUUID yalnızca güvenli bağlamda
 * (HTTPS / localhost) çalışır; telefondan LAN IP (http) ile açıldığında
 * yok. O yüzden güvenli bir fallback kullanıyoruz.
 */
function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* yoksa fallback */
  }
  return (
    'p-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Oyuncu kimliği SEKME bazlıdır (sessionStorage): aynı tarayıcıda iki sekme
 * = iki ayrı oyuncu (test ve aynı cihazda karşılıklı oynama için şart).
 * sessionStorage sayfa yenilemede ve telefon kilidinde korunduğu için
 * yeniden bağlanma yine doğru koltuğa oturur.
 */
export function getPlayerId(): string {
  const KEY = 'oyun.playerId';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/** Kaydedilmiş görünen ad (varsa). */
export function getPlayerName(): string {
  return localStorage.getItem('oyun.playerName') || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem('oyun.playerName', name);
}
