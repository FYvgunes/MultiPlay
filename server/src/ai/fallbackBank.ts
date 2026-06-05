import type { QuizQuestion } from './quizGenerator.js';

// AI anahtarı yokken kullanılan küçük yerleşik banka. Kategoriye özel +
// genel havuz. Amaç: oyunun her durumda oynanabilir olması.

const BANK: Record<string, QuizQuestion[]> = {
  'Genel Kültür': [
    { text: 'Türkiye’nin başkenti neresidir?', options: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'], correctIndex: 1, explanation: 'Ankara 1923’ten beri başkenttir.' },
    { text: 'Bir yılda kaç ay vardır?', options: ['10', '11', '12', '13'], correctIndex: 2, explanation: 'Bir yıl 12 aydan oluşur.' },
    { text: 'Gökkuşağında kaç renk vardır?', options: ['5', '6', '7', '8'], correctIndex: 2, explanation: 'Klasik olarak 7 renk sayılır.' },
    { text: 'Mona Lisa tablosunu kim yapmıştır?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], correctIndex: 2, explanation: 'Leonardo da Vinci’nin eseridir.' },
  ],
  Tarih: [
    { text: 'Türkiye Cumhuriyeti hangi yıl kuruldu?', options: ['1919', '1920', '1923', '1938'], correctIndex: 2, explanation: '29 Ekim 1923’te ilan edildi.' },
    { text: 'İstanbul hangi yıl fethedildi?', options: ['1453', '1071', '1299', '1517'], correctIndex: 0, explanation: 'Fatih Sultan Mehmet 1453’te fethetti.' },
    { text: 'Kurtuluş Savaşı’nın önderi kimdir?', options: ['Atatürk', 'İnönü', 'Fevzi Çakmak', 'Karabekir'], correctIndex: 0, explanation: 'Mustafa Kemal Atatürk önderlik etti.' },
  ],
  Coğrafya: [
    { text: 'Dünyanın en uzun nehri hangisidir?', options: ['Amazon', 'Nil', 'Yangçe', 'Fırat'], correctIndex: 1, explanation: 'Nil genellikle en uzun kabul edilir.' },
    { text: 'Türkiye’nin en yüksek dağı hangisidir?', options: ['Erciyes', 'Ağrı', 'Kaçkar', 'Uludağ'], correctIndex: 1, explanation: 'Ağrı Dağı ~5137 m ile en yüksektir.' },
    { text: 'Hangi gezegen Güneş’e en yakındır?', options: ['Venüs', 'Mars', 'Merkür', 'Dünya'], correctIndex: 2, explanation: 'Merkür Güneş’e en yakın gezegendir.' },
  ],
  Bilim: [
    { text: 'Suyun kimyasal formülü nedir?', options: ['CO2', 'H2O', 'O2', 'NaCl'], correctIndex: 1, explanation: 'Su iki hidrojen ve bir oksijenden oluşur.' },
    { text: 'İnsan vücudunda kaç kemik vardır (yetişkin)?', options: ['106', '206', '306', '406'], correctIndex: 1, explanation: 'Yetişkinde yaklaşık 206 kemik bulunur.' },
    { text: 'Işık hızı yaklaşık kaçtır?', options: ['300 km/sn', '3.000 km/sn', '300.000 km/sn', '3 km/sn'], correctIndex: 2, explanation: 'Işık boşlukta ~300.000 km/sn.' },
  ],
  Spor: [
    { text: 'Bir futbol takımı sahada kaç oyuncuyla başlar?', options: ['9', '10', '11', '12'], correctIndex: 2, explanation: 'Kaleci dahil 11 oyuncu.' },
    { text: 'Olimpiyatlar kaç yılda bir yapılır?', options: ['2', '3', '4', '5'], correctIndex: 2, explanation: 'Yaz Olimpiyatları 4 yılda bir.' },
  ],
  Hayvanlar: [
    { text: 'Hangi hayvan “ormanın kralı” olarak bilinir?', options: ['Kaplan', 'Aslan', 'Fil', 'Ayı'], correctIndex: 1, explanation: 'Aslan ormanın kralı denir.' },
    { text: 'Bal yapan hayvan hangisidir?', options: ['Karınca', 'Arı', 'Kelebek', 'Sinek'], correctIndex: 1, explanation: 'Arılar bal yapar.' },
    { text: 'En hızlı kara hayvanı hangisidir?', options: ['At', 'Çita', 'Tavşan', 'Köpek'], correctIndex: 1, explanation: 'Çita en hızlı kara hayvanıdır.' },
  ],
  'Basit Matematik': [
    { text: '7 + 5 kaçtır?', options: ['10', '11', '12', '13'], correctIndex: 2, explanation: '7 ve 5 toplamı 12.' },
    { text: '6 × 3 kaçtır?', options: ['12', '15', '18', '21'], correctIndex: 2, explanation: '6 kere 3 eşittir 18.' },
    { text: '20 - 8 kaçtır?', options: ['10', '11', '12', '14'], correctIndex: 2, explanation: '20 eksi 8 eşittir 12.' },
  ],
};

const GENERIC: QuizQuestion[] = [
  { text: 'Bir haftada kaç gün vardır?', options: ['5', '6', '7', '8'], correctIndex: 2, explanation: 'Bir hafta 7 gündür.' },
  { text: 'Güneş hangi yönden doğar?', options: ['Batı', 'Doğu', 'Kuzey', 'Güney'], correctIndex: 1, explanation: 'Güneş doğudan doğar.' },
  { text: 'Bir üçgenin kaç kenarı vardır?', options: ['2', '3', '4', '5'], correctIndex: 1, explanation: 'Üçgenin 3 kenarı vardır.' },
  { text: 'Buzun erimesiyle ne oluşur?', options: ['Buhar', 'Su', 'Kar', 'Tuz'], correctIndex: 1, explanation: 'Buz eriyince su olur.' },
  { text: 'Türk bayrağında hangi şekiller vardır?', options: ['Yıldız ve ay', 'Güneş', 'Kartal', 'Aslan'], correctIndex: 0, explanation: 'Ay yıldız bulunur.' },
];

/** Kategoriye göre (yoksa genel) `count` adet soru döndürür. */
export function fallbackQuestions(category: string, count: number): QuizQuestion[] {
  const pool = [...(BANK[category] ?? []), ...GENERIC];
  // Basit karıştırma (deterministik olması gerekmez).
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Yeterli değilse tekrar ederek doldur.
  const out: QuizQuestion[] = [];
  let i = 0;
  while (out.length < count && shuffled.length > 0) {
    out.push(shuffled[i % shuffled.length]);
    i++;
    if (i > count * 3) break;
  }
  return out.slice(0, count);
}
