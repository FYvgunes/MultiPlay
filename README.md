# Oyun Salonu 🎲

Link paylaşarak ailenle **karşılıklı** oyun oyna. İlk oyun **satranç**.
Mimari baştan **çok oyunlu**: yeni oyun eklemek = 1 server modülü + 1 client bileşeni.

## Kurulum

```bash
npm install
```

## Çalıştırma (geliştirme)

```bash
npm run dev      # server (3001) + client (5173) birlikte
```

Sonra tarayıcıda: <http://localhost:5173>

### Telefondan / başka cihazdan oynamak (aynı wifi)

Bilgisayarının yerel IP'sini bul (örn. `192.168.1.7`) ve telefon tarayıcısında:

```
http://192.168.1.7:5173
```

aç. Socket sunucusu otomatik olarak aynı IP'nin `3001` portuna bağlanır.

## Nasıl oynanır

1. Salonda **Satranç**'a dokun → oda oluşur.
2. **🔗 Linki paylaş** ile linki ailene gönder (telefonda yerel paylaşım menüsü açılır).
3. Karşı taraf linki açınca ikinci koltuğa oturur, oyun başlar.
4. Hamleler anlık iletilir; tüm kurallar (şah/mat/pat/rok/terfi) **sunucuda** doğrulanır.

## Yapı

```
shared/   GameModule arayüzü + socket sözleşmesi (ortak tipler)
server/   Express + Socket.IO çekirdeği (oyundan bağımsız) + games/chess.ts
client/   React + Vite; Lobby, Game ve games/chess/Board
```

## Oyunlar

- **Satranç** — tam kurallar, 2D/3D, ses, bota karşı (4 zorluk).
- **Bilgi Yarışması** — maç başında kategori seçilir; 10 soru, süreli + hız bonusu;
  arkadaşla (link) ya da bota karşı; çocuk/eğitim modu.
  - Sorular **AI ile** üretilir (Claude API). `ANTHROPIC_API_KEY` ortam değişkeni
    gerekir. **Anahtar yoksa** quiz yerleşik soru bankasıyla yine oynanır.

### Bilgi Yarışması için AI anahtarı

```bash
# Geliştirmede:
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Render'da: servis → **Environment** → `ANTHROPIC_API_KEY` ekle (kökteki `render.yaml`
bu değişkeni `sync:false` ile tanımlar; panelden değerini girersin).

## Yeni oyun eklemek

1. `server/src/games/<oyun>.ts` → `GameModule` arayüzünü uygula.
2. `server/src/registry.ts` → `register(...)` ile kaydet.
3. `client/src/games/<oyun>/...` → bileşeni yaz.
4. `client/src/games/registry.tsx` → `gameId -> bileşen` ekle.

Çekirdek (oda/bağlantı) hiç değişmez.

## Build (prod) — tek host

Tek sunucu hem arayüzü hem socket'i **aynı adresten** servis eder (aileye tek link).

```bash
npm run build           # client + server derlenir
npm run start           # sunucu: arayüz + socket (PORT env'i kullanır)
```

Yerelde prod denemesi:

```bash
PORT=4010 NODE_ENV=production npm run start
# tarayıcı: http://localhost:4010
```

## Deploy

### Render.com (en kolay, ücretsiz) — tek tık

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/FYvgunes/MultiPlay)

1. Yukarıdaki butona tıkla → Render'a (GitHub ile) giriş yap.
2. Render kökteki `render.yaml`'ı okur → **Apply** de.
3. Build bitince verilen `https://...onrender.com` adresini ailenle paylaş.

Alternatif (manuel): Render → **New + → Blueprint** → repoyu seç → Apply.

Build: `npm install && npm run build` · Start: `npm run start` · `PORT` Render
tarafından otomatik verilir. (Ücretsiz plan bir süre boştaysa uyur; ilk açılış
birkaç saniye gecikebilir.)

### Docker (Fly.io / Railway / herhangi bir host)

Kökte `Dockerfile` hazır:

```bash
docker build -t oyun .
docker run -p 3001:3001 -e PORT=3001 oyun
```

> Ayrı host'larda (arayüz ve sunucu farklı adreste) çalıştırmak istersen,
> client'ı `VITE_SERVER_URL=https://sunucu-adresi` ile derle.

## İleride

- Capacitor ile iOS/Android paketi (aynı client kodu)
- İkinci oyun (XOX / dama) — platform soyutlamasını doğrular
