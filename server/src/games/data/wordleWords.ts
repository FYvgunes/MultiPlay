// Wordle (Türkçe) kelime bankası. Tüm kelimeler TAM 5 Türkçe harf,
// BÜYÜK harfli ve doğru yazımlı. İ/I, Ç, Ş, Ğ, Ü, Ö tek harf sayılır.
//
// ANSWERS: cevap olarak seçilebilecek yaygın 5 harfli kelimeler.
// VALID:   kabul edilen tahminler (ANSWERS ⊆ VALID).

/** Türkçe bir kelimeyi harf-harf (grapheme) ayırır. */
export function letters(word: string): string[] {
  // Türkçe harfler tek kod-noktası olduğundan spread doğru sayar.
  return [...word];
}

/** Cevap olarak kullanılabilecek, yaygın ve doğru yazımlı 5 harfli kelimeler. */
export const ANSWERS: readonly string[] = [
  'KALEM', 'KİTAP', 'ELMAS', 'BAHÇE', 'ORMAN',
  'DENİZ', 'BULUT', 'ÇİÇEK', 'MASAL', 'KUTUP',
  'TARLA', 'BALIK', 'KAYIK', 'PERDE', 'KÖPEK',
  'TAVUK', 'HOROZ', 'KOYUN', 'GEYİK', 'TİLKİ',
  'KARGA', 'SERÇE', 'MARTI', 'BEBEK', 'GELİN',
  'DAMAT', 'TEYZE', 'KOMŞU', 'ARABA', 'VAPUR',
  'KAPAK', 'PERON', 'DOLAP', 'SEHPA', 'HALAT',
  'ÇORAP', 'PALTO', 'BİBER', 'SOĞAN', 'MARUL',
  'KAVUN', 'KİRAZ', 'LİMON', 'ÇİLEK', 'İNCİR',
  'BADEM', 'CEVİZ', 'HURMA', 'NOHUT', 'EKMEK',
  'PASTA', 'BÖREK', 'KÖFTE', 'PİLAV', 'ÇORBA',
  'TURŞU', 'REÇEL', 'GÜNEŞ', 'NEHİR', 'DALGA',
  'FIRÇA', 'SABUN', 'HAVLU', 'MERAK', 'HAYAL',
  'DUVAR', 'TAHTA', 'KÜREK', 'BALTA', 'ÇEKİÇ',
  'MOTOR', 'LAMBA', 'FENER', 'TABAK', 'KAŞIK',
  'ÇATAL', 'KAZAK', 'ŞAPKA', 'ÇİZME', 'KEMER',
  'YÜZÜK', 'SALÇA', 'HELVA', 'ŞEKER', 'AYRAN',
  'SİNEK', 'ASLAN', 'ÖRDEK', 'TURNA', 'KUMRU',
  'BÜTÇE', 'ZAMAN', 'HABER', 'DÜNYA', 'ŞEHİR',
  'KÖPRÜ', 'BAYIR', 'ÇAYIR',
];

/** ANSWERS dışında kabul edilen ek (gerçek) 5 harfli tahminler. */
const EXTRA: readonly string[] = [
  'ARMUT', 'SUCUK', 'SALAM', 'DRAMA', 'ROMAN',
  'DERGİ', 'ÇADIR', 'ÇANTA', 'TARAK', 'SEPET',
  'FİŞEK', 'DAVUL', 'ZURNA', 'KEMAN', 'GİTAR',
  'SAHNE', 'KEKİK', 'DEFNE', 'ÇİMEN', 'BAKLA',
  'SOSİS', 'KIZIL', 'DEMİR', 'BAKIR', 'ALTIN',
  'GÜMÜŞ', 'BRONZ', 'KÖMÜR', 'MAZOT', 'BETON',
  'TUĞLA', 'ÇAKIL', 'KUMUL', 'FİDAN', 'TOHUM',
  'GÜBRE', 'BUDAK', 'KUZEY', 'GÜNEY', 'BAHAR',
  'SICAK', 'SOĞUK', 'NEMLİ', 'TUZLU', 'TATLI',
  'YEŞİL', 'BEYAZ', 'SİYAH', 'KAHVE', 'KREMA',
  'SÜTLÜ', 'BALLI', 'SUSAM', 'PİRİN', 'HAMUR',
  'DUMAN', 'SİSLİ', 'BUHAR', 'KORUK', 'DİKEN',
  'FUNDA', 'SARAY', 'BAYAN', 'ERKEK', 'ÇOCUK',
  'BÜYÜK', 'KÜÇÜK', 'GENİŞ', 'DERİN', 'ALÇAK',
  'HIZLI', 'GÜZEL', 'TEMİZ', 'KİRLİ', 'KALIN',
  'SAKİN', 'CANLI', 'MUTLU', 'ÜZGÜN', 'KIRIK',
];

/** Tüm geçerli tahminler (ANSWERS ⊆ VALID). */
export const VALID: ReadonlySet<string> = new Set<string>([...ANSWERS, ...EXTRA]);

/** Bir kelime geçerli bir tahmin mi? */
export function isValid(word: string): boolean {
  return VALID.has(word);
}

/** Rastgele bir cevap kelimesi seçer. */
export function randomAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}
