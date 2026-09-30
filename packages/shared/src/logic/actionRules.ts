import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import type { BoardObject, EscapePodState, HandSlotContent } from '../types/entities.js';
import type { CarefulMoveChosenCorridor, CorridorConnection } from '../types/rooms.js';
import type { CourseMarker } from '../types/state.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import { HIBERNATION_OPENS_AT_TIME, podSectionOfRoom } from '../data/evacuation.js';
import type { EngineErrorCode } from './engineErrors.js';
import { hasFreeHandSlot } from './seriousWoundEffects.js';
import { corridorNumbersOf, corridorsLeadingInto, roomHasTechnicalEntrance } from './shipGraphQueries.js';

/**
 * Условия допустимости Действий (план 0.8.0, В8-7-1) над публичными полями: их читают и движок, и боты
 * по своему срезу, поэтому допустимость у них не расходится. Отказ — код и причина, а не исключение:
 * движок превращает его в `EngineError`, бот просто не предлагает такое Действие.
 */
export interface RuleBlock {
  code: EngineErrorCode;
  message: string;
}

export interface RulesRoom {
  id: number;
  definitionId: string | null;
  isExplored: boolean;
  itemsCount: number | null;
  hasMalfunction: boolean | null;
  occupantIntruderIds: readonly string[];
  objects: readonly BoardObject[];
}

export interface RulesPlayer {
  roomId: number;
  isDead: boolean;
  isInHibernation: boolean;
  hasEscapedInPod: boolean;
  handSlots: readonly HandSlotContent[];
  seriousWounds: Parameters<typeof hasFreeHandSlot>[0]['seriousWounds'];
}

export interface RulesView {
  ship: { rooms: Record<number, RulesRoom | undefined> };
  players: Record<string, RulesPlayer | undefined>;
}

function block(code: EngineErrorCode, message: string): RuleBlock {
  return { code, message };
}

const ALL_ROOM_DEFINITIONS = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

export function getRoomDeckColor(definitionId: string | null): ItemDeckColor | 'WHITE' | null {
  const color = ALL_ROOM_DEFINITIONS.find((definition) => definition.id === definitionId)?.color;
  return color === undefined || color === 'NONE' ? null : color;
}

/** Бой (стр. 18): Персонаж и Чужой в одной Комнате. */
export function isRoomInCombat(view: RulesView, roomId: number): boolean {
  return (view.ship.rooms[roomId]?.occupantIntruderIds.length ?? 0) > 0;
}

export function isPlayerInCombat(view: RulesView, playerId: string): boolean {
  const player = view.players[playerId];
  if (!player || player.isDead || player.isInHibernation || player.hasEscapedInPod) return false;
  return isRoomInCombat(view, player.roomId);
}

/** Картой Заражения платить нельзя (стр. 20): у карты Действия есть класс Персонажа. */
export function isPaymentCard(card: object): boolean {
  return 'characterClass' in card;
}

export function searchBlock(room: RulesRoom, inCombat: boolean): RuleBlock | null {
  if (!room.isExplored) return block('SEARCH_NOT_ALLOWED', 'Нельзя искать в неисследованном отсеке (стр. 14)');
  if (room.definitionId === 'NEST' || room.definitionId === 'SLIME_ROOM') {
    return block('SEARCH_NOT_ALLOWED', `Поиск в этом отсеке запрещён правилами (${room.definitionId})`);
  }
  if ((room.itemsCount ?? 0) <= 0) {
    return block('NO_ITEMS_LEFT', 'В отсеке не осталось предметов для поиска (счётчик = 0)');
  }
  if (inCombat) return block('SEARCH_IN_COMBAT', 'Поиск запрещён, пока в отсеке находятся Чужие (стр. 18).');
  if (!getRoomDeckColor(room.definitionId)) {
    return block('SEARCH_NOT_ALLOWED', 'У этой Комнаты нет цвета — Поиск в ней невозможен (стр. 26).');
  }
  return null;
}

export function roomAbilityBlock(room: RulesRoom, inCombat: boolean): RuleBlock | null {
  if (!room.isExplored) return block('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать неисследованный отсек');
  if (room.hasMalfunction) {
    return block('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать неисправный отсек (требуется починка)');
  }
  if (inCombat) return block('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать отсек в Бою с Чужими (стр. 18).');
  return null;
}

