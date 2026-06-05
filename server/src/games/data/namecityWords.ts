// İsim-Şehir botunun kullandığı kelime bankası.
// Her kategori için, baş harfe göre seçilebilecek gerçek Türkçe kelimeler.
// Geniş harf kapsamı hedeflenir: çoğu harf için en az bir kelime.

// Türkçe büyük harfe çevirme (i -> İ, ı -> I gibi yerel kuralları gözetir).
export function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** İlk harfi (Türkçe büyük) döndürür. Boşsa ''. */
export function firstLetterUpper(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return trUpper(t[0]);
}

// Kategori -> kelime listesi. Her kelimenin baş harfi banka anahtarı gibi
// kullanılır; botWord ilgili harfe uyan kelimeleri filtreler.
const BANK: Record<string, string[]> = {
  İsim: [
    'Ali', 'Ayşe', 'Berk', 'Burak', 'Cem', 'Ceyda', 'Çağla', 'Çetin',
    'Deniz', 'Derya', 'Emre', 'Esra', 'Fatma', 'Furkan', 'Gökhan', 'Gül',
    'Hakan', 'Hande', 'İrem', 'İsmail', 'Kaan', 'Kerem', 'Levent', 'Leyla',
    'Mert', 'Murat', 'Nazlı', 'Nilay', 'Onur', 'Okan', 'Özlem', 'Özgür',
    'Pelin', 'Pınar', 'Rana', 'Rıza', 'Selin', 'Serkan', 'Şenay', 'Şükrü',
    'Tolga', 'Tuğçe', 'Umut', 'Uğur', 'Ünal', 'Ülkü', 'Volkan', 'Veli',
    'Yasin', 'Yıldız', 'Zeynep', 'Ziya',
  ],
  Şehir: [
    'Adana', 'Aydın', 'Bursa', 'Balıkesir', 'Ceyhan', 'Çorum', 'Çanakkale',
    'Denizli', 'Diyarbakır', 'Edirne', 'Erzurum', 'Fethiye', 'Foça',
    'Gaziantep', 'Giresun', 'Hatay', 'Iğdır', 'İzmir', 'İstanbul', 'Kayseri',
    'Konya', 'Lüleburgaz', 'Manisa', 'Mersin', 'Niğde', 'Nevşehir', 'Ordu',
    'Osmaniye', 'Ödemiş', 'Pendik', 'Polatlı', 'Rize', 'Samsun', 'Sivas',
    'Şanlıurfa', 'Şırnak', 'Trabzon', 'Tokat', 'Uşak', 'Urla', 'Ünye',
    'Üsküdar', 'Van', 'Vezirköprü', 'Yalova', 'Yozgat', 'Zonguldak',
  ],
  Hayvan: [
    'Aslan', 'Antilop', 'Balık', 'Baykuş', 'Ceylan', 'Civciv', 'Çita',
    'Çakal', 'Deve', 'Domuz', 'Eşek', 'Engerek', 'Fil', 'Fok', 'Geyik',
    'Güvercin', 'Horoz', 'Hamster', 'İnek', 'İguana', 'Kedi', 'Köpek',
    'Leopar', 'Leylek', 'Maymun', 'Manda', 'Nesil', 'Örümcek', 'Ördek',
    'Panda', 'Penguen', 'Ringa', 'Sincap', 'Sırtlan', 'Şahin', 'Şempanze',
    'Tavşan', 'Tilki', 'Uğurböceği', 'Uçan tilki', 'Ütopik', 'Vaşak',
    'Yılan', 'Yunus', 'Zürafa', 'Zebra',
  ],
  Bitki: [
    'Armut', 'Ayva', 'Badem', 'Biber', 'Ceviz', 'Çilek', 'Çam', 'Defne',
    'Domates', 'Elma', 'Erik', 'Fasulye', 'Fıstık', 'Gül', 'Gelincik',
    'Havuç', 'Hindiba', 'Incir', 'İğde', 'Kavun', 'Kiraz', 'Lahana',
    'Limon', 'Mandalina', 'Marul', 'Nane', 'Nar', 'Orkide', 'Otlu',
    'Ödağacı', 'Patates', 'Portakal', 'Reyhan', 'Roka', 'Soğan', 'Sarımsak',
    'Şeftali', 'Şalgam', 'Turp', 'Tere', 'Üzüm', 'Ülker otu', 'Vişne',
    'Yonca', 'Yulaf', 'Zeytin', 'Zambak',
  ],
  Eşya: [
    'Ayna', 'Araba', 'Bardak', 'Battaniye', 'Cüzdan', 'Cam', 'Çatal',
    'Çanta', 'Defter', 'Dolap', 'Eldiven', 'Elek', 'Fırça', 'Fincan',
    'Gözlük', 'Gömlek', 'Halı', 'Havlu', 'Iskarpin', 'İğne', 'İp', 'Kalem',
    'Kaşık', 'Lamba', 'Levye', 'Masa', 'Makas', 'Naylon', 'Not defteri',
    'Ocak', 'Oyuncak', 'Örtü', 'Ördek (oyuncak)', 'Perde', 'Pil', 'Radyo',
    'Raf', 'Sandalye', 'Saat', 'Şemsiye', 'Şişe', 'Tabak', 'Tava', 'Uçurtma',
    'Ütü', 'Üçgen cetvel', 'Vazo', 'Valiz', 'Yastık', 'Yorgan', 'Zarf', 'Zil',
  ],
};

const CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya'];

// Baş harfe göre hızlı arama için kategori -> harf -> kelimeler indeksi.
const INDEX: Record<string, Record<string, string[]>> = {};
for (const cat of CATEGORIES) {
  const byLetter: Record<string, string[]> = {};
  for (const w of BANK[cat] ?? []) {
    const L = firstLetterUpper(w);
    (byLetter[L] ??= []).push(w);
  }
  INDEX[cat] = byLetter;
}

/**
 * Verilen kategori ve büyük harf için uygun bir kelime döndürür.
 * Uygun kelime yoksa null (bot o kategoriyi boş bırakır).
 */
export function botWord(category: string, letterUpper: string): string | null {
  const byLetter = INDEX[category];
  if (!byLetter) return null;
  const list = byLetter[letterUpper];
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}
