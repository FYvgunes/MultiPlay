import Anthropic from '@anthropic-ai/sdk';
import { fallbackQuestions } from './fallbackBank.js';

export interface QuizQuestion {
  text: string;
  options: string[]; // tam 4 şık
  correctIndex: number; // 0..3
  explanation: string;
}

export interface GenerateOptions {
  category: string; // Türkçe kategori adı (örn. "Tarih")
  kids: boolean; // çocuk modu
  difficulty: number; // 1..4 (yetişkin); kids ise yok sayılır
  count: number; // soru adedi
  seed: string; // tekrar önleme için değişken
}

const MODEL = 'claude-haiku-4-5';

// Sabit sistem promptu (cache'lenir). Değişkenler kullanıcı mesajında.
const SYSTEM = `Sen Türkçe bir aile bilgi yarışması için soru üreten bir uzmansın.
Görevin: verilen kategori ve seviyeye uygun, ÇOKTAN SEÇMELİ sorular üretmek.

Katı kurallar:
- Tüm metinler doğru ve akıcı TÜRKÇE olacak.
- Her sorunun TAM 4 şıkkı olacak ve SADECE BİRİ doğru olacak.
- "correctIndex" doğru şıkkın 0 tabanlı sırasıdır (0,1,2,3).
- Sorular nesnel ve doğrulanabilir olmalı; tartışmalı/yanlış bilgi olmamalı.
- Şıklar kısa, net ve birbirinden ayırt edilebilir olmalı. Doğru cevabın yeri rastgele dağılsın.
- "explanation" tek cümlelik kısa bir açıklama olacak.
- Aynı soruyu tekrar etme; çeşitlilik kat.

Çocuk modu (belirtilirse): 7-11 yaş çocuklara uygun, basit, eğitici, kısa sorular üret.
Yetişkin zorlukları: 1=Kolay, 2=Orta, 3=Zor, 4=Uzman (daha spesifik/derin bilgi).

Soruları SADECE "sorular_uret" aracını çağırarak döndür; başka metin yazma.`;

const SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Soru metni' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tam 4 şık',
          },
          correctIndex: {
            type: 'integer',
            enum: [0, 1, 2, 3],
            description: 'Doğru şıkkın 0 tabanlı sırası',
          },
          explanation: { type: 'string', description: 'Tek cümlelik açıklama' },
        },
        required: ['text', 'options', 'correctIndex', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

function validate(raw: unknown, count: number): QuizQuestion[] {
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(list)) return [];
  const ok: QuizQuestion[] = [];
  for (const q of list) {
    if (!q || typeof q !== 'object') continue;
    const { text, options, correctIndex, explanation } = q as Record<
      string,
      unknown
    >;
    if (typeof text !== 'string' || !text.trim()) continue;
    if (!Array.isArray(options) || options.length !== 4) continue;
    if (!options.every((o) => typeof o === 'string' && o.trim())) continue;
    if (
      typeof correctIndex !== 'number' ||
      correctIndex < 0 ||
      correctIndex > 3
    )
      continue;
    ok.push({
      text: text.trim(),
      options: (options as string[]).map((o) => o.trim()),
      correctIndex,
      explanation: typeof explanation === 'string' ? explanation.trim() : '',
    });
    if (ok.length >= count) break;
  }
  return ok;
}

/**
 * Kategoriye göre soru üretir. ANTHROPIC_API_KEY yoksa veya API hata verirse
 * yerleşik soru bankasına düşer (oyun her durumda çalışır).
 */
export async function generateQuestions(
  opts: GenerateOptions,
): Promise<QuizQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackQuestions(opts.category, opts.count);
  }

  try {
    const client = new Anthropic(); // ANTHROPIC_API_KEY ortamdan
    const userMsg = [
      `Kategori: ${opts.category}`,
      opts.kids ? 'Mod: ÇOCUK (7-11 yaş, basit ve eğitici)' : `Zorluk: ${opts.difficulty}`,
      `Adet: ${opts.count}`,
      `Çeşitlilik anahtarı: ${opts.seed} (önceki sorulardan farklı sorular üret)`,
    ].join('\n');

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      tools: [
        {
          name: 'sorular_uret',
          description: 'Üretilen çoktan seçmeli soruları döndürür.',
          input_schema: SCHEMA as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'sorular_uret' },
      messages: [{ role: 'user', content: userMsg }],
    });

    const block = res.content.find((b) => b.type === 'tool_use');
    const questions = validate(block?.input, opts.count);
    if (questions.length === 0) return fallbackQuestions(opts.category, opts.count);
    return questions;
  } catch (e) {
    console.error('AI soru üretimi başarısız, fallback bankası kullanılıyor:', e);
    return fallbackQuestions(opts.category, opts.count);
  }
}
