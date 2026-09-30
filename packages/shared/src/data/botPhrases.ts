/**
 * Банк фраз ботов (план 0.8.0, В8-8-2): интонация, в которую бот оборачивает сообщение Рации.
 * Смысл сообщения задают его поля; фраза — только подача, `{text}` — стандартный текст сообщения.
 * Тексты — цифровой контент проекта, а не материалы оригинала: в книге правил Рации нет (Р-9).
 */

export const PHRASE_TONES = ['CALM', 'NERVOUS', 'CURT', 'WARM', 'COLD', 'BOASTFUL'] as const;
export type PhraseTone = (typeof PHRASE_TONES)[number];

export type PhraseKind = 'CLAIM' | 'INTENT' | 'REQUEST';

export interface BotPhrase {
  id: string;
  kind: PhraseKind;
  tone: PhraseTone;
  template: string;
}

export const PHRASE_TEXT_SLOT = '{text}';

const PHRASE_TEMPLATES: Record<PhraseKind, Record<PhraseTone, readonly string[]>> = {
  CLAIM: {
    CALM: ['Проверил сам. {text}', 'Для общего сведения: {text}'],
    NERVOUS: ['Слушайте все! {text}', 'Я своими глазами видел… {text}'],
    CURT: ['{text} Проверено.', 'Коротко: {text}'],
    WARM: ['Делюсь, чтобы всем было проще. {text}', 'Держите в курсе, экипаж: {text}'],
    COLD: ['{text} Выводы делайте сами.', 'Информация: {text}'],
    BOASTFUL: ['Как всегда, всё проверил я. {text}', 'Можете не благодарить. {text}'],
  },
  INTENT: {
    CALM: ['План такой. {text}', 'Сообщаю маршрут. {text}'],
    NERVOUS: ['Я… я пошёл. {text}', 'Не бросайте меня. {text}'],
    CURT: ['{text}', 'Выдвигаюсь. {text}'],
    WARM: ['Не теряйте меня, экипаж. {text}', 'Если что — я на связи. {text}'],
    COLD: ['{text} Не мешайте.', 'К сведению. {text}'],
    BOASTFUL: ['Держитесь за мной. {text}', 'Этим займусь я. {text}'],
  },
  REQUEST: {
    CALM: ['{text} Если сможете.', 'Прошу помощи. {text}'],
    NERVOUS: ['Помогите! {text}', 'Скорее, пожалуйста! {text}'],
    CURT: ['{text} Срочно.', '{text} Жду.'],
    WARM: ['Выручите, друзья. {text}', 'Буду благодарен. {text}'],
    COLD: ['{text} Это в ваших интересах.', 'Требуется. {text}'],
    BOASTFUL: ['Справлюсь и сам, но вдвоём быстрее. {text}', 'Окажите честь помочь. {text}'],
  },
};

export const BOT_PHRASES: readonly BotPhrase[] = (Object.keys(PHRASE_TEMPLATES) as PhraseKind[]).flatMap((kind) =>
  PHRASE_TONES.flatMap((tone) =>
    PHRASE_TEMPLATES[kind][tone].map((template, index) => ({
      id: `${kind}_${tone}_${index + 1}`,
      kind,
      tone,
      template,
    })),
  ),
);

export function botPhraseById(phraseId: string): BotPhrase | undefined {
  return BOT_PHRASES.find((phrase) => phrase.id === phraseId);
}

export function phrasesFor(kind: PhraseKind, tone: PhraseTone): BotPhrase[] {
  return BOT_PHRASES.filter((phrase) => phrase.kind === kind && phrase.tone === tone);
}

/** Текст сообщения в интонации фразы; без фразы — стандартный текст. */
export function voicedText(phraseId: string | undefined, text: string): string {
  const phrase = phraseId === undefined ? undefined : botPhraseById(phraseId);
  return phrase ? phrase.template.replace(PHRASE_TEXT_SLOT, text) : text;
}
