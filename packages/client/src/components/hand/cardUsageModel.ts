import type { ActionCard, ItemCard, ItemDeckColor, SanitizedGameState } from '@nemesis/shared';
import { getRoomDeckColor } from '@nemesis/shared';
import { playerName, roomLabel } from '../log/gameLogModel';

/**
 * Модель окна использования карты (карта Действия или Предмет).
 *
 * Для каждой карты возвращает варианты использования — ВСЕГДА хотя бы один —
 * с проверкой выполнимости в текущей позиции и понятной причиной отказа.
 * Клиентские проверки дублируют движок (`cardEffects.ts` / `classCombatCards.ts`):
 * кнопка блокируется до отправки, а движок остаётся последней инстанцией.
 */

export type UsageTargetKind =
  | 'NONE'
  | 'ADJACENT_DOOR'
  | 'ANY_DOOR'
  | 'ADJACENT_ROOM'
  | 'PLAYER_IN_ROOM'
  | 'PLAYER_IN_ROOM_OR_SELF'
  | 'INTRUDER'
  | 'UNEXPLORED_ROOM'
  | 'TECH_ROOM'
  | 'DECK_COLOR'
  | 'INVENTORY_ITEM'
  | 'INTRUDER_ROOM'
  | 'COMPUTER_ROOM'
  | 'YELLOW_ROOM'
  | 'HAND_CARDS';

export interface UsageVariant {
  id: string;
  label: string;
  hint?: string;
  available: boolean;
  /** Почему вариант нельзя использовать сейчас. */
  reason?: string;
  targetKind: UsageTargetKind;
  /** Вторая цель по цепочке (Приказ: Персонаж → соседний отсек). */
  secondTargetKind?: UsageTargetKind;
}

export interface CardUsage {
  title: string;
  subtitle: string;
  description: string;
  /** Сколько карт/очков действия требуется сверх карты (playCost / actionCost). */
  cost: number;
  variants: UsageVariant[];
}

export interface UsageTarget {
  id: string;
  label: string;
  sublabel?: string;
}

export type CardUseRequest =
  | { kind: 'ACTION'; card: ActionCard }
  | { kind: 'ITEM'; card: ItemCard; location: 'INVENTORY' | 'HAND_SLOT' };

type RoomView = SanitizedGameState['ship']['rooms'][number];

interface UsageContext {
  view: SanitizedGameState;
  player: NonNullable<SanitizedGameState['players'][string]>;
  room: RoomView;
  weapon: ItemCard | null;
  energyWeapon: ItemCard | null;
  contaminationCount: number;
}

