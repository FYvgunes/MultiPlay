// Platformun ortak sözleşmesi: oyundan bağımsız çekirdek ile her oyun
// modülü ve client bu tipler üzerinden konuşur.

/** Bir oyuncunun oturduğu koltuk indeksi (0, 1, ...). İzleyici için null. */
export type Seat = number | null;

/** Bir oyunun anlık durum özeti (oyundan bağımsız kısım). */
export interface GameStatus {
  over: boolean;
  /** Sıradaki koltuğun adı/etiketi (örn. "w" / "b"), oyun sürüyorsa. */
  turn?: string;
  /** Oyun bittiyse sonucun makine-okur etiketi (örn. "white", "draw"). */
  result?: string;
  /** Bitişin insan-okur sebebi (örn. "Şah mat", "Pat"). */
  reason?: string;
}

export interface ApplyMoveResult<State> {
  ok: boolean;
  state?: State;
  error?: string;
}

/**
 * Her oyun bu arayüzü uygular. Çekirdek (roomStore + socket) sadece bunu
 * çağırır; satranca/dama'ya özel hiçbir şey bilmez.
 *
 * State: oyunun tam (otoriter) durumu; sunucuda tutulur.
 * Move:  bir oyuncunun gönderdiği hamle payload'ı.
 */
export interface GameModule<State = unknown, Move = unknown> {
  id: string; // örn. "chess"
  name: string; // örn. "Satranç"
  minPlayers: number;
  maxPlayers: number;

  /** Oyun başlangıç durumunu üretir. config: lobiden gelen ayarlar (kategori vb.). */
  createInitialState(config?: unknown): State;

  /**
   * Async kurulum (örn. AI ile soru üretimi). Çekirdek createRoom sonrası ve
   * rematch'te await eder. Dönen state ile başlangıç durumu güncellenir.
   */
  init?(state: State, config?: unknown): Promise<State>;

  /** Bir koltuğun hamlesini doğrular ve uygular. Otoriter kontrol burada. */
  applyMove(state: State, move: Move, seat: number): ApplyMoveResult<State>;

  /** Durum özeti (bitti mi, sıra kimde, sonuç). */
  getStatus(state: State): GameStatus;

  /** Sıradaki koltuk indeksi (sıra-tabanlı oyunlarda bot sürüşü için). */
  turnSeat?(state: State): number | null;

  /**
   * Aynı anda oynanan oyunlarda hareket bekleyen TÜM koltuklar (örn. quiz'de
   * o soruyu henüz cevaplamamış koltuklar). Bot sürüşü bunu kullanır; varsa
   * turnSeat yerine geçer.
   */
  pendingSeats?(state: State): number[];

  /**
   * Bota karşı oynama: verilen koltuk için bir hamle üretir.
   * difficulty: 1=Kolay .. 4=Usta. Modül desteklemiyorsa tanımsız.
   */
  getBotMove?(state: State, seat: number, difficulty: number): Move | null;

  /** Botun "düşünme" gecikmesi (ms). Verilmezse çekirdek varsayılanı kullanır. */
  getBotDelayMs?(): number;

  /**
   * Süreli oyunlar: bu state'in otomatik ilerleyeceği zaman (epoch ms) ya da
   * null. Çekirdek bu ana bir zamanlayıcı kurar.
   */
  getDeadline?(state: State): number | null;

  /** Süre dolunca uygulanır (örn. cevaplanmayan soruyu geç). */
  onTimeout?(state: State): ApplyMoveResult<State>;

  /**
   * Belirli bir koltuğun göreceği durum görünümü. Gizli bilgi içeren
   * oyunlar (kart vb.) için override edilir. Varsayılan: tüm state.
   */
  viewFor?(state: State, seat: Seat): unknown;
}

/** Lobide listelenecek oyun meta verisi. */
export interface GameInfo {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
}

/** Bir odadaki oyuncunun, client'a gönderilen genel görünümü. */
export interface PlayerView {
  seat: Seat;
  name: string;
  connected: boolean;
  isBot?: boolean;
}

// ---- Socket.IO event sözleşmesi (oyundan bağımsız) ----

export interface ClientToServerEvents {
  listGames: (cb: (games: GameInfo[]) => void) => void;
  createGame: (
    args: {
      gameId: string;
      playerId: string;
      name?: string;
      vsBot?: boolean;
      difficulty?: number;
      config?: unknown; // oyuna özel ayar (örn. quiz: {category, kids})
    },
    cb: (res: { roomId: string } | { error: string }) => void,
  ) => void;
  joinGame: (
    args: { roomId: string; playerId: string; name?: string },
    cb: (res: RoomSnapshot | { error: string }) => void,
  ) => void;
  move: (
    args: { roomId: string; payload: unknown },
    cb?: (res: { ok: true } | { error: string }) => void,
  ) => void;
  resign: (args: { roomId: string }) => void;
  rematch: (args: { roomId: string }) => void;
}

export interface ServerToClientEvents {
  gameState: (snapshot: RoomSnapshot) => void;
  opponentJoined: (player: PlayerView) => void;
  opponentLeft: (player: PlayerView) => void;
  gameOver: (status: GameStatus) => void;
  errorMsg: (message: string) => void;
}

/** Client'a gönderilen tam oda anlık görüntüsü. */
export interface RoomSnapshot {
  roomId: string;
  gameId: string;
  gameName: string;
  /** Bu istemcinin koltuğu (oyuncu değilse null). */
  yourSeat: Seat;
  players: PlayerView[];
  /** Oyuna özel durum (örn. satrançta FEN). viewFor uygulanmış hali. */
  state: unknown;
  status: GameStatus;
}
