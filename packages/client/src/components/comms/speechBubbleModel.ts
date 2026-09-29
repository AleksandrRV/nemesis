import type { CommsMessage, SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { messageText } from './commsPhrases';

export const BUBBLE_LIFETIME_MS = 5200;
const MAX_BUBBLE_CHARS = 34;
const CHAR_WIDTH = 8.4;

export interface MapBubble {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
}

function shorten(text: string): string {
  return text.length > MAX_BUBBLE_CHARS ? `${text.slice(0, MAX_BUBBLE_CHARS - 1)}…` : text;
}

/** Пузыри реплик (В8-4-5): свежие сообщения над Комнатой автора, по одному ярусу на реплику. */
export function mapBubbles(
  view: SanitizedGameState,
  messages: readonly CommsMessage[],
  coords: ReadonlyMap<number, { x: number; y: number }>,
): MapBubble[] {
  const tiers = new Map<string, number>();
  return messages.flatMap((message) => {
    if (message.authorId === null) return [];
    const author = view.players[message.authorId];
    const coord = author ? coords.get(author.roomId) : undefined;
    if (!author || !coord || author.isDead || author.hasEscapedInPod) return [];
    const tier = tiers.get(author.id) ?? 0;
    tiers.set(author.id, tier + 1);
    const text = shorten(messageText(view, message));
    return [
      {
        id: message.id,
        x: coord.x,
        y: coord.y - 58 - tier * 38,
        text,
        color: CREW_IDENTITIES[author.characterClass].color,
        width: Math.min(310, Math.max(90, text.length * CHAR_WIDTH + 26)),
      },
    ];
  });
}