function buildContext(view: SanitizedGameState): UsageContext {
  const player = view.players[view.meta.activePlayerId]!;
  const room = view.ship.rooms[player.roomId]!;
  const itemSlots = player.handSlots.filter(
    (slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM',
  );
  const weapon = itemSlots.find((slot) => slot.card.isWeapon)?.card ?? null;
  const energyWeapon = itemSlots.find((slot) => slot.card.isWeapon && slot.card.isEnergyWeapon)?.card ?? null;
  const contaminationCount = player.actionDeck.hand.filter((entry) => !('characterClass' in entry)).length;
  return { view, player, room, weapon, energyWeapon, contaminationCount };
}

function adjacentCorridors(ctx: UsageContext) {
  return Object.values(ctx.view.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === ctx.room.id || corridor.toRoomId === ctx.room.id,
  );
}

function adjacentOpenRoomIds(ctx: UsageContext): number[] {
  const result: number[] = [];
  for (const corridor of adjacentCorridors(ctx)) {
    if (corridor.doorState === 'CLOSED') continue;
    const other = corridor.fromRoomId === ctx.room.id ? corridor.toRoomId : corridor.fromRoomId;
    if (!result.includes(other)) result.push(other);
  }
  return result;
}

function toggleableDoors(ctx: UsageContext, adjacentOnly: boolean) {
  return Object.values(ctx.view.ship.corridors).filter((corridor) => {
    if (corridor.doorState === 'DESTROYED') return false;
    if (!adjacentOnly) return true;
    return corridor.fromRoomId === ctx.room.id || corridor.toRoomId === ctx.room.id;
  });
}

function engineRoomNumber(definitionId: string | null): 1 | 2 | 3 | null {
  const match = /^ENGINE_0([123])$/.exec(definitionId ?? '');
  return match ? (Number(match[1]) as 1 | 2 | 3) : null;
}

function unexploredRooms(ctx: UsageContext) {
  return Object.values(ctx.view.ship.rooms).filter((room) => !room.isExplored);
}

function techRooms(ctx: UsageContext) {
  return Object.values(ctx.view.ship.rooms).filter((room) => room.id !== ctx.room.id && room.hasTechnicalCorridorEntrance);
}

function computerRooms(ctx: UsageContext) {
  return Object.values(ctx.view.ship.rooms).filter((room) => room.hasComputer === true && room.hasMalfunction !== true);
}

function roomOccupants(ctx: UsageContext): string[] {
  return (ctx.room.occupantPlayerIds ?? []).filter((id) => {
    const occupant = ctx.view.players[id];
    return occupant && !occupant.isDead;
  });
}

function intrudersInRoom(ctx: UsageContext) {
  return ctx.room.occupantIntruderIds ?? [];
}

function weaponForCombat(ctx: UsageContext): ItemCard | null {
  if (ctx.energyWeapon && (ctx.energyWeapon.ammo ?? 0) > 0) return ctx.energyWeapon;
  return ctx.weapon && (ctx.weapon.ammo ?? 0) > 0 ? ctx.weapon : null;
}

function weaponReasonFor(ctx: UsageContext): string | undefined {
  if (!ctx.weapon) return 'В слотах рук нет Оружия';
  return weaponForCombat(ctx) ? undefined : `На «${ctx.weapon.name}» нет Боезапаса`;
}

function corridorDoorTargets(ctx: UsageContext, adjacentOnly: boolean): UsageTarget[] {
  return toggleableDoors(ctx, adjacentOnly).map((corridor) => ({
    id: corridor.id,
    label: `Дверь: ${roomLabel(ctx.view, corridor.fromRoomId)} ⇄ ${roomLabel(ctx.view, corridor.toRoomId)}`,
    sublabel: corridor.doorState === 'CLOSED' ? 'Закрыта — открыть' : 'Открыта — закрыть',
  }));
}

function deckColorTargets(ctx: UsageContext): UsageTarget[] {
  const labels: Record<ItemDeckColor, string> = { RED: 'Красная колода', YELLOW: 'Жёлтая колода', GREEN: 'Зелёная колода' };
  return (['RED', 'YELLOW', 'GREEN'] as ItemDeckColor[])
    .map((color) => ({ id: color, label: labels[color], sublabel: `${ctx.view.decks.items[color].drawPileCount} карт` }))
    .filter((target) => target.sublabel !== '0 карт');
}

function handMultiTargets(ctx: UsageContext): UsageTarget[] {
  return ctx.player.actionDeck.hand.map((entry) => ({
    id: entry.id,
    label: 'characterClass' in entry ? entry.name : 'Карта Заражения',
    sublabel:
      'characterClass' in entry
        ? undefined
        : entry.isScanned
          ? entry.isInfected
            ? 'Инфекция'
            : 'Стерильно'
          : 'Не просканировано',
  }));
}

function intruderLabel(ctx: UsageContext, intruderId: string): string {
  const token = ctx.view.intrudersPool.boardTokens.find((entry) => entry.id === intruderId);
  const typeLabel = token
    ? token.type === 'QUEEN'
      ? 'Матка'
      : token.type === 'BREEDER'
        ? 'Детёныш'
        : token.type === 'LARVA'
          ? 'Личинка'
          : 'Взрослый'
    : 'Чужой';
  return `Чужой (${typeLabel})`;
}

function intruderTargets(ctx: UsageContext): UsageTarget[] {
  return intrudersInRoom(ctx).map((intruderId) => ({ id: intruderId, label: intruderLabel(ctx, intruderId) }));
}

function roomTargets(ctx: UsageContext, roomIds: number[]): UsageTarget[] {
  return roomIds.map((roomId) => ({ id: String(roomId), label: roomLabel(ctx.view, roomId) }));
}

function intruderRoomTargets(ctx: UsageContext): UsageTarget[] {
  const roomIds = new Set<number>([ctx.room.id, ...adjacentOpenRoomIds(ctx)]);
  const result: UsageTarget[] = [];
  for (const roomId of roomIds) {
    const room = ctx.view.ship.rooms[roomId];
    if (!room || room.occupantIntruderIds.length === 0) continue;
    result.push({
      id: String(roomId),
      label: roomId === ctx.room.id ? 'Ваша комната' : roomLabel(ctx.view, roomId),
      sublabel: `Чужих: ${room.occupantIntruderIds.length}`,
    });
  }
  return result;
}

function repairRoomVariant(ctx: UsageContext): UsageVariant {
  return {
    id: 'FIX_ROOM',
    label: 'Сбросить Неисправность вашей комнаты',
    available: ctx.room.hasMalfunction === true,
    reason: ctx.room.hasMalfunction ? undefined : 'В вашей комнате нет маркера Неисправности',
    targetKind: 'NONE',
  };
}

function engineVariant(ctx: UsageContext): UsageVariant {
  const engineNumber = engineRoomNumber(ctx.room.definitionId ?? null);
  return {
    id: 'ENGINE',
    label: engineNumber === null ? 'Двигатель' : `Переключить Двигатель №${engineNumber}`,
    hint: 'Открыть закрытый / закрыть открытый Двигатель',
    available: engineNumber !== null,
    reason: engineNumber === null ? 'Вариант доступен только в Машинном Отсеке (ENGINE_01–03)' : undefined,
    targetKind: 'NONE',
  };
}

function shootVariant(id: string, label: string, hint: string, ctx: UsageContext): UsageVariant {
  const weaponReason = weaponReasonFor(ctx);
  const intruders = intruderTargets(ctx);
  return {
    id,
    label,
    hint,
    available: !weaponReason && intruders.length > 0,
    reason: weaponReason ?? (intruders.length === 0 ? 'В вашей комнате нет Чужих' : undefined),
    targetKind: 'INTRUDER',
  };
}

function repositionVariant(ctx: UsageContext, maxMoves: number): UsageVariant {
  const weaponReason = weaponReasonFor(ctx);
  const candidates = roomOccupants(ctx);
  const rooms = adjacentOpenRoomIds(ctx);
  return {
    id: 'REPOSITION',
    label: maxMoves === 2 ? 'Отход: себя и/или другого Персонажа' : 'Отход: себя или другого Персонажа',
    hint: maxMoves === 2 ? 'Цена — 1 ед. Боезапаса; до двух переносов (в окне — один шаг)' : 'Цена — 1 ед. Боезапаса; один перенос',
    available: !weaponReason && (candidates.length > 0 || rooms.length > 0),
    reason: weaponReason ?? (candidates.length === 0 && rooms.length === 0 ? 'Некого и некуда перемещать' : undefined),
    targetKind: 'PLAYER_IN_ROOM_OR_SELF',
    secondTargetKind: 'ADJACENT_ROOM',
  };
}

/** Собирает варианты использования карты Действия. */
export function getActionCardUsage(card: ActionCard, view: SanitizedGameState): CardUsage {
  const ctx = buildContext(view);
  const base: CardUsage = {
    title: card.name,
    subtitle: `Карта Действия • ${classLabel(card.characterClass)} • Цена: ${card.playCost}`,
    description: card.description,
    cost: card.playCost,
    variants: [],
  };

  switch (card.effect.kind) {
    case 'RELOAD': {
      const reason = !ctx.weapon
        ? 'В слотах рук нет Оружия'
        : ctx.weapon.maxAmmo !== null && (ctx.weapon.ammo ?? 0) >= ctx.weapon.maxAmmo
          ? `«${ctx.weapon.name}» уже заряжен полностью`
          : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'RELOAD',
            label: `Перезарядить ${ctx.weapon?.name ?? 'Оружие'}`,
            hint: '+1 ед. Боезапаса',
            available: !reason,
            reason,
            targetKind: 'NONE',
          },
        ],
      };
    }
    case 'ORDER': {
      const others = roomOccupants(ctx).filter((id) => id !== ctx.player.id);
      const hasRoom = adjacentOpenRoomIds(ctx).length > 0;
      const reason = others.length === 0 ? 'В вашей комнате нет других Персонажей' : !hasRoom ? 'Нет открытого соседнего отсека' : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'ORDER',
            label: 'Переместить Персонажа',
            hint: 'Выберите Персонажа в вашей комнате, затем соседний отсек',
            available: !reason,
            reason,
            targetKind: 'PLAYER_IN_ROOM',
            secondTargetKind: 'ADJACENT_ROOM',
          },
        ],
      };
    }
    case 'MOTIVATION':
      return {
        ...base,
        variants: [
          {
            id: 'MOTIVATION',
            label: 'Добрать карту каждому в комнате',
            hint: 'Все Персонажи в вашей комнате берут по 1 карте',
            available: true,
            targetKind: 'NONE',
          },
        ],
      };
    case 'BASIC_REPAIR':
    case 'REPAIR':
    case 'FAST_REPAIR':
      return { ...base, variants: [repairRoomVariant(ctx), engineVariant(ctx)] };
    case 'INGENUITY':
      return {
        ...base,
        variants: [
          repairRoomVariant(ctx),
          engineVariant(ctx),
          {
            id: 'CRAFT',
            label: 'Создать Предмет',
            available: false,
            reason: 'Создание Предмета выполняется базовым Действием на панели инвентаря',
            targetKind: 'NONE',
          },
        ],
      };
    case 'DISMISS':
      return {
        ...base,
        variants: [
          {
            id: 'CANCEL_ACTION',
            label: 'Отменить Действие другого Игрока',
            available: false,
            reason: '«Отставить» отменяет Действия других Игроков в вашей комнате — одновременные действия пока не реализованы',
            targetKind: 'NONE',
          },
        ],
      };
    case 'STEEL_NERVES':
      return {
        ...base,
        variants: [
          {
            id: 'PASSIVE',
            label: 'Реактивная карта',
            available: false,
            reason: 'Сработает сама при Внезапной Атаке: движок спросит, сбросить ли её для отмены атаки',
            targetKind: 'NONE',
          },
        ],
      };
    case 'SEARCH': {
      const color = getRoomDeckColor(ctx.room.definitionId ?? null);
      const inCombat = intrudersInRoom(ctx).length > 0;
      const reason = !ctx.room.isExplored
        ? 'Отсек ещё не исследован'
        : inCombat
          ? 'В отсеке Чужие — поиск запрещён'
          : (ctx.room.itemsCount ?? 0) <= 0
            ? 'Счётчик Предметов в отсеке равен 0'
            : color === null
              ? 'Не удалось определить цвет колоды отсека'
              : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'SEARCH',
            label: 'Провести Поиск',
            hint: 'Вытяните 2 карты из колоды цвета отсека, возьмите 1',
            available: !reason,
            reason,
            targetKind: color === 'WHITE' ? 'DECK_COLOR' : 'NONE',
          },
        ],
      };
    }
    case 'SCAVENGE': {
      const targets = deckColorTargets(ctx);
      return {
        ...base,
        variants: [
          {
            id: 'SCAVENGE',
            label: 'Мародерство',
            hint: 'Счётчик Предметов −1 (можно ниже нуля), вытяните 2 карты из выбранной колоды',
            available: targets.length > 0,
            reason: targets.length === 0 ? 'Все колоды Предметов пусты' : undefined,
            targetKind: 'DECK_COLOR',
          },
        ],
      };
    }
    case 'REST': {
      const reason = ctx.contaminationCount === 0 ? 'На руке нет карт Заражения' : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'REST',
            label: 'Сканировать Заражение',
            hint: 'Чистые карты уходят в сброс; при Инфекции — Личинка',
            available: !reason,
            reason,
            targetKind: 'NONE',
          },
        ],
      };
    }
    case 'DEMOLITION': {
      const doors = toggleableDoors(ctx, true);
      return {
        ...base,
        variants: [
          {
            id: 'DOOR',
            label: 'Разрушить Дверь',
            hint: 'Дверь в коридоре вашей комнаты',
            available: doors.length > 0,
            reason: doors.length === 0 ? 'В коридорах вашей комнаты нет целых Дверей' : undefined,
            targetKind: 'ADJACENT_DOOR',
          },
          {
            id: 'MALFUNCTION',
            label: 'Маркер Неисправности в вашу комнату',
            available: !ctx.room.hasMalfunction,
            reason: ctx.room.hasMalfunction ? 'В вашей комнате уже стоит Неисправность' : undefined,
            targetKind: 'NONE',
          },
        ],
      };
    }
    case 'SHIP_KNOWLEDGE': {
      const doors = toggleableDoors(ctx, true);
      const unexplored = unexploredRooms(ctx);
      return {
        ...base,
        variants: [
          {
            id: 'DOOR',
            label: 'Открыть/Закрыть Дверь',
            hint: 'Дверь в коридоре вашей комнаты',
            available: doors.length > 0,
            reason: doors.length === 0 ? 'Нет целых Дверей рядом' : undefined,
            targetKind: 'ADJACENT_DOOR',
          },
          {
            id: 'PEEK',
            label: 'Посмотреть Неисследованный Отсек',
            hint: 'Оборот тайла и жетон Исследования',
            available: unexplored.length > 0,
            reason: unexplored.length === 0 ? 'Все отсеки исследованы' : undefined,
            targetKind: 'UNEXPLORED_ROOM',
          },
        ],
      };
    }
    case 'COMPUTER_SKILLS': {
      const doors = toggleableDoors(ctx, false);
      return {
        ...base,
        variants: [
          {
            id: 'DOOR',
            label: 'Открыть/Закрыть любую Дверь',
            available: doors.length > 0,
            reason: doors.length === 0 ? 'На корабле нет целых Дверей' : undefined,
            targetKind: 'ANY_DOOR',
          },
          {
            id: 'ROOM_ACTION',
            label: 'Бесплатное Действие комнаты',
            available: false,
            reason: 'Бесплатные Действия комнат появятся на этапе комнат',
            targetKind: 'NONE',
          },
        ],
      };
    }
    case 'PILOTING':
      return {
        ...base,
        variants: [
          {
            id: 'PILOTING',
            label: 'Бесплатное Действие / Координаты',
            available: false,
            reason: 'Бесплатные Действия комнат и проверка Координат появятся на этапе целей',
            targetKind: 'NONE',
          },
        ],
      };
    case 'OLD_FRIEND':
      return {
        ...base,
        variants: [
          {
            id: 'OLD_FRIEND',
            label: 'Бесплатное Действие комнаты без Компьютера',
            available: false,
            reason: 'Механика бесплатных Действий комнат ещё не реализована',
            targetKind: 'NONE',
          },
        ],
      };
    case 'INTRANET':
      return {
        ...base,
        variants: [
          {
            id: 'INTRANET',
            label: 'Бесплатное Действие другой комнаты с Компьютером',
            available: false,
            reason: 'Механика бесплатных Действий комнат ещё не реализована',
            targetKind: 'NONE',
          },
        ],
      };
    case 'ACCESS_DENIED': {
      const targets = computerRooms(ctx);
      const reason = !ctx.room.hasComputer
        ? 'Карта работает только в комнате с Компьютером'
        : targets.length === 0
          ? 'Нет комнат с Компьютером без Неисправности'
          : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'MALFUNCTION',
            label: 'Маркер Неисправности в комнату с Компьютером',
            available: !reason,
            reason,
            targetKind: 'COMPUTER_ROOM',
          },
          {
            id: 'ROOM_ACTION',
            label: 'Бесплатное Действие этой комнаты',
            available: false,
            reason: 'Бесплатные Действия комнат появятся на этапе комнат',
            targetKind: 'NONE',
          },
        ],
      };
    }
    case 'THREAT_ASSESSMENT': {
      const deckReady = ctx.view.decks.events.drawPileCount > 0 || ctx.view.decks.events.discard.length > 0;
      const reason = !ctx.room.hasComputer ? 'Карта работает только в комнате с Компьютером' : !deckReady ? 'Колода Событий пуста' : undefined;
      return {
        ...base,
        variants: [
          { id: 'KEEP_TOP', label: 'Посмотреть верхнюю карту Событий и оставить сверху', available: !reason, reason, targetKind: 'NONE' },
          { id: 'MOVE_BOTTOM', label: 'Посмотреть верхнюю карту Событий и положить под низ', available: !reason, reason, targetKind: 'NONE' },
        ],
      };
    }
    case 'TECH_CORRIDORS': {
      const targets = techRooms(ctx);
      const reason = !ctx.room.hasTechnicalCorridorEntrance
        ? 'В вашем отсеке нет Входа в Технические Коридоры'
        : targets.length === 0
          ? 'На корабле нет другого отсека со Входом'
          : undefined;
      return {
        ...base,
        variants: [
          {
            id: 'TECH_MOVE',
            label: 'Перейти в отсек со Входом и спасовать',
            hint: 'Перемещение без кубика Шума, затем Пас',
            available: !reason,
            reason,
            targetKind: 'TECH_ROOM',
          },
        ],
      };
    }
    case 'RECONNAISSANCE': {
      const rooms = adjacentOpenRoomIds(ctx);
      return {
        ...base,
        variants: [
          {
            id: 'MOVE',
            label: 'Тихо перейти в соседний отсек',
            hint: 'Без броска кубика Шума',
            available: rooms.length > 0,
            reason: rooms.length === 0 ? 'Нет открытых соседних отсеков' : undefined,
            targetKind: 'ADJACENT_ROOM',
          },
        ],
      };
    }
    case 'PYROTECHNIC': {
      const items = ctx.player.inventory ?? [];
      return {
        ...base,
        variants: [
          {
            id: 'EXTINGUISH',
            label: 'Погасить Пожар в вашей комнате',
            available: ctx.room.hasFire === true,
            reason: ctx.room.hasFire ? undefined : 'В вашей комнате нет Пожара',
            targetKind: 'NONE',
          },
          {
            id: 'PLACE_FIRE',
            label: 'Разжечь Пожар в вашей комнате',
            hint: 'Цена — любой Предмет из инвентаря',
            available: items.length > 0 && !ctx.room.hasFire,
            reason: ctx.room.hasFire ? 'В комнате уже Пожар' : items.length === 0 ? 'Нет Предмета для сброса' : undefined,
            targetKind: 'INVENTORY_ITEM',
          },
        ],
      };
    }
    case 'SUPPRESSIVE_FIRE':
      return { ...base, variants: [repositionVariant(ctx, card.effect.variant === 'SOLDIER' ? 2 : 1)] };
    case 'BURST_FIRE':
      return { ...base, variants: [shootVariant('BURST_SHOOT', 'Очередь по Чужому', 'Весь Боезапас оружия: +1 Рана за 2 ед.', ctx)] };
    case 'AIMED_FIRE':
      return { ...base, variants: [shootVariant('AIMED_SHOOT', 'Прицельный выстрел', 'Один переброс кубика Боя по вашему решению', ctx)] };
    case 'ADRENALINE': {
      const rooms = adjacentOpenRoomIds(ctx);
      return {
        ...base,
        variants: [
          shootVariant('ADRENALINE_SHOOT', 'Стрельба + добор карты', 'Как обычная Стрельба, плюс 1 карта Действия', ctx),
          {
            id: 'ADRENALINE_ESCAPE',
            label: 'Побег + добор карты',
            hint: 'Обычный Побег с Атаками Чужих',
            available: rooms.length > 0,
            reason: rooms.length === 0 ? 'Нет открытых соседних отсеков' : undefined,
            targetKind: 'ADJACENT_ROOM',
          },
        ],
      };
    }
    default:
      return {
        ...base,
        variants: [{ id: 'UNKNOWN', label: 'Использовать', available: false, reason: 'Эффект карты ещё не реализован', targetKind: 'NONE' }],
      };
  }
}

