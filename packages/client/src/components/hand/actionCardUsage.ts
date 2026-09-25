import { CARD_OPTION, getRoomDeckColor, type ActionCard, type SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import {
  adjacentOpenRoomIds,
  buildContext,
  combatWeapon,
  computerRooms,
  engineRoomNumber,
  intrudersInRoom,
  otherOccupants,
  roomOccupants,
  techRooms,
  toggleableDoors,
  unexploredRooms,
  weaponReason,
  type UsageContext,
} from './usageContext';
import { singleStep, type CardUsage, type UsageVariant } from './usageTypes';

export function blocked(id: string, label: string, reason: string, icon: UsageVariant['icon'] = 'lock'): UsageVariant {
  return { id, label, icon, available: false, reason, steps: [] };
}

export function whenAvailable(
  variant: Omit<UsageVariant, 'available' | 'reason'>,
  reason: string | undefined,
): UsageVariant {
  return { ...variant, available: reason === undefined, reason };
}

export function fixRoomVariant(ctx: UsageContext): UsageVariant {
  return whenAvailable(
    {
      id: CARD_OPTION.FIX_ROOM,
      option: CARD_OPTION.FIX_ROOM,
      label: 'Сбросить Неисправность',
      hint: 'Маркер в вашем отсеке',
      icon: 'wrench',
      steps: [],
    },
    ctx.room.hasMalfunction === true ? undefined : 'В вашем отсеке нет маркера Неисправности',
  );
}

export function engineVariants(ctx: UsageContext): UsageVariant[] {
  const engine = engineRoomNumber(ctx);
  const reason = engine === null ? 'Только в Машинном Отсеке' : undefined;
  const known = engine === null ? null : (ctx.view.ship.engines[engine]?.isWorking ?? null);
  const knownHint = known === null ? 'Вы увидите состояние жетонов' : known ? 'Сейчас: Исправен' : 'Сейчас: Неисправен';
  return [
    whenAvailable(
      {
        id: CARD_OPTION.ENGINE_REPAIR,
        option: CARD_OPTION.ENGINE_REPAIR,
        label: engine === null ? 'Починить Двигатель' : `Починить Двигатель №${engine}`,
        hint: `${knownHint}. Остальные узнают лишь, менялся ли порядок жетонов`,
        icon: 'engine',
        steps: [],
      },
      reason,
    ),
    whenAvailable(
      {
        id: CARD_OPTION.ENGINE_DAMAGE,
        option: CARD_OPTION.ENGINE_DAMAGE,
        label: engine === null ? 'Повредить Двигатель' : `Повредить Двигатель №${engine}`,
        hint: `${knownHint}. Говорить правду о результате не обязательно`,
        icon: 'engine',
        steps: [],
      },
      reason,
    ),
  ];
}

export function doorVariant(ctx: UsageContext, adjacentOnly: boolean): UsageVariant {
  return whenAvailable(
    {
      id: CARD_OPTION.DOOR,
      option: CARD_OPTION.DOOR,
      label: adjacentOnly ? 'Открыть или закрыть Дверь рядом' : 'Открыть или закрыть любую Дверь',
      hint: adjacentOnly ? 'Коридор вашего отсека' : 'Любой Коридор корабля',
      icon: 'door',
      steps: [singleStep(adjacentOnly ? 'ADJACENT_DOOR' : 'ANY_DOOR', 'Выберите Дверь')],
    },
    toggleableDoors(ctx, adjacentOnly).length > 0 ? undefined : 'Нет целых Дверей',
  );
}

function shootVariant(
  ctx: UsageContext,
  combat: 'AIMED_SHOOT' | 'BURST_SHOOT' | 'ADRENALINE_SHOOT',
  label: string,
  hint: string,
): UsageVariant {
  const reason = weaponReason(ctx) ?? (intrudersInRoom(ctx).length === 0 ? 'В вашем отсеке нет Чужих' : undefined);
  return whenAvailable(
    { id: combat, combat, label, hint, icon: 'ammo', steps: [singleStep('INTRUDER_IN_ROOM', 'Выберите Чужого')] },
    reason,
  );
}

function repositionVariant(ctx: UsageContext, maxMoves: number): UsageVariant {
  const reason =
    weaponReason(ctx) ??
    (roomOccupants(ctx).length === 0 || adjacentOpenRoomIds(ctx).length === 0
      ? 'Некого или некуда перемещать'
      : undefined);
  return whenAvailable(
    {
      id: 'REPOSITION',
      combat: 'REPOSITION',
      label: maxMoves === 2 ? 'Отход: себя и/или другого Персонажа' : 'Отход: себя или другого Персонажа',
      hint: `Цена — 1 ед. Боезапаса «${combatWeapon(ctx)?.name ?? 'Оружия'}», без Атак Чужих`,
      icon: 'move',
      steps: [
        singleStep('PLAYER_IN_ROOM_OR_SELF', 'Кого переместить'),
        singleStep('ADJACENT_ROOM', 'Куда переместить'),
      ],
    },
    reason,
  );
}

function searchReason(ctx: UsageContext): string | undefined {
  if (!ctx.room.isExplored) return 'Отсек ещё не исследован';
  if (intrudersInRoom(ctx).length > 0) return 'В отсеке Чужие — Поиск запрещён';
  if ((ctx.room.itemsCount ?? 0) <= 0) return 'Счётчик Предметов отсека равен 0';
  if (getRoomDeckColor(ctx.room.definitionId ?? null) === null) return 'В этом отсеке Поиск невозможен';
  return undefined;
}

function reloadVariant(ctx: UsageContext, card: Extract<ActionCard['effect'], { kind: 'RELOAD' }>): UsageVariant {
  const hint = card.weaponHint;
  const weapon = hint ? ctx.weapons.find((entry) => entry.id.includes(hint)) : ctx.weapons[0];
  const reason = !weapon
    ? hint
      ? 'Нужного Оружия нет в слотах рук'
      : 'В слотах рук нет Оружия'
    : weapon.maxAmmo !== null && (weapon.ammo ?? 0) >= weapon.maxAmmo
      ? `«${weapon.name}» уже заряжен полностью`
      : undefined;
  return whenAvailable(
    {
      id: 'RELOAD',
      label: `Перезарядить ${weapon?.name ?? 'Оружие'}`,
      hint: weapon ? `+${card.ammoGain} ед. Боезапаса: ${weapon.ammo ?? 0}/${weapon.maxAmmo ?? '—'}` : undefined,
      icon: 'ammo',
      steps: [],
    },
    reason,
  );
}

function variantsFor(card: ActionCard, ctx: UsageContext): UsageVariant[] {
  const effect = card.effect;
  switch (effect.kind) {
    case 'RELOAD':
      return [reloadVariant(ctx, effect)];
    case 'ORDER':
      return [
        whenAvailable(
          {
            id: 'ORDER',
            label: 'Переместить другого Персонажа',
            hint: 'Без броска Шума и Атак Чужих',
            icon: 'player',
            steps: [
              singleStep('PLAYER_OTHER_IN_ROOM', 'Кого переместить'),
              singleStep('ADJACENT_ROOM', 'Куда переместить'),
            ],
          },
          otherOccupants(ctx).length === 0
            ? 'В вашем отсеке нет других Персонажей'
            : adjacentOpenRoomIds(ctx).length === 0
              ? 'Нет открытого соседнего отсека'
              : undefined,
        ),
      ];
    case 'MOTIVATION':
      return [
        whenAvailable({ id: 'MOTIVATION', label: 'Все в отсеке берут по карте', icon: 'card', steps: [] }, undefined),
      ];
    case 'BASIC_REPAIR':
    case 'REPAIR':
    case 'FAST_REPAIR':
      return [fixRoomVariant(ctx), ...engineVariants(ctx)];
    case 'INGENUITY':
      return [
        fixRoomVariant(ctx),
        ...engineVariants(ctx),
        blocked(CARD_OPTION.CRAFT, 'Создать Предмет', 'Создание выполняется базовым Действием на панели инвентаря'),
      ];
    case 'DISMISS':
      return [
        blocked(
          'DISMISS',
          'Отменить Действие другого Игрока',
          'Одновременные Действия других Игроков пока не реализованы',
        ),
      ];
    case 'STEEL_NERVES':
      return [blocked('STEEL_NERVES', 'Реактивная карта', 'Движок предложит её сам при Внезапной Атаке', 'shield')];
    case 'SEARCH': {
      const white = getRoomDeckColor(ctx.room.definitionId ?? null) === 'WHITE';
      return [
        whenAvailable(
          {
            id: 'SEARCH',
            label: 'Провести Поиск',
            hint: 'Вытяните 2 карты, одну оставьте себе',
            icon: 'search',
            steps: white ? [singleStep('DECK_COLOR', 'Колода Предметов')] : [],
          },
          searchReason(ctx),
        ),
      ];
    }
    case 'SCAVENGE':
      return [
        whenAvailable(
          {
            id: 'SCAVENGE',
            label: 'Мародерство',
            hint: 'Счётчик Предметов −1 даже ниже нуля',
            icon: 'search',
            steps: [singleStep('DECK_COLOR', 'Колода Предметов')],
          },
          (['RED', 'YELLOW', 'GREEN'] as const).some((color) => ctx.view.decks.items[color].drawPileCount > 0)
            ? undefined
            : 'Все колоды Предметов пусты',
        ),
      ];
    case 'REST':
      return [
        whenAvailable(
          {
            id: 'REST',
            label: 'Просканировать Заражение',
            hint: 'Чистые карты удаляются из игры',
            icon: 'biohazard',
            steps: [],
          },
          ctx.contaminationCount === 0 ? 'На руке нет карт Заражения' : undefined,
        ),
      ];
    case 'DEMOLITION':
      return [
        whenAvailable(
          {
            id: 'DESTROY_DOOR',
            label: 'Разрушить Дверь',
            hint: 'Навсегда: Разрушенную Дверь не закрыть',
            icon: 'door',
            steps: [singleStep('ADJACENT_DOOR', 'Выберите Дверь')],
          },
          toggleableDoors(ctx, true).length > 0 ? undefined : 'В Коридорах вашего отсека нет целых Дверей',
        ),
        whenAvailable(
          {
            id: CARD_OPTION.MALFUNCTION,
            option: CARD_OPTION.MALFUNCTION,
            label: 'Неисправность в ваш отсек',
            icon: 'bolt',
            steps: [],
          },
          ctx.room.hasMalfunction ? 'В вашем отсеке уже стоит Неисправность' : undefined,
        ),
      ];
    case 'SHIP_KNOWLEDGE':
      return [
        doorVariant(ctx, true),
        whenAvailable(
          {
            id: CARD_OPTION.PEEK,
            option: CARD_OPTION.PEEK,
            label: 'Посмотреть Неисследованный отсек',
            hint: 'Тайно: тайл и жетон Исследования',
            icon: 'eye',
            steps: [singleStep('UNEXPLORED_ROOM', 'Выберите отсек')],
          },
          unexploredRooms(ctx).length > 0 ? undefined : 'Все отсеки исследованы',
        ),
      ];
    case 'COMPUTER_SKILLS':
      return [
        doorVariant(ctx, false),
        blocked(
          CARD_OPTION.ROOM_ACTION,
          'Бесплатное Действие отсека',
          'Бесплатные Действия отсеков пока не реализованы',
        ),
      ];
    case 'PILOTING':
      return [
        blocked('PILOTING', 'Бесплатное Действие или Координаты', 'Бесплатные Действия отсеков пока не реализованы'),
      ];
    case 'OLD_FRIEND':
      return [
        blocked(
          'OLD_FRIEND',
          'Бесплатное Действие отсека без Компьютера',
          'Бесплатные Действия отсеков пока не реализованы',
        ),
      ];
    case 'INTRANET':
      return [
        blocked('INTRANET', 'Действие другого отсека с Компьютером', 'Бесплатные Действия отсеков пока не реализованы'),
      ];
    case 'ACCESS_DENIED':
      return [
        whenAvailable(
          {
            id: CARD_OPTION.MALFUNCTION,
            option: CARD_OPTION.MALFUNCTION,
            label: 'Неисправность в отсек с Компьютером',
            icon: 'bolt',
            steps: [singleStep('COMPUTER_ROOM', 'Выберите отсек')],
          },
          !ctx.room.hasComputer
            ? 'Играется только в отсеке с Компьютером'
            : computerRooms(ctx).length === 0
              ? 'Нет отсеков с Компьютером без Неисправности'
              : undefined,
        ),
        blocked(
          CARD_OPTION.ROOM_ACTION,
          'Бесплатное Действие этого отсека',
          'Бесплатные Действия отсеков пока не реализованы',
        ),
      ];
    case 'THREAT_ASSESSMENT': {
      const reason = !ctx.room.hasComputer
        ? 'Играется только в отсеке с Компьютером'
        : ctx.view.decks.events.drawPileCount + ctx.view.decks.events.discard.length === 0
          ? 'Колода Событий пуста'
          : undefined;
      return [
        whenAvailable(
          {
            id: CARD_OPTION.KEEP_TOP,
            option: CARD_OPTION.KEEP_TOP,
            label: 'Посмотреть и оставить сверху',
            icon: 'eye',
            steps: [],
          },
          reason,
        ),
        whenAvailable(
          {
            id: CARD_OPTION.MOVE_BOTTOM,
            option: CARD_OPTION.MOVE_BOTTOM,
            label: 'Посмотреть и убрать под низ',
            icon: 'eye',
            steps: [],
          },
          reason,
        ),
      ];
    }
    case 'TECH_CORRIDORS':
      return [
        whenAvailable(
          {
            id: 'TECH_MOVE',
            label: 'Перейти через Технические Коридоры и спасовать',
            hint: 'Без броска Шума',
            icon: 'move',
            steps: [singleStep('TECH_ROOM', 'Отсек назначения')],
          },
          !ctx.room.hasTechnicalCorridorEntrance
            ? 'В вашем отсеке нет Входа в Технические Коридоры'
            : techRooms(ctx).length === 0
              ? 'Нет другого отсека со Входом'
              : undefined,
        ),
      ];
    case 'RECONNAISSANCE':
      return [
        whenAvailable(
          {
            id: 'MOVE',
            label: 'Тихо перейти в соседний отсек',
            hint: 'Без броска Шума',
            icon: 'move',
            steps: [singleStep('ADJACENT_ROOM', 'Отсек назначения')],
          },
          adjacentOpenRoomIds(ctx).length > 0 ? undefined : 'Нет открытых соседних отсеков',
        ),
      ];
    case 'PYROTECHNIC': {
      const items = ctx.player.inventory ?? [];
      return [
        whenAvailable(
          {
            id: CARD_OPTION.EXTINGUISH,
            option: CARD_OPTION.EXTINGUISH,
            label: 'Потушить Пожар в вашем отсеке',
            icon: 'fire',
            steps: [],
          },
          ctx.room.hasFire ? undefined : 'В вашем отсеке нет Пожара',
        ),
        whenAvailable(
          {
            id: CARD_OPTION.PLACE_FIRE,
            option: CARD_OPTION.PLACE_FIRE,
            label: 'Разжечь Пожар в вашем отсеке',
            hint: 'Цена — любой Предмет из инвентаря',
            icon: 'fire',
            steps: [singleStep('INVENTORY_ITEM', 'Какой Предмет сбросить')],
          },
          ctx.room.hasFire ? 'В отсеке уже Пожар' : items.length === 0 ? 'Нет Предмета для сброса' : undefined,
        ),
      ];
    }
    case 'SUPPRESSIVE_FIRE':
      return [repositionVariant(ctx, effect.variant === 'SOLDIER' ? 2 : 1)];
    case 'BURST_FIRE':
      return [shootVariant(ctx, 'BURST_SHOOT', 'Очередь по Чужому', 'Весь Боезапас: +1 Рана за каждые 2 ед.')];
    case 'AIMED_FIRE':
      return [shootVariant(ctx, 'AIMED_SHOOT', 'Прицельный выстрел', 'Можно один раз перебросить кубик Боя')];
    case 'ADRENALINE':
      return [
        shootVariant(ctx, 'ADRENALINE_SHOOT', 'Стрельба и добор карты', 'Обычная Стрельба, затем 1 карта Действия'),
        whenAvailable(
          {
            id: 'ADRENALINE_ESCAPE',
            combat: 'ADRENALINE_ESCAPE',
            label: 'Побег и добор карты',
            hint: 'Обычный Побег с Атаками Чужих',
            icon: 'move',
            steps: [singleStep('ADJACENT_ROOM', 'Куда бежать')],
          },
          adjacentOpenRoomIds(ctx).length > 0 ? undefined : 'Нет открытых соседних отсеков',
        ),
      ];
  }
}

export function getActionCardUsage(card: ActionCard, view: SanitizedGameState): CardUsage {
  return {
    title: card.name,
    typeLine: `Карта Действия · ${CREW_IDENTITIES[card.characterClass].label}`,
    description: card.description,
    cost: card.playCost,
    accent: 'ACTION',
    badges: card.playCost === 0 ? ['Без доплаты'] : [`Доплата: ${card.playCost}`],
    variants: variantsFor(card, buildContext(view)),
  };
}
