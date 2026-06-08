# Online Oyun Platformu — TODO

Link paylaşarak ailenle karşılıklı oyun. İlk oyun: **satranç**. Mimari baştan **çok oyunlu**.

## Faz 0 — İskelet ✅
- [x] npm workspaces monorepo (`client`, `server`, `shared`)
- [x] `.gitignore`, `todo.md`
- [x] `shared/types.ts`: `GameModule` arayüzü + socket event tipleri
- [x] git init (repo başlatıldı)

## Faz 1 — Backend (oyundan bağımsız çekirdek) ✅
- [x] Express + Socket.IO server, CORS
- [x] `roomStore`: oda oluştur/katıl, koltuk atama, izleyici, reconnect, TTL
- [x] `registry`: `gameId -> GameModule`
- [x] Socket handler'ları odanın modülüne delege eder

## Faz 2 — Satranç modülü + Frontend ✅
- [x] `server/games/chess.ts`: `chess.js`'i `GameModule`'e sar
- [x] Vite React + TS iskelet, router
- [x] Socket client + context
- [x] Lobby: oyun seç → "Yeni oyun" → link kopyala
- [x] Client `games/registry`: `gameId -> bileşen`
- [x] Satranç Board: `react-chessboard`, hamle, sıra, renk, terfi
- [x] Oyun sonu modalı + "Tekrar oyna"

## Faz 3 — Mobil & cila
- [x] Responsive layout (mobil öncelikli CSS, dokunmatik viewport)
- [x] PWA manifest + ikon
- [x] Bağlantı durumu / yeniden bağlanma göstergesi
- [ ] Telefonda gerçek dokunmatik testi (sen yapacaksın)

## Ek özellikler ✅
- [x] Sesler (hamle/alma/şah/bitiş, Web Audio) + 🔊/🔇 aç-kapa
- [x] Ahşap tema (tüm uygulama) + platform giriş ekranı + "Yakında" oyun kartları
- [x] Ahşap taşlar + ahşap tahta (2D)
- [x] Hamle önerileri (yasal kareler) + tıkla-taşı (mobil dostu)
- [x] **3D tahta** (react-three-fiber): ahşap 3D taşlar, döndürülebilir kamera, ışık/gölge, 2D/3D geçişi, lazy-load
- [x] **Botlar**: sunucuda sanal oyuncu, alfa-beta + konum tabloları, 4 zorluk (Kolay/Orta/Zor/Usta)

## Faz 4 — Deploy ✅ (hazır)
- [x] Tek-host: sunucu arayüzü + socket'i aynı adresten servis eder
- [x] Prod build (`npm run build` + `npm run start`), `PORT` env desteği
- [x] Socket URL: prod'da aynı origin, dev'de LAN:3001
- [x] `render.yaml` + `Dockerfile` + `.dockerignore` + README rehberi
- [x] GitHub'a gönderildi (FYvgunes/MultiPlay) → Render'da yayında ✅
      🔗 https://aile-oyun-salonu.onrender.com (canlı test edildi: arayüz + socket + bot)

## Faz 5 — Native (opsiyonel)
- [ ] Capacitor ile iOS/Android paketi

## Faz 6 — İkinci oyun: Bilgi Yarışması ✅
- [x] Platform genel yetenekleri: config, async init, zamanlayıcı (getDeadline/onTimeout), pendingSeats, bot delay
- [x] Quiz modülü (server): AI üretimi + viewFor ile cevap gizleme + skor/hız bonusu + bot
- [x] AI soru üretici (Anthropic SDK, tool-use, cache) + anahtarsız fallback bank
- [x] Quiz arayüzü (kategori, süre çubuğu, şıklar, reveal, skor) + lobi (kategori/çocuk/bot)
- [x] Game.tsx genelleştirme + quiz sesleri
- [x] Uçtan uca test (fallback ile) — ready→başlat→soru→reveal→bitiş, bot çalışıyor
- [ ] Canlıda AI: Render'a `ANTHROPIC_API_KEY` ekle (yoksa fallback)

## Faz 7 — Daha çok oyun ✅
- [x] **XOX (Tic-Tac-Toe)**: 2 oyuncu, minimax bot (Kolay→Usta), kazanan çizgi vurgusu
- [x] **Adam Asmaca**: paylaşımlı gizli kelime (8 kategori bankası), sıra tabanlı, harf
      başına puan, Türkçe klavye, frekans tabanlı bot, `viewFor` ile kelime gizleme
- [x] **İsim-Şehir**: 5 tur, 60 sn süre çubuğu, 5 kategori, 10/5/0 puanlama,
      reveal tablosu, kelime bankalı bot, `viewFor` ile rakip cevap gizleme
- [x] **Wordle**: paylaşımlı 5 harfli TR kelime, bağımsız yarış, renk geri bildirimi,
      Türkçe klavye, aday-eleyen bot (Usta 98/98 çözer), `viewFor` ile rakip harf gizleme
- [x] Hepsi `GameModule` sözleşmesine uygun; registry + Lobi + Game.tsx etiketleri bağlandı
- [x] Build + uçtan uca bot-vs-bot mantık testi geçti

## Faz 8 — Geleneksel oyunlar ✅
- [x] **Dama (Türk Daması)**: ortogonal hareket, zorunlu çoklu alma, uçan dama,
      terfi, alfa-beta bot (Kolay→Usta), ilerleme-yok beraberlik kuralı (sonlanma garanti)
- [x] **Tombala**: geçerli 3×9 kart üretimi, süreli oto-çekiliş (timer), manuel
      işaretleme, çinko/tombala tespiti, bot kusursuz oto-işaretler (`pendingSeats`+`getBotMove`)
- [x] registry + Lobi + CSS bağlandı; build + bot/simülasyon testleri geçti

## Faz 9 — Performans & deploy optimizasyonu ✅
- [x] **Oyunları code-split** (`registry.tsx` lazy + Game.tsx Suspense): lobi artık
      8 oyunun kodunu peşin indirmiyor; chess.js + react-chessboard ayrı chunk'a
      taşındı (ilk indirme tek 382 kB bundle yerine ~76 kB gzip)
- [x] **Vite manualChunks**: `vendor-react` + `vendor-socket` ayrı, uzun-cache'lenebilir
- [x] **Sunucuda compression** (gzip) middleware — JS/CSS transferi ~3-4x küçük
- [x] **Immutable cache header**: hash'li `/assets/*` 1 yıl, `index.html` no-cache
- [x] **Multi-stage Dockerfile**: runner imajı yalnızca dist + prod deps (küçük, hızlı)
- [x] Prod runtime testi: health + gzip + cache header'lar doğrulandı

## İleride
- [ ] Capacitor ile iOS/Android paketi (Faz 5)