/** Собирает варианты использования Предмета. */
export function getItemUsage(
  item: ItemCard,
  view: SanitizedGameState,
  location: 'INVENTORY' | 'HAND_SLOT',
): CardUsage {
  const ctx = buildContext(view);
  const base: CardUsage = {
    title: item.name,
    subtitle: `Предмет • ${colorLabel(item.color)} • ${location === 'HAND_SLOT' ? 'Слот руки (тяжёлый)' : 'Инвентарь'} • Стоимость: ${item.actionCost}`,
    description: item.description,
    cost: item.actionCost,
    variants: [],
  };

  const id = item.id;
  if (item.isWeapon) {
    return {
      ...base,
      variants: [
        {
          id: 'WEAPON',
          label: 'Оружие',
          available: false,
          reason: 'Оружие применяется действием «Стрельба» в Бою (панель боя) — предметом его не используют',
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('ENERGY_CHARGE')) {
    const chargeReason = !ctx.energyWeapon
      ? 'В слотах рук нет Энергооружия'
      : ctx.energyWeapon.maxAmmo !== null && (ctx.energyWeapon.ammo ?? 0) >= ctx.energyWeapon.maxAmmo
        ? 'Оружие уже заряжено полностью'
        : undefined;
    const doors = toggleableDoors(ctx, true);
    return {
      ...base,
      variants: [
        { id: 'CHARGE', label: `Зарядить ${ctx.energyWeapon?.name ?? 'Энергооружие'}`, available: !chargeReason, reason: chargeReason, targetKind: 'NONE' },
        { id: 'DOOR', label: 'Открыть/Закрыть Дверь', hint: 'Дверь в коридоре вашей комнаты', available: doors.length > 0, reason: doors.length === 0 ? 'Нет целых Дверей рядом' : undefined, targetKind: 'ADJACENT_DOOR' },
      ],
    };
  }

  if (id.includes('EXTENDED_MAGAZINE')) {
    const reason = !ctx.energyWeapon ? 'Магазин крепится к Энергооружию в слоте руки' : undefined;
    return {
      ...base,
      variants: [
        {
          id: 'ATTACH',
          label: `Прикрепить к ${ctx.energyWeapon?.name ?? 'Энергооружию'}`,
          hint: '+2 Боезапаса и +2 к пределу',
          available: !reason,
          reason,
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('GRENADE') && !id.includes('SMOKE')) {
    const targets = intruderRoomTargets(ctx);
    return {
      ...base,
      variants: [
        {
          id: 'THROW',
          label: 'Бросить в комнату с Чужим',
          hint: '2 Раны Чужому, все в той комнате — 1 Рана',
          available: targets.length > 0,
          reason: targets.length === 0 ? 'В вашей и соседних комнатах нет Чужих' : undefined,
          targetKind: 'INTRUDER_ROOM',
        },
      ],
    };
  }

  if (id.includes('SMOKE_GRENADE') || id.includes('DECOY')) {
    const rooms = adjacentOpenRoomIds(ctx);
    return {
      ...base,
      variants: [
        {
          id: 'HERD',
          label: 'Согнать Чужих в соседнюю комнату',
          hint: 'Все Чужие из соседних комнат уходят в выбранную',
          available: rooms.length > 0,
          reason: rooms.length === 0 ? 'Нет открытых соседних отсеков' : undefined,
          targetKind: 'ADJACENT_ROOM',
        },
      ],
    };
  }

  if (id.includes('RECON_DRONE')) {
    const rooms = unexploredRooms(ctx);
    return {
      ...base,
      variants: [
        {
          id: 'PEEK',
          label: 'Посмотреть Неисследованный Отсек',
          hint: 'Оборот тайла и жетон Исследования',
          available: rooms.length > 0,
          reason: rooms.length === 0 ? 'Все отсеки исследованы' : undefined,
          targetKind: 'UNEXPLORED_ROOM',
        },
      ],
    };
  }

  if (id.includes('MILITARY_STIMULANTS')) {
    const hasHand = ctx.player.actionDeck.hand.length > 0;
    return {
      ...base,
      variants: [
        {
          id: 'DISCARD_DRAW',
          label: 'Сбросить карты и взять столько же +1',
          hint: 'Отметьте карты в окне (можно Заражение)',
          available: hasHand,
          reason: hasHand ? undefined : 'Рука пуста',
          targetKind: 'HAND_CARDS',
        },
      ],
    };
  }

  if (id.includes('DUCT_TAPE')) {
    return {
      ...base,
      variants: [
        repairRoomVariant(ctx),
        engineVariant(ctx),
        {
          id: 'COMBINE_HEAVY',
          label: 'Соединить 2 Тяжёлых предмета',
          available: false,
          reason: 'Объединение слотов появится на этапе инвентаря',
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('TOOLS')) {
    const doors = toggleableDoors(ctx, false);
    return {
      ...base,
      variants: [
        repairRoomVariant(ctx),
        engineVariant(ctx),
        {
          id: 'DOOR',
          label: 'Открыть/Закрыть любую Дверь',
          available: doors.length > 0,
          reason: doors.length === 0 ? 'На корабле нет целых Дверей' : undefined,
          targetKind: 'ANY_DOOR',
        },
      ],
    };
  }

  if (id.includes('FIRE_EXTINGUISHER')) {
    const intruders = intrudersInRoom(ctx);
    return {
      ...base,
      variants: [
        {
          id: 'EXTINGUISH',
          label: 'Погасить Пожар в вашей комнате',
          available: ctx.room.hasFire === true,
          reason: ctx.room.hasFire ? undefined : 'В вашей комнате нет Пожара',
          targetKind: 'NONE',
        },
        {
          id: 'RETREAT',
          label: 'Заставить Чужого Отступить',
          hint: 'Направление задаёт карта Событий',
          available: intruders.length > 0,
          reason: intruders.length === 0 ? 'В вашей комнате нет Чужих' : undefined,
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('TECH_CORRIDOR_PLANS')) {
    const targets = techRooms(ctx);
    const reason = !ctx.room.hasTechnicalCorridorEntrance
      ? 'В вашем отсеке нет Входа в Технические Коридоры'
      : targets.length === 0
        ? 'Нет другого отсека со Входом'
        : undefined;
    return { ...base, variants: [{ id: 'TECH_MOVE', label: 'Перейти в отсек со Входом', available: !reason, reason, targetKind: 'TECH_ROOM' }] };
  }

  if (id.includes('SPACE_SUIT')) {
    const isYellow = (definitionId: string | null): boolean => getRoomDeckColor(definitionId) === 'YELLOW';
    const targets = Object.values(ctx.view.ship.rooms)
      .filter((room) => room.id !== ctx.room.id && isYellow(room.definitionId ?? null))
      .map((room) => ({ id: String(room.id), label: roomLabel(ctx.view, room.id) }));
    const reason = !isYellow(ctx.room.definitionId ?? null)
      ? 'Скафандр работает только в Жёлтой комнате'
      : targets.length === 0
        ? 'Нет другой Жёлтой комнаты'
        : undefined;
    return {
      ...base,
      variants: [
        {
          id: 'MOVE',
          label: 'Перейти в другую Жёлтую комнату',
          hint: 'Карты Действия с руки уходят в сброс',
          available: !reason,
          reason,
          targetKind: 'YELLOW_ROOM',
        },
      ],
    };
  }

  if (id.includes('NEMESIS_PLANS')) {
    const rooms = unexploredRooms(ctx);
    return {
      ...base,
      variants: [
        {
          id: 'PEEK',
          label: 'Посмотреть 2 Неисследованных Отсека',
          hint: 'Без жетонов Исследования',
          available: rooms.length > 0,
          reason: rooms.length === 0 ? 'Все отсеки исследованы' : undefined,
          targetKind: 'UNEXPLORED_ROOM',
          secondTargetKind: 'UNEXPLORED_ROOM',
        },
      ],
    };
  }

  if (id.includes('BANDAGES')) {
    const untreated = ctx.player.seriousWounds.some((wound) => !wound.isTreated);
    return {
      ...base,
      variants: [
        { id: 'TREAT_SERIOUS', label: 'Обработать Тяжёлую Травму', available: untreated, reason: untreated ? undefined : 'Необработанных Тяжёлых Травм нет', targetKind: 'NONE' },
        { id: 'HEAL_LIGHT', label: 'Вылечить все Лёгкие Травмы', available: ctx.player.lightWounds > 0, reason: ctx.player.lightWounds > 0 ? undefined : 'Лёгких Травм нет', targetKind: 'NONE' },
      ],
    };
  }

  if (id.includes('MEDKIT')) {
    const untreated = ctx.player.seriousWounds.some((wound) => !wound.isTreated);
    const treated = ctx.player.seriousWounds.some((wound) => wound.isTreated);
    return {
      ...base,
      variants: [
        { id: 'TREAT_SERIOUS', label: 'Обработать Тяжёлую Травму', available: untreated, reason: untreated ? undefined : 'Необработанных Тяжёлых Травм нет', targetKind: 'NONE' },
        { id: 'HEAL_TREATED', label: 'Вылечить обработанную Травму', available: treated, reason: treated ? undefined : 'Обработанных Тяжёлых Травм нет', targetKind: 'NONE' },
        { id: 'HEAL_LIGHT', label: 'Вылечить все Лёгкие Травмы', available: ctx.player.lightWounds > 0, reason: ctx.player.lightWounds > 0 ? undefined : 'Лёгких Травм нет', targetKind: 'NONE' },
      ],
    };
  }

  if (id.includes('ALCOHOL')) {
    return {
      ...base,
      variants: [
        {
          id: 'DRINK',
          label: 'Удалить карту Заражения',
          hint: 'За Инфекцию — новая карта Заражения из колоды',
          available: ctx.contaminationCount > 0,
          reason: ctx.contaminationCount > 0 ? undefined : 'На руке нет карт Заражения',
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('CLOTHES')) {
    const untreated = ctx.player.seriousWounds.some((wound) => !wound.isTreated);
    return {
      ...base,
      variants: [
        { id: 'SLIME', label: 'Сбросить маркер Слизи', available: ctx.player.hasSlime, reason: ctx.player.hasSlime ? undefined : 'На планшете нет Слизи', targetKind: 'NONE' },
        { id: 'TREAT_SERIOUS', label: 'Обработать Тяжёлую Травму', available: untreated, reason: untreated ? undefined : 'Необработанных Тяжёлых Травм нет', targetKind: 'NONE' },
      ],
    };
  }

  if (id.includes('ADRENALINE')) {
    return {
      ...base,
      variants: [
        {
          id: 'INJECT',
          label: 'Безлимит Действий до Паса',
          available: false,
          reason: 'Механика безлимита Действий появится на этапе боевой доработки',
          targetKind: 'NONE',
        },
      ],
    };
  }

  if (id.includes('SYNTHETIC_FOOD')) {
    const deck = ctx.player.actionDeck;
    const drawable = deck.drawPileCount > 0 || deck.discardCount > 0;
    return {
      ...base,
      variants: [
        {
          id: 'EAT',
          label: 'Взять 2 карты Действия',
          available: drawable,
          reason: drawable ? undefined : 'Колода Действий и сброс пусты',
          targetKind: 'NONE',
        },
      ],
    };
  }

  return {
    ...base,
    variants: [{ id: 'UNKNOWN', label: 'Использовать', available: false, reason: 'Эффект Предмета в этой версии ещё не реализован', targetKind: 'NONE' }],
  };
}

function colorLabel(color: ItemCard['color']): string {
  switch (color) {
    case 'RED':
      return 'Красный';
    case 'YELLOW':
      return 'Жёлтый';
    case 'GREEN':
      return 'Зелёный';
    case 'BLUE':
      return 'Создаваемый';
  }
}

function classLabel(characterClass: ActionCard['characterClass']): string {
  switch (characterClass) {
    case 'CAPTAIN':
      return 'Капитан';
    case 'PILOT':
      return 'Пилот';
    case 'MECHANIC':
      return 'Механик';
    case 'SOLDIER':
      return 'Солдат';
    case 'SCOUT':
      return 'Скаут';
    case 'SCIENTIST':
      return 'Учёный';
    default:
      return String(characterClass);
  }
}

/** Цели выбранного варианта: одна или две по цепочке. */
export function getUsageTargets(
  view: SanitizedGameState,
  targetKind: UsageTargetKind,
  secondTargetKind?: UsageTargetKind,
): { first: UsageTarget[]; second: UsageTarget[] } {
  const ctx = buildContext(view);
  const build = (kind: UsageTargetKind): UsageTarget[] => {
    switch (kind) {
      case 'NONE':
        return [];
      case 'ADJACENT_DOOR':
        return corridorDoorTargets(ctx, true);
      case 'ANY_DOOR':
        return corridorDoorTargets(ctx, false);
      case 'ADJACENT_ROOM':
        return roomTargets(ctx, adjacentOpenRoomIds(ctx));
      case 'PLAYER_IN_ROOM':
        return roomOccupants(ctx)
          .filter((id) => id !== ctx.player.id)
          .map((id) => ({ id, label: playerName(ctx.view, id) }));
      case 'PLAYER_IN_ROOM_OR_SELF':
        return roomOccupants(ctx).map((id) => ({
          id,
          label: id === ctx.player.id ? `${playerName(ctx.view, id)} — вы` : playerName(ctx.view, id),
        }));
      case 'INTRUDER':
        return intruderTargets(ctx);
      case 'UNEXPLORED_ROOM':
        return unexploredRooms(ctx).map((room) => ({ id: String(room.id), label: `Отсек #${String(room.id).padStart(3, '0')}` }));
      case 'TECH_ROOM':
        return roomTargets(
          ctx,
          techRooms(ctx).map((room) => room.id),
        );
      case 'DECK_COLOR':
        return deckColorTargets(ctx);
      case 'INVENTORY_ITEM':
        return (ctx.player.inventory ?? []).map((entry) => ({ id: entry.id, label: entry.name }));
      case 'INTRUDER_ROOM':
        return intruderRoomTargets(ctx);
      case 'COMPUTER_ROOM':
        return roomTargets(
          ctx,
          computerRooms(ctx).map((room) => room.id),
        );
      case 'YELLOW_ROOM':
        return Object.values(ctx.view.ship.rooms)
          .filter((room) => room.id !== ctx.room.id && getRoomDeckColor(room.definitionId ?? null) === 'YELLOW')
          .map((room) => ({ id: String(room.id), label: roomLabel(ctx.view, room.id) }));
      case 'HAND_CARDS':
        return handMultiTargets(ctx);
    }
  };
  return { first: build(targetKind), second: secondTargetKind ? build(secondTargetKind) : [] };
}

export interface BuiltCardPayload {
  cardId?: string;
  itemId?: string;
  option?: string;
  targetRoomId?: number;
  targetRoomId2?: number;
  targetCorridorId?: string;
  targetPlayerId?: string;
  targetDeckColor?: ItemDeckColor;
  targetItemId?: string;
  targetCardIds?: string[];
}

/**
 * Payload для ACTION_PLAY_CARD / ACTION_USE_ITEM по выбранному варианту.
 * `first`/`second` — id целей из `getUsageTargets` (или null, когда целей нет).
 * Боевые варианты сюда не попадают: для них панель вызывает `buildCombatPayload`.
 */
export function buildUsePayload(
  request: CardUseRequest,
  variant: UsageVariant,
  first: string | null,
  second: string | null,
  multiCardIds: string[] = [],
): BuiltCardPayload {
  const kind = request.kind === 'ACTION' ? request.card.effect.kind : null;
  const payload: BuiltCardPayload = request.kind === 'ACTION' ? { cardId: request.card.id } : { itemId: request.card.id };
  const num = (value: string | null): number | undefined => (value === null ? undefined : Number(value));

  switch (variant.id) {
    case 'ORDER':
      payload.targetPlayerId = first ?? undefined;
      payload.targetRoomId = num(second);
      break;
    case 'DOOR':
      payload.targetCorridorId = first ?? undefined;
      if (kind === 'SHIP_KNOWLEDGE' || kind === 'COMPUTER_SKILLS') payload.option = 'DOOR';
      break;
    case 'MALFUNCTION':
      payload.option = 'MALFUNCTION';
      payload.targetRoomId = num(first);
      break;
    case 'PEEK':
      payload.option = 'PEEK';
      payload.targetRoomId = num(first);
      payload.targetRoomId2 = num(second);
      break;
    case 'SEARCH':
    case 'SCAVENGE':
      payload.targetDeckColor = (first as ItemDeckColor) ?? undefined;
      break;
    case 'TECH_MOVE':
    case 'MOVE':
    case 'THROW':
    case 'HERD':
      payload.targetRoomId = num(first);
      break;
    case 'THREAT_ASSESSMENT':
      payload.option = variant.id;
      break;
    case 'PLACE_FIRE':
      payload.option = 'PLACE_FIRE';
      payload.targetItemId = first ?? undefined;
      break;
    case 'DISCARD_DRAW':
      payload.targetCardIds = multiCardIds;
      break;
    default:
      // Варианты без целей (RELOAD, REST, FIX_ROOM, ENGINE, лечение и т.д.).
      break;
  }
  return payload;
}

/**
 * Payload `combat` для ACTION_PLAY_CARD боевых карт (AIMED/BURST/ADRENALINE/SUPPRESSIVE).
 * `weaponItemId` панель берёт из первого слота-оружия с боезапасом.
 */
export function buildCombatPayload(
  variant: UsageVariant,
  weaponItemId: string,
  first: string | null,
  second: string | null,
): Record<string, unknown> {
  const num = (value: string | null): number | undefined => (value === null ? undefined : Number(value));
  switch (variant.id) {
    case 'AIMED_SHOOT':
    case 'BURST_SHOOT':
    case 'ADRENALINE_SHOOT':
      return { kind: variant.id, weaponItemId, targetIntruderId: first ?? undefined };
    case 'ADRENALINE_ESCAPE':
      return { kind: 'ADRENALINE_ESCAPE', targetRoomId: num(first) };
    case 'REPOSITION':
      return {
        kind: 'REPOSITION',
        weaponItemId,
        moves: first ? [{ playerId: first, targetRoomId: second ? Number(second) : 0 }] : [],
      };
    default:
      return {};
  }
}

/** Является ли карта боевой (варианты обрабатываются через buildCombatPayload). */
export function isCombatCardVariant(variantId: string): boolean {
  return ['AIMED_SHOOT', 'BURST_SHOOT', 'ADRENALINE_SHOOT', 'ADRENALINE_ESCAPE', 'REPOSITION'].includes(variantId);
}
