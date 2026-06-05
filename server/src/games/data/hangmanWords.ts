// Adam Asmaca kelime bankası: kategori + kelime (BÜYÜK Türkçe harflerle).
// Kelimeler boşluk içerebilir (çok kelimeli). Tümü gerçek ve doğru yazımlı.

export interface HangmanWord {
  category: string;
  word: string;
}

export const HANGMAN_WORDS: HangmanWord[] = [
  // ---- Hayvanlar ----
  { category: 'Hayvanlar', word: 'ASLAN' },
  { category: 'Hayvanlar', word: 'KAPLAN' },
  { category: 'Hayvanlar', word: 'ZÜRAFA' },
  { category: 'Hayvanlar', word: 'FİL' },
  { category: 'Hayvanlar', word: 'KELEBEK' },
  { category: 'Hayvanlar', word: 'KARTAL' },
  { category: 'Hayvanlar', word: 'PENGUEN' },
  { category: 'Hayvanlar', word: 'TİMSAH' },
  { category: 'Hayvanlar', word: 'KAPLUMBAĞA' },
  { category: 'Hayvanlar', word: 'YUNUS' },
  { category: 'Hayvanlar', word: 'TAVŞAN' },
  { category: 'Hayvanlar', word: 'KİRPİ' },

  // ---- Meyveler ----
  { category: 'Meyveler', word: 'ELMA' },
  { category: 'Meyveler', word: 'ÇİLEK' },
  { category: 'Meyveler', word: 'KARPUZ' },
  { category: 'Meyveler', word: 'KAYISI' },
  { category: 'Meyveler', word: 'ŞEFTALİ' },
  { category: 'Meyveler', word: 'KİRAZ' },
  { category: 'Meyveler', word: 'MUZ' },
  { category: 'Meyveler', word: 'ÜZÜM' },
  { category: 'Meyveler', word: 'NAR' },
  { category: 'Meyveler', word: 'PORTAKAL' },
  { category: 'Meyveler', word: 'AYVA' },
  { category: 'Meyveler', word: 'İNCİR' },

  // ---- Şehirler ----
  { category: 'Şehirler', word: 'İSTANBUL' },
  { category: 'Şehirler', word: 'ANKARA' },
  { category: 'Şehirler', word: 'İZMİR' },
  { category: 'Şehirler', word: 'BURSA' },
  { category: 'Şehirler', word: 'ANTALYA' },
  { category: 'Şehirler', word: 'TRABZON' },
  { category: 'Şehirler', word: 'GAZİANTEP' },
  { category: 'Şehirler', word: 'ESKİŞEHİR' },
  { category: 'Şehirler', word: 'DİYARBAKIR' },
  { category: 'Şehirler', word: 'KONYA' },
  { category: 'Şehirler', word: 'ÇANAKKALE' },
  { category: 'Şehirler', word: 'KAHRAMANMARAŞ' },

  // ---- Meslekler ----
  { category: 'Meslekler', word: 'DOKTOR' },
  { category: 'Meslekler', word: 'ÖĞRETMEN' },
  { category: 'Meslekler', word: 'MÜHENDİS' },
  { category: 'Meslekler', word: 'AVUKAT' },
  { category: 'Meslekler', word: 'HEMŞİRE' },
  { category: 'Meslekler', word: 'AŞÇI' },
  { category: 'Meslekler', word: 'PİLOT' },
  { category: 'Meslekler', word: 'BERBER' },
  { category: 'Meslekler', word: 'MARANGOZ' },
  { category: 'Meslekler', word: 'GAZETECİ' },
  { category: 'Meslekler', word: 'TERZİ' },
  { category: 'Meslekler', word: 'ÇİFTÇİ' },

  // ---- Eşyalar ----
  { category: 'Eşyalar', word: 'MASA' },
  { category: 'Eşyalar', word: 'SANDALYE' },
  { category: 'Eşyalar', word: 'BUZDOLABI' },
  { category: 'Eşyalar', word: 'TELEVİZYON' },
  { category: 'Eşyalar', word: 'BARDAK' },
  { category: 'Eşyalar', word: 'ÇAYDANLIK' },
  { category: 'Eşyalar', word: 'PERDE' },
  { category: 'Eşyalar', word: 'AYNA' },
  { category: 'Eşyalar', word: 'DOLAP' },
  { category: 'Eşyalar', word: 'YASTIK' },
  { category: 'Eşyalar', word: 'ŞEMSİYE' },
  { category: 'Eşyalar', word: 'TABAK' },

  // ---- Ülkeler ----
  { category: 'Ülkeler', word: 'TÜRKİYE' },
  { category: 'Ülkeler', word: 'ALMANYA' },
  { category: 'Ülkeler', word: 'FRANSA' },
  { category: 'Ülkeler', word: 'İTALYA' },
  { category: 'Ülkeler', word: 'JAPONYA' },
  { category: 'Ülkeler', word: 'BREZİLYA' },
  { category: 'Ülkeler', word: 'YUNANİSTAN' },
  { category: 'Ülkeler', word: 'İSPANYA' },
  { category: 'Ülkeler', word: 'MISIR' },
  { category: 'Ülkeler', word: 'HOLLANDA' },
  { category: 'Ülkeler', word: 'PORTEKİZ' },
  { category: 'Ülkeler', word: 'AZERBAYCAN' },

  // ---- Spor ----
  { category: 'Spor', word: 'FUTBOL' },
  { category: 'Spor', word: 'BASKETBOL' },
  { category: 'Spor', word: 'VOLEYBOL' },
  { category: 'Spor', word: 'YÜZME' },
  { category: 'Spor', word: 'TENİS' },
  { category: 'Spor', word: 'GÜREŞ' },
  { category: 'Spor', word: 'BOKS' },
  { category: 'Spor', word: 'KAYAK' },
  { category: 'Spor', word: 'BİNİCİLİK' },
  { category: 'Spor', word: 'HALTER' },
  { category: 'Spor', word: 'OKÇULUK' },
  { category: 'Spor', word: 'ESKRİM' },

  // ---- Doğa ----
  { category: 'Doğa', word: 'DENİZ' },
  { category: 'Doğa', word: 'ORMAN' },
  { category: 'Doğa', word: 'DAĞ' },
  { category: 'Doğa', word: 'NEHİR' },
  { category: 'Doğa', word: 'ŞELALE' },
  { category: 'Doğa', word: 'YAĞMUR' },
  { category: 'Doğa', word: 'GÖKKUŞAĞI' },
  { category: 'Doğa', word: 'BULUT' },
  { category: 'Doğa', word: 'YILDIZ' },
  { category: 'Doğa', word: 'VADİ' },
  { category: 'Doğa', word: 'ÇİÇEK' },
  { category: 'Doğa', word: 'RÜZGAR' },
];
