import type {
  BoardObjectKind,
  IntruderAttackCard,
  IntruderAttackerType,
  IntruderAttackEffect,
  IntruderToken,
  IntruderType,
  SanitizedGameState,
  SanitizedIntruderBag,
  WeaknessCard,
} from '@nemesis/shared';
import { INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import { HIVE_DEFINITION_ID, HIVE_EGGS_CAPACITY, INTRUDER_NAMES_RU } from '../board/intruderReference';
import { formatGameLogEntry, roomLabel, type GameLogSegment } from '../log/gameLogModel';
import { TYPE_ORDER } from '../board/intruderMapModel';

/**
 * Модель Планшета Чужих (Шаг 2 плана `doc/intruder-board-ui.md`).
 *
 * Чистая агрегация `SanitizedGameState` в снапшот для UI: составы Пула,
 * вероятности Развития Улья, кладка, Слабости, «анатомия» колоды Атак,
 * миниатюры на борту, хроника. Только ПУБЛИЧНАЯ информация: порядок жетонов
 * в мешке, обороты жетонов и будущие грани кубиков сюда не попадают.
 * Компоненты только рендерят снапшот — логики в них нет.
 */

const ALL_TOKEN_TYPES = Object.keys(TYPE_ORDER) as IntruderType[];

/** Порядок типов для строк-фишек: от Пустого к Королеве (как на карте). */
const BAG_TYPE_ORDER: Array<IntruderToken['type']> = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN', 'BLANK'];

/** Сколько карт лицевого сброса модель отдаёт для веера. */
export const ATTACK_DISCARD_FAN_SIZE = 8;

/** Сколько записей хроники модель отдаёт. */
export const CHRONICLE_SIZE = 12;

export interface IntruderDrawChance {
  type: IntruderToken['type'];
  count: number;
  /** 0..100; сумма по списку — ровно 100 (метод наибольших остатков). */
  percent: number;
}

export interface IntruderAttackAnatomy {
  /** Карты, которые ещё могут выйти (полный состав минус видимый сброс). */
  remainingCount: number;
  totalCount: number;
  byAttackerType: Record<IntruderAttackerType, number>;
  byEffect: Record<IntruderAttackEffect, number>;
}

export interface IntruderBoardTokenRow {
  id: string;
  type: IntruderType;
  typeName: string;
  wounds: number;
  /** Честная оценка переживаемости проверки Стойкости (стр. 20). */
  survivalLabel: string;
  /** Атака подавлена эффектом (Огнетушитель, Зов): `attackSuppression`. */
  suppressed: boolean;
  suppressedRound: number | null;
}

export interface IntruderBoardRoomRow {
  roomId: number;
  roomLabel: string;
  /** В отсеке Персонаж и Чужой — идёт Бой (стр. 18). */
  inCombat: boolean;
  onFire: boolean;
  tokens: IntruderBoardTokenRow[];
}

export type IntruderChronicleKind =
  | 'CONTACT'
  | 'SURPRISE'
  | 'HIVE'
  | 'FIRE'
  | 'EGG_LOST'
  | 'KILL'
  | 'RETREAT';

export interface IntruderChronicleEntry {
  sequence: number;
  kind: IntruderChronicleKind;
  tokenType: IntruderToken['type'] | null;
  /** Плоский текст (aria-подпись, тесты). */
  text: string;
  /** Сегменты с тональностью — рендерятся в цветах Журнала. */
  segments: GameLogSegment[];
}

/** Фильтр списка «На борту». */
export type BoardFilter = 'ALL' | 'COMBAT' | 'NEAR';

export interface IntruderWeaknessSlotRow {
  objectKind: BoardObjectKind;
  visibility: 'EMPTY' | 'FACE_DOWN' | 'REVEALED';
  card: WeaknessCard | null;
}

export interface IntruderBoardModel {
  bagByType: SanitizedIntruderBag;
  bagTotal: number;
  /** Только типы с count > 0, в порядке показа; сумма percent = 100 (или 0 при пустом мешке). */
  drawChances: IntruderDrawChance[];
  supplyByType: SanitizedIntruderBag;
  /** Жетоны, вышедшие из игры (`deadTokens`), по типам. */
  boxByType: Record<IntruderType, number>;
  eggsOnBoard: number;
  firstEncounterOccurred: boolean;
  weaknesses: IntruderWeaknessSlotRow[];
  attackDeckCount: number;
  attackDiscardCount: number;
  /** Лицевой сброс для веера: до `ATTACK_DISCARD_FAN_SIZE` карт, верх — последняя. */
  attackDiscardTop: IntruderAttackCard[];
  anatomy: IntruderAttackAnatomy;
  boardByRoom: IntruderBoardRoomRow[];
  boardTotal: number;
  /** Улей (definitionId `NEST`); roomId null — тайл ещё не открыт. */
  hive: { roomId: number | null; explored: boolean; playersInside: number; intrudersInside: number };
  chronicle: IntruderChronicleEntry[];
  counters: {
    contacts: number;
    killed: Record<IntruderType, number>;
    eggsAdded: number;
    eggsDestroyed: number;
  };
}

const INTRUDER_ATTACK_EFFECTS: IntruderAttackEffect[] = [
  'SCRATCH',
  'BITE',
  'CLAW_ATTACK',
  'TAIL_ATTACK',
  'TRANSFORMATION',
  'FRENZY',
  'SLIME',
  'CALL',
];

const INTRUDER_ATTACKER_TYPES: IntruderAttackerType[] = ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'];

/**
 * Честная оценка переживаемости проверки Стойкости (стр. 20):
 * - Личинка гибнет от 1 Раны без карты;
 * - Крипер/Взрослая: сумма = число на 1 карте Атаки, стойкости карт 2..6;
 * - Трутень/Королева: сумма чисел 2 карт, минимум 4, максимум 12.
 */
export function intruderSurvivalLabel(type: IntruderType, wounds: number): string {
  switch (type) {
    case 'LARVA':
      return wounds === 0 ? 'Гибнет от 1 Раны' : 'Убита';
    case 'CREEPER':
    case 'ADULT':
      if (wounds <= 1) return 'Ран мало — проверка не убьёт';
      if (wounds >= 6) return 'Проверка убьёт';
      return 'Проверка может убить';
    case 'BREEDER':
    case 'QUEEN':
      if (wounds <= 3) return 'Ран мало — проверка не убьёт';
      if (wounds >= 12) return 'Проверка убьёт';
      return 'Проверка может убить';
  }
}

/** Метод наибольших остатков: проценты — целые, сумма ровно 100. */
export function largestRemainderPercent(counts: Array<{ type: IntruderToken['type']; count: number }>): IntruderDrawChance[] {
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) return counts.map((entry) => ({ ...entry, percent: 0 }));

  const rows = counts.map((entry) => {
    const exact = (entry.count * 100) / total;
    const percent = Math.floor(exact);
    return { type: entry.type, count: entry.count, percent, remainder: exact - percent };
  });

  let distributed = rows.reduce((sum, row) => sum + row.percent, 0);
  const byRemainder = rows
    .map((_, index) => index)
    .sort((left, right) => rows[right]!.remainder - rows[left]!.remainder || rows[right]!.count - rows[left]!.count || left - right);

  let cursor = 0;
  while (distributed < 100) {
    rows[byRemainder[cursor % byRemainder.length]!]!.percent += 1;
    distributed += 1;
    cursor += 1;
  }
  return rows.map(({ type, count, percent }) => ({ type, count, percent }));
}