export function pickUpBlock(player: RulesPlayer, room: RulesRoom, objectId: string): RuleBlock | null {
  if (!hasFreeHandSlot(player)) {
    return block('HAND_SLOTS_FULL', 'Свободного слота Руки нет — некуда положить Тяжёлый объект (стр. 22).');
  }
  if (!room.objects.some((object) => object.id === objectId)) {
    return block('OBJECT_NOT_AVAILABLE', `Такого Тяжёлого объекта нет в отсеке №${room.id} (стр. 22).`);
  }
  return null;
}

/** Стрельба и Рукопашная (стр. 12, 19): только в Бою и только по Чужим своего отсека. */
export function attackBlock(
  kind: 'SHOOT' | 'MELEE',
  inCombat: boolean,
  attackerRoomId: number,
  targetRoomId: number | null,
): RuleBlock | null {
  if (!inCombat) {
    return kind === 'SHOOT'
      ? block('SHOOT_NOT_IN_COMBAT', '«Стрельба» выполняется, только когда Персонаж находится в Бою (стр. 12, 19).')
      : block(
          'MELEE_NOT_IN_COMBAT',
          '«Рукопашная атака» выполняется, только когда Персонаж находится в Бою (стр. 12, 19).',
        );
  }
  if (targetRoomId !== attackerRoomId) {
    return kind === 'SHOOT'
      ? block('INVALID_ATTACK_TARGET', 'Стрелять можно только в Чужих из собственного отсека (стр. 19).')
      : block('INVALID_ATTACK_TARGET', 'Атаковать рукопашной можно только Чужих из собственного отсека (стр. 19).');
  }
  return null;
}

export type RuleResult<Value> = { value: Value; block: null } | { value: null; block: RuleBlock };

export type LoadedWeapon = ItemCard & { ammo: number };

/** Оружие для Стрельбы (стр. 19): занимает слот Руки и заряжено хотя бы на 1 ед. Боезапаса. */
export function loadedHandWeapon(
  player: Pick<RulesPlayer, 'handSlots'>,
  weaponItemId: string,
): RuleResult<LoadedWeapon> {
  const slot = player.handSlots.find((candidate) => candidate.source === 'ITEM' && candidate.card.id === weaponItemId);
  const weapon = slot?.source === 'ITEM' ? slot.card : null;
  if (!weapon || !weapon.isWeapon) {
    return {
      value: null,
      block: block('WEAPON_NOT_AVAILABLE', 'Выбранная карта не занимает слот Руки или не является Оружием (стр. 19).'),
    };
  }
  if (weapon.ammo === null || weapon.ammo < 1) {
    return { value: null, block: block('WEAPON_NO_AMMO', `На «${weapon.name}» не осталось Боезапаса (стр. 19).`) };
  }
  return { value: weapon as LoadedWeapon, block: null };
}

export function isHibernationOpen(timeTrackPosition: number): boolean {
  return timeTrackPosition >= HIBERNATION_OPENS_AT_TIME;
}

export function hibernationBlock(timeTrackPosition: number, room: RulesRoom): RuleBlock | null {
  if (!isHibernationOpen(timeTrackPosition)) {
    return block(
      'ROOM_ABILITY_NOT_ALLOWED',
      'Камеры Анабиоза закрыты: они откроются, когда маркер Времени дойдёт до синих полей (стр. 11, 26).',
    );
  }
  if (room.occupantIntruderIds.length > 0) {
    return block('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя войти в Камеру Анабиоза, если в Криогенном отсеке есть Чужой.');
  }
  return null;
}

export function isPodUsable(pod: Pick<EscapePodState, 'isDestroyed' | 'isLaunched'>): boolean {
  return !pod.isDestroyed && pod.isLaunched !== true;
}

/** Капсулы отсека, в которые можно сесть (стр. 26): целы, не улетели, Разблокированы, есть место. */
export function boardablePods<Pod extends EscapePodState>(
  pods: Record<string, Pod>,
  definitionId: string | null,
): Pod[] {
  const section = podSectionOfRoom(definitionId);
  if (!section) return [];
  return Object.values(pods)
    .filter((pod) => pod.section === section && isPodUsable(pod) && !pod.isLocked && pod.occupantIds.length < 2)
    .sort((left, right) => left.number - right.number);
}

export function podBoardingBlock(
  room: RulesRoom,
  candidates: readonly EscapePodState[],
  podId: string | undefined,
): RuleBlock | null {
  if (!podSectionOfRoom(room.definitionId)) return block('ROOM_ABILITY_NOT_ALLOWED', 'Это не Спасательный отсек.');
  if (room.occupantIntruderIds.length > 0) {
    return block('ROOM_ABILITY_NOT_ALLOWED', 'В Спасательном отсеке Чужие — войти в Капсулу нельзя (стр. 26).');
  }
  const pod = podId ? candidates.find((entry) => entry.id === podId) : candidates[0];
  if (!pod) {
    return block(
      'ROOM_ABILITY_NOT_ALLOWED',
      podId
        ? 'Эта Капсула заблокирована, занята или уже улетела.'
        : 'В этом отсеке нет Разблокированной Капсулы со свободным местом.',
    );
  }
  return null;
}

