import type { RoomAbilityPayload } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { EngineError, type EngineErrorCode } from './engineErrors.js';

export type StudyObjectKind = NonNullable<RoomAbilityPayload['targetObjectKind']>;

export function studyWeakness(
  state: GameState,
  actorId: string,
  targetKind: StudyObjectKind | undefined,
  refusalCode: EngineErrorCode,
): string {
  if (!targetKind) {
    throw new EngineError(refusalCode, 'Не указан тип объекта для изучения: Труп, Останки или Яйцо (стр. 16).');
  }
  const weaknessSlot = state.intrudersPool.weaknessSlots.find((slot) => slot.objectKind === targetKind);
  if (!weaknessSlot?.card) {
    throw new EngineError(refusalCode, 'В этом слоте Планшета Чужих нет карты Слабости.');
  }
  if (weaknessSlot.card.isRevealed) {
    throw new EngineError(
      'WEAKNESS_ALREADY_REVEALED',
      `Слабость «${weaknessSlot.card.name}» уже изучена — раскрывать больше нечего (стр. 21).`,
    );
  }
  const room = state.ship.rooms[state.players[actorId]!.roomId]!;
  const onFloor = room.objects.some((object) => object.kind === targetKind);
  const inHands = room.occupantPlayerIds.some((occupantId) =>
    state.players[occupantId]!.handSlots.some((slot) => slot.source === 'OBJECT' && slot.object.kind === targetKind),
  );
  if (!onFloor && !inHands) {
    throw new EngineError(
      refusalCode,
      `В Комнате нет объекта типа ${targetKind} ни на полу, ни в руках Персонажей (стр. 16).`,
    );
  }
  weaknessSlot.card.isRevealed = true;
  return weaknessSlot.card.name;
}

export function dropHeldObject(state: GameState, actorId: string, kind: StudyObjectKind): void {
  const player = state.players[actorId]!;
  const slotIndex = player.handSlots.findIndex((slot) => slot.source === 'OBJECT' && slot.object.kind === kind);
  if (slotIndex === -1) return;
  const [dropped] = player.handSlots.splice(slotIndex, 1);
  if (dropped?.source === 'OBJECT') state.ship.rooms[player.roomId]!.objects.push(dropped.object);
}