/** «Анатомия угрозы»: полный состав колоды Атак минус видимый сброс по id. */
export function buildAttackAnatomy(discardedIds: ReadonlySet<string>): IntruderAttackAnatomy {
  const remaining = INTRUDER_ATTACK_CARDS.filter((card) => !discardedIds.has(card.id));
  const byAttackerType = Object.fromEntries(INTRUDER_ATTACKER_TYPES.map((type) => [type, 0])) as Record<IntruderAttackerType, number>;
  const byEffect = Object.fromEntries(INTRUDER_ATTACK_EFFECTS.map((effect) => [effect, 0])) as Record<IntruderAttackEffect, number>;
  for (const card of remaining) {
    for (const attacker of card.attackerTypes) byAttackerType[attacker] += 1;
    byEffect[card.effect] += 1;
  }
  return {
    remainingCount: remaining.length,
    totalCount: INTRUDER_ATTACK_CARDS.length,
    byAttackerType,
    byEffect,
  };
}

/**
 * Отсеки в заданном числе шагов от стартового (включая стартовый, шаг 0).
 * BFS только через коридоры с целой или разрушенной дверью: закрытая дверь
 * непроходима до открытия.
 */
export function roomsWithinDistance(view: SanitizedGameState, fromRoomId: number, maxSteps: number): Set<number> {
  const result = new Set<number>([fromRoomId]);
  let frontier = [fromRoomId];
  for (let step = 0; step < maxSteps; step += 1) {
    const next: number[] = [];
    for (const roomId of frontier) {
      for (const corridor of Object.values(view.ship.corridors)) {
        if (corridor.doorState === 'CLOSED') continue;
        let other: number | null = null;
        if (corridor.fromRoomId === roomId) other = corridor.toRoomId;
        else if (corridor.toRoomId === roomId) other = corridor.fromRoomId;
        if (other === null || result.has(other)) continue;
        result.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  return result;
}

/** Что изменилось в улье между двумя просмотрами (для дельта-подсветок). */
export interface BoardChangeDelta {
  bagChanged: boolean;
  eggsChanged: boolean;
  boardChanged: boolean;
  /** На борту появилась Королева. */
  queenArrived: boolean;
  attackDeckChanged: boolean;
  weaknessesRevealed: boolean;
  firstEncounterHappened: boolean;
}

/** Дельта между снапшотами-«до» и «после» (ключи из boardChangeKeyData). */
export function boardChangeDelta(before: IntruderBoardModel, after: IntruderBoardModel): BoardChangeDelta {
  const queenArrived =
    !before.boardByRoom.some((row) => row.tokens.some((token) => token.type === 'QUEEN')) &&
    after.boardByRoom.some((row) => row.tokens.some((token) => token.type === 'QUEEN'));
  return {
    bagChanged: bagSignature(before) !== bagSignature(after),
    eggsChanged: before.eggsOnBoard !== after.eggsOnBoard,
    boardChanged:
      boardSignature(before) !== boardSignature(after) || before.boardTotal !== after.boardTotal,
    queenArrived,
    attackDeckChanged: before.attackDeckCount !== after.attackDeckCount || before.attackDiscardCount !== after.attackDiscardCount,
    weaknessesRevealed: weaknessesSignature(before) !== weaknessesSignature(after),
    firstEncounterHappened: !before.firstEncounterOccurred && after.firstEncounterOccurred,
  };
}

function bagSignature(model: IntruderBoardModel): string {
  return BAG_TYPE_ORDER.map((type) => `${type}:${model.bagByType[type]}`).join(',');
}

function boardSignature(model: IntruderBoardModel): string {
  return model.boardByRoom
    .map((room) => `${room.roomId}:${room.tokens.map((token) => `${token.type[0]}${token.wounds}`).join('')}`)
    .join('|');
}

function weaknessesSignature(model: IntruderBoardModel): string {
  return model.weaknesses.map((slot) => slot.visibility[0]).join('');
}

/** Ключ-снапшот агрегатов: дельта-подсветки и янтарная точка на кнопке HUD. */
export function boardChangeKey(model: IntruderBoardModel): string {
  const bag = BAG_TYPE_ORDER.map((type) => `${type}:${model.bagByType[type]}`).join(',');
  const supply = BAG_TYPE_ORDER.map((type) => `${type}:${model.supplyByType[type]}`).join(',');
  const board = model.boardByRoom
    .map((room) => `${room.roomId}:${room.tokens.map((token) => `${token.type[0]}${token.wounds}`).join('')}`)
    .join('|');
  const weaknesses = model.weaknesses.map((slot) => slot.visibility[0]).join('');
  return [
    bag,
    supply,
    `e${model.eggsOnBoard}`,
    `b${model.boardTotal}`,
    board,
    `d${model.attackDeckCount}/${model.attackDiscardCount}`,
    `w${weaknesses}`,
    `f${model.firstEncounterOccurred ? 1 : 0}`,
  ].join(';');
}

/** Собирает полный снапшот Планшета Чужих из sanitized-состояния партии. */
export function buildIntruderBoardModel(view: SanitizedGameState): IntruderBoardModel {
  const pool = view.intrudersPool;

  // --- Пул: мешок, запас, коробка ---
  const bagByType: SanitizedIntruderBag = { ...pool.bag };
  const supplyByType: SanitizedIntruderBag = { ...pool.supply };
  const boxByType = Object.fromEntries(ALL_TOKEN_TYPES.map((type) => [type, 0])) as Record<IntruderType, number>;
  for (const token of pool.deadTokens) {
    if (token.type !== 'BLANK') boxByType[token.type] += 1;
  }
  const bagTotal = BAG_TYPE_ORDER.reduce((sum, type) => sum + (bagByType[type] ?? 0), 0);
  const drawChances = largestRemainderPercent(
    BAG_TYPE_ORDER.map((type) => ({ type, count: bagByType[type] ?? 0 })).filter((entry) => entry.count > 0),
  );

  // --- Миниатюры на борту ---
  const combatRoomIds = new Set<number>();
  for (const room of Object.values(view.ship.rooms)) {
    const alivePlayers = room.occupantPlayerIds.filter((id) => !view.players[id]?.isDead);
    if (alivePlayers.length > 0 && room.occupantIntruderIds.length > 0) combatRoomIds.add(room.id);
  }

  const boardRows = new Map<number, IntruderBoardRoomRow>();
  for (const token of pool.boardTokens) {
    const room = view.ship.rooms[token.roomId];
    let row = boardRows.get(token.roomId);
    if (!row) {
      row = {
        roomId: token.roomId,
        roomLabel: roomLabel(view, token.roomId),
        inCombat: combatRoomIds.has(token.roomId),
        onFire: room?.hasFire === true,
        tokens: [],
      };
      boardRows.set(token.roomId, row);
    }
    const suppression = pool.attackSuppression[token.id];
    row.tokens.push({
      id: token.id,
      type: token.type,
      typeName: INTRUDER_NAMES_RU[token.type],
      wounds: token.woundsCount,
      survivalLabel: intruderSurvivalLabel(token.type, token.woundsCount),
      suppressed: suppression !== undefined,
      suppressedRound: suppression ? suppression.round : null,
    });
  }
  for (const row of boardRows.values()) {
    row.tokens.sort((left, right) => TYPE_ORDER[left.type] - TYPE_ORDER[right.type]);
  }
  const boardByRoom = [...boardRows.values()].sort((left, right) => left.roomId - right.roomId);
  const boardTotal = pool.boardTokens.length;

  // --- Улей ---
  const hiveRoom = Object.values(view.ship.rooms).find((room) => room.definitionId === HIVE_DEFINITION_ID);
  const hive = {
    roomId: hiveRoom ? hiveRoom.id : null,
    explored: hiveRoom?.isExplored ?? false,
    playersInside: hiveRoom ? hiveRoom.occupantPlayerIds.filter((id) => !view.players[id]?.isDead).length : 0,
    intrudersInside: hiveRoom?.occupantIntruderIds.length ?? 0,
  };

  // --- Колода Атак ---
  const discardedIds = new Set(view.decks.intruderAttacks.discard.map((card) => card.id));
  const anatomy = buildAttackAnatomy(discardedIds);

  // --- Хроника и счётчики из публичного журнала ---
  const killed = Object.fromEntries(ALL_TOKEN_TYPES.map((type) => [type, 0])) as Record<IntruderType, number>;
  const chronicle: IntruderChronicleEntry[] = [];
  let contacts = 0;
  let eggsAdded = 0;
  let eggsDestroyed = 0;

  for (const entry of view.gameLog) {
    const event = entry.event;
    switch (event.type) {
      case 'CONTACT_OCCURRED':
        contacts += 1;
        chronicle.push(toChronicle(entry.sequence, 'CONTACT', event.tokenType, entry, view));
        break;
      case 'FIRST_CONTACT':
        chronicle.push(toChronicle(entry.sequence, 'CONTACT', null, entry, view));
        break;
      case 'SURPRISE_ATTACK_RESOLVED':
        chronicle.push(toChronicle(entry.sequence, 'SURPRISE', event.intruderType, entry, view));
        break;
      case 'HIVE_DEVELOPMENT_RESOLVED':
        chronicle.push(toChronicle(entry.sequence, 'HIVE', event.tokenType, entry, view));
        if (event.outcome.kind === 'QUEEN' && event.outcome.eggAdded) eggsAdded += 1;
        break;
      case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
        chronicle.push(toChronicle(entry.sequence, 'FIRE', event.intruderType, entry, view));
        break;
      case 'EGG_DESTROYED_BY_FIRE':
        eggsDestroyed += 1;
        chronicle.push(toChronicle(entry.sequence, 'EGG_LOST', null, entry, view));
        break;
      case 'INTRUDER_KILLED':
        killed[event.targetType] += 1;
        chronicle.push(toChronicle(entry.sequence, 'KILL', event.targetType, entry, view));
        break;
      case 'INTRUDER_RETREATED':
        chronicle.push(toChronicle(entry.sequence, 'RETREAT', event.intruderType, entry, view));
        break;
      default:
        break;
    }
  }

  return {
    bagByType,
    bagTotal,
    drawChances,
    supplyByType,
    boxByType,
    eggsOnBoard: pool.eggsOnBoard,
    firstEncounterOccurred: pool.firstEncounterOccurred,
    weaknesses: pool.weaknessSlots.map((slot) => ({
      objectKind: slot.objectKind,
      visibility: slot.visibility,
      card: slot.visibility === 'REVEALED' ? slot.card : null,
    })),
    attackDeckCount: view.decks.intruderAttacks.drawPileCount,
    attackDiscardCount: view.decks.intruderAttacks.discard.length,
    attackDiscardTop: view.decks.intruderAttacks.discard.slice(-ATTACK_DISCARD_FAN_SIZE).reverse(),
    anatomy,
    boardByRoom,
    boardTotal,
    hive,
    chronicle: chronicle.slice(-CHRONICLE_SIZE),
    counters: { contacts, killed, eggsAdded, eggsDestroyed },
  };
}

function toChronicle(
  sequence: number,
  kind: IntruderChronicleKind,
  tokenType: IntruderToken['type'] | null,
  entry: Parameters<typeof formatGameLogEntry>[0],
  view: SanitizedGameState,
): IntruderChronicleEntry {
  const formatted = formatGameLogEntry(entry, view);
  return {
    sequence,
    kind,
    tokenType,
    text: formatted.segments.map((segment) => segment.text).join(''),
    segments: formatted.segments,
  };
}

/** Отсек активного Персонажа — точка отсчёта фильтра «Рядом со мной». */
export function myRoomId(view: SanitizedGameState): number {
  return view.players[view.meta.activePlayerId]!.roomId;
}

/**
 * Список отсеков «На борту» по фильтру:
 * - ALL — все с миниатюрами;
 * - COMBAT — только отсеки в Бою;
 * - NEAR — отсеки в двух шагах от активного Персонажа по открытым коридорам
 *   (закрытые двери считаются непроходимыми, `roomsWithinDistance`).
 */
export function filterBoardRooms(
  model: IntruderBoardModel,
  view: SanitizedGameState,
  filter: BoardFilter,
): IntruderBoardRoomRow[] {
  switch (filter) {
    case 'ALL':
      return model.boardByRoom;
    case 'COMBAT':
      return model.boardByRoom.filter((row) => row.inCombat);
    case 'NEAR': {
      const near = roomsWithinDistance(view, myRoomId(view), 2);
      return model.boardByRoom.filter((row) => near.has(row.roomId));
    }
  }
}

/** Вместимость кладки — реэкспорт для компонентов планшета. */
export { HIVE_EGGS_CAPACITY };