export const COURSE_MARKERS: readonly CourseMarker[] = ['A', 'B', 'C', 'D'];

export function courseBlock(
  anyoneInHibernation: boolean,
  room: RulesRoom,
  currentMarker: CourseMarker,
  marker: CourseMarker | undefined,
): RuleBlock | null {
  if (!marker || !COURSE_MARKERS.includes(marker)) {
    return block('INVALID_DECISION_OPTION', 'Выберите Координаты A, B, C или D для маркера Курса.');
  }
  if (anyoneInHibernation) {
    return block('COURSE_CHANGE_FORBIDDEN', 'Курс нельзя изменить, пока кто-то из Персонажей в Анабиозе.');
  }
  if (room.occupantIntruderIds.length > 0) {
    return block('COURSE_CHANGE_FORBIDDEN', 'Курс нельзя Установить, если на Мостике есть Чужой.');
  }
  if (currentMarker === marker) {
    return block('INVALID_DECISION_OPTION', `Маркер Курса уже стоит на Координатах ${marker}.`);
  }
  return null;
}

export function isAnyoneInHibernation(view: { players: Record<string, RulesPlayer | undefined> }): boolean {
  return Object.values(view.players).some((player) => player?.isInHibernation === true && !player.isDead);
}

export interface CarefulMoveView {
  ship: { corridors: Record<string, CorridorConnection>; technicalCorridorNoise: boolean };
}

function chosenPlaceHasNoise(view: CarefulMoveView, chosen: CarefulMoveChosenCorridor, targetRoomId: number): boolean {
  if (chosen.kind === 'TECHNICAL_CORRIDOR') return view.ship.technicalCorridorNoise;
  if (chosen.kind === 'CORRIDOR_NUMBER') {
    const matching = corridorsLeadingInto(view, targetRoomId).filter((candidate) =>
      corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber),
    );
    return matching.length > 0 && matching.every((corridor) => corridor.hasNoise);
  }
  return view.ship.corridors[chosen.corridorId]?.hasNoise ?? true;
}

/** «Осторожное движение» [1] (стр. 13): вне Боя, маркер Шума — в свободный Коридор, ведущий в отсек назначения. */
export function carefulMoveBlock(
  view: CarefulMoveView,
  inCombat: boolean,
  targetRoomId: number,
  chosen: CarefulMoveChosenCorridor,
): RuleBlock | null {
  if (inCombat) {
    return block('CAREFUL_MOVE_IN_COMBAT', '«Осторожное движение» нельзя выполнять, находясь в Бою (стр. 13).');
  }
  const leading = corridorsLeadingInto(view, targetRoomId);
  if (chosen.kind === 'TECHNICAL_CORRIDOR') {
    if (!roomHasTechnicalEntrance(targetRoomId)) {
      return block(
        'CAREFUL_MOVE_BAD_CHOICE',
        `В отсеке ${targetRoomId} нет Входа в Технические Коридоры: туда нельзя положить маркер (стр. 16).`,
      );
    }
  } else if (chosen.kind === 'CORRIDOR_NUMBER') {
    if (!leading.some((candidate) => corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber))) {
      return block(
        'CAREFUL_MOVE_BAD_CHOICE',
        `Номер коридора ${chosen.corridorNumber} не ведет в отсек ${targetRoomId} (стр. 13).`,
      );
    }
  } else if (!leading.some((corridor) => corridor.id === chosen.corridorId)) {
    return block('CAREFUL_MOVE_BAD_CHOICE', `Коридор ${chosen.corridorId} не ведёт в отсек ${targetRoomId} (стр. 13).`);
  }
  const freeCorridor = leading.some((corridor) => !corridor.hasNoise);
  const freeTechnical = roomHasTechnicalEntrance(targetRoomId) && !view.ship.technicalCorridorNoise;
  if (!freeCorridor && !freeTechnical) {
    return block(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      `В каждом Коридоре, ведущем в отсек ${targetRoomId}, уже есть маркер Шума: «Осторожное движение» невозможно (стр. 13).`,
    );
  }
  if (chosenPlaceHasNoise(view, chosen, targetRoomId)) {
    return block(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      'Выбранный Коридор уже помечен маркером Шума: выберите другой (стр. 13).',
    );
  }
  return null;
}
