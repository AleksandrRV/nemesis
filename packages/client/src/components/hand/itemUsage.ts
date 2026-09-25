import {
  CARD_OPTION,
  getItemEffectKind,
  getRoomDeckColor,
  type ItemCard,
  type SanitizedGameState,
} from '@nemesis/shared';
import {
  adjacentOpenRoomIds,
  buildContext,
  hasDrawableCards,
  intruderRoomsNearby,
  intrudersInRoom,
  neighbourRoomIds,
  otherOccupants,
  techRooms,
  unexploredRooms,
  yellowRooms,
  type UsageContext,
} from './usageContext';
import { blocked, doorVariant, engineVariants, fixRoomVariant, whenAvailable } from './actionCardUsage';
import { singleStep, type CardUsage, type UsageVariant } from './usageTypes';

const COLOR_LABELS: Record<ItemCard['color'], string> = {
  RED: 'Красная колода',
  YELLOW: 'Жёлтая колода',
  GREEN: 'Зелёная колода',
  BLUE: 'Создаваемый',
};

function untreated(ctx: UsageContext): boolean {
  return ctx.player.seriousWounds.some((wound) => !wound.isTreated);
}

function treated(ctx: UsageContext): boolean {
  return ctx.player.seriousWounds.some((wound) => wound.isTreated);
}

function treatVariant(ctx: UsageContext): UsageVariant {
  return whenAvailable(
    {
      id: CARD_OPTION.TREAT_SERIOUS,
      option: CARD_OPTION.TREAT_SERIOUS,
      label: 'Обработать Тяжёлую Травму',
      icon: 'heal',
      steps: [],
    },
    untreated(ctx) ? undefined : 'Необработанных Тяжёлых Травм нет',
  );
}

function healLightVariant(ctx: UsageContext): UsageVariant {
  return whenAvailable(
    {
      id: CARD_OPTION.HEAL_LIGHT,
      option: CARD_OPTION.HEAL_LIGHT,
      label: 'Вылечить все Лёгкие Травмы',
      icon: 'heal',
      steps: [],
    },
    ctx.player.lightWounds > 0 ? undefined : 'Лёгких Травм нет',
  );
}

function nearbyIntruderReason(ctx: UsageContext): string | undefined {
  return intruderRoomsNearby(ctx).length > 0 ? undefined : 'Ни в вашем, ни в соседних отсеках нет Чужих';
}

function variantsFor(item: ItemCard, ctx: UsageContext): UsageVariant[] {
  const kind = getItemEffectKind(item);
  switch (kind) {
    case 'WEAPON':
      return [blocked('WEAPON', 'Оружие', 'Оружие применяется Действием «Стрельба» в Бою', 'ammo')];
    case 'ENERGY_CHARGE': {
      const weapon = ctx.energyWeapon;
      const reason = !weapon
        ? 'В слотах рук нет Энергооружия'
        : weapon.maxAmmo !== null && (weapon.ammo ?? 0) >= weapon.maxAmmo
          ? `«${weapon.name}» уже заряжен полностью`
          : undefined;
      return [
        whenAvailable(
          {
            id: CARD_OPTION.CHARGE,
            option: CARD_OPTION.CHARGE,
            label: `Полностью зарядить ${weapon?.name ?? 'Энергооружие'}`,
            icon: 'ammo',
            steps: [],
          },
          reason,
        ),
        doorVariant(ctx, true),
      ];
    }
    case 'EXTENDED_MAGAZINE':
      return [
        whenAvailable(
          {
            id: 'ATTACH',
            label: `Прикрепить к ${ctx.energyWeapon?.name ?? 'Энергооружию'}`,
            hint: '+2 Боезапаса и +2 к пределу; карта остаётся на оружии',
            icon: 'ammo',
            steps: [],
          },
          ctx.energyWeapon ? undefined : 'В слотах рук нет Энергооружия',
        ),
      ];
    case 'GRENADE':
      return [
        whenAvailable(
          {
            id: 'THROW',
            label: 'Бросить в Чужого',
            hint: 'Цель — 2 Раны; остальные в отсеке, включая Персонажей, — по 1',
            icon: 'intruder',
            steps: [singleStep('INTRUDER_NEARBY', 'Выберите Чужого')],
          },
          nearbyIntruderReason(ctx),
        ),
      ];
    case 'SMOKE_GRENADE':
      return [
        whenAvailable(
          {
            id: 'MOVE',
            label: 'Уйти в дыму',
            hint: 'Движение без Атак Чужих; кубик Шума бросается',
            icon: 'move',
            steps: [singleStep('ADJACENT_ROOM', 'Отсек назначения')],
          },
          otherOccupants(ctx).length > 0
            ? 'Пока работает, только когда вы одни в отсеке: сброс карт другими Игроками не реализован'
            : adjacentOpenRoomIds(ctx).length === 0
              ? 'Нет открытых соседних отсеков'
              : undefined,
        ),
      ];
    case 'DECOY':
      return [
        whenAvailable(
          {
            id: 'HERD',
            label: 'Приманить Чужих',
            hint: 'Чужие из других соседних отсеков уходят в выбранный',
            icon: 'intruder',
            steps: [singleStep('NEIGHBOUR_ROOM', 'Куда приманить')],
          },
          neighbourRoomIds(ctx).some((roomId) => intrudersInRoom(ctx, roomId).length > 0)
            ? undefined
            : 'В соседних отсеках нет Чужих',
        ),
      ];
    case 'RECON_DRONE':
      return [
        whenAvailable(
          {
            id: CARD_OPTION.PEEK,
            label: 'Разведать отсек',
            hint: 'Тайно: тайл и жетон Исследования',
            icon: 'eye',
            steps: [singleStep('UNEXPLORED_ROOM', 'Выберите отсек')],
          },
          unexploredRooms(ctx).length > 0 ? undefined : 'Все отсеки исследованы',
        ),
      ];
    case 'NEMESIS_PLANS': {
      const count = unexploredRooms(ctx).length;
      return [
        whenAvailable(
          {
            id: CARD_OPTION.PEEK,
            label: 'Изучить планы двух отсеков',
            hint: 'Тайно, без жетонов Исследования',
            icon: 'eye',
            steps: [{ kind: 'UNEXPLORED_ROOM', title: 'Выберите два отсека', min: Math.min(2, count), max: 2 }],
          },
          count > 0 ? undefined : 'Все отсеки исследованы',
        ),
      ];
    }
    case 'MILITARY_STIMULANTS':
      return [
        whenAvailable(
          {
            id: 'DISCARD_DRAW',
            label: 'Сбросить карты и взять на одну больше',
            hint: 'Можно выбрать 0 карт; Заражение тоже можно',
            icon: 'card',
            steps: [
              { kind: 'HAND_CARD', title: 'Какие карты сбросить', min: 0, max: ctx.player.actionDeck.hand.length },
            ],
          },
          hasDrawableCards(ctx) || ctx.player.actionDeck.hand.length > 0 ? undefined : 'Колода и сброс пусты',
        ),
      ];
    case 'DUCT_TAPE':
      return [
        fixRoomVariant(ctx),
        ...engineVariants(ctx),
        blocked(
          CARD_OPTION.COMBINE_HEAVY,
          'Соединить 2 Тяжёлых предмета',
          'Объединение слотов рук пока не реализовано',
        ),
      ];
    case 'TOOLS':
      return [fixRoomVariant(ctx), ...engineVariants(ctx), doorVariant(ctx, false)];
    case 'FIRE_EXTINGUISHER':
      return [
        whenAvailable(
          {
            id: CARD_OPTION.EXTINGUISH,
            option: CARD_OPTION.EXTINGUISH,
            label: 'Потушить Пожар',
            icon: 'fire',
            steps: [],
          },
          ctx.room.hasFire ? undefined : 'В вашем отсеке нет Пожара',
        ),
        whenAvailable(
          {
            id: CARD_OPTION.RETREAT,
            option: CARD_OPTION.RETREAT,
            label: 'Заставить Чужого Отступить',
            icon: 'intruder',
            steps: [singleStep('INTRUDER_IN_ROOM', 'Выберите Чужого')],
          },
          intrudersInRoom(ctx).length > 0 ? undefined : 'В вашем отсеке нет Чужих',
        ),
      ];
    case 'TECH_CORRIDOR_PLANS':
      return [
        whenAvailable(
          {
            id: 'TECH_MOVE',
            label: 'Перейти через Технические Коридоры',
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
    case 'SPACE_SUIT':
      return [
        whenAvailable(
          {
            id: 'MOVE',
            label: 'Выйти в открытый космос',
            hint: 'Все карты Действий с руки уходят в сброс',
            icon: 'move',
            steps: [singleStep('YELLOW_ROOM', 'Жёлтый отсек назначения')],
          },
          getRoomDeckColor(ctx.room.definitionId ?? null) !== 'YELLOW'
            ? 'Работает только в Жёлтом отсеке'
            : yellowRooms(ctx).length === 0
              ? 'Нет другого Жёлтого отсека'
              : undefined,
        ),
      ];
    case 'BANDAGES':
      return [treatVariant(ctx), healLightVariant(ctx)];
    case 'MEDKIT':
      return [
        treatVariant(ctx),
        whenAvailable(
          {
            id: CARD_OPTION.HEAL_TREATED,
            option: CARD_OPTION.HEAL_TREATED,
            label: 'Вылечить Обработанную Тяжёлую Травму',
            icon: 'heal',
            steps: [],
          },
          treated(ctx) ? undefined : 'Обработанных Тяжёлых Травм нет',
        ),
        healLightVariant(ctx),
      ];
    case 'ALCOHOL':
      return [
        whenAvailable(
          {
            id: 'DRINK',
            label: 'Удалить карту Заражения',
            hint: 'Если в ней была Инфекция — возьмите новую карту Заражения',
            icon: 'biohazard',
            steps: [singleStep('CONTAMINATION_CARD', 'Какую карту Заражения')],
          },
          ctx.contaminationCount > 0 ? undefined : 'На руке нет карт Заражения',
        ),
      ];
    case 'CLOTHES':
      return [
        whenAvailable(
          {
            id: CARD_OPTION.SLIME,
            option: CARD_OPTION.SLIME,
            label: 'Сбросить маркер Слизи',
            icon: 'shield',
            steps: [],
          },
          ctx.player.hasSlime ? undefined : 'На планшете нет Слизи',
        ),
        treatVariant(ctx),
      ];
    case 'ADRENALINE_INJECTION':
      return [
        whenAvailable(
          {
            id: 'INJECT',
            label: 'Сделать инъекцию',
            hint: 'Возьмите карту; до Паса — без лимита Действий',
            icon: 'bolt',
            steps: [],
          },
          ctx.player.hasAdrenalineRush ? 'Инъекция уже действует в этом ходу' : undefined,
        ),
      ];
    case 'SYNTHETIC_FOOD':
      return [
        whenAvailable(
          { id: 'EAT', label: 'Взять 2 карты Действий', icon: 'card', steps: [] },
          hasDrawableCards(ctx) ? undefined : 'Колода Действий и сброс пусты',
        ),
      ];
    case 'ANTIDOTE':
      return [
        whenAvailable(
          {
            id: 'ANTIDOTE',
            label: 'Очистить колоду и спасовать',
            hint: 'Удаляются Инфекции и Личинка; затем 1 карта Заражения и Пас',
            icon: 'biohazard',
            steps: [],
          },
          undefined,
        ),
      ];
    case 'TASER':
      return [
        whenAvailable(
          {
            id: CARD_OPTION.STUN_INTRUDER,
            option: CARD_OPTION.STUN_INTRUDER,
            label: 'Оглушить Чужого',
            hint: '1 Рана и Отступление',
            icon: 'intruder',
            steps: [singleStep('INTRUDER_IN_ROOM', 'Выберите Чужого')],
          },
          intrudersInRoom(ctx).length > 0 ? undefined : 'В вашем отсеке нет Чужих',
        ),
        whenAvailable(
          {
            id: CARD_OPTION.DISARM_CHARACTER,
            option: CARD_OPTION.DISARM_CHARACTER,
            label: 'Обезоружить Персонажа',
            hint: 'Он сбрасывает все карты с руки',
            icon: 'player',
            steps: [singleStep('PLAYER_OTHER_IN_ROOM', 'Выберите Персонажа')],
          },
          otherOccupants(ctx).length > 0 ? undefined : 'В вашем отсеке нет других Персонажей',
        ),
      ];
    case 'MOLOTOV':
      return [
        whenAvailable(
          {
            id: 'THROW',
            label: 'Поджечь отсек с Чужим',
            hint: 'Пожар; Чужие — 1 Рана, Персонажи — Тяжёлая Травма',
            icon: 'fire',
            steps: [singleStep('INTRUDER_ROOM', 'Выберите отсек')],
          },
          nearbyIntruderReason(ctx),
        ),
      ];
    case 'UNKNOWN':
      return [blocked('UNKNOWN', 'Использовать', 'Эффект этого Предмета пока не реализован')];
  }
}

function itemBadges(item: ItemCard, location: 'INVENTORY' | 'HAND_SLOT'): string[] {
  const badges = [location === 'HAND_SLOT' ? 'В руке' : 'В инвентаре'];
  if (item.isHeavy) badges.push('Тяжёлый');
  badges.push(item.isSingleUse ? 'Одноразовый' : 'Многоразовый');
  if (item.isWeapon && item.maxAmmo !== null) badges.push(`Боезапас ${item.ammo ?? 0}/${item.maxAmmo}`);
  return badges;
}

export function getItemUsage(item: ItemCard, view: SanitizedGameState, location: 'INVENTORY' | 'HAND_SLOT'): CardUsage {
  const ctx = buildContext(view);
  return {
    title: item.name,
    typeLine: `Предмет · ${COLOR_LABELS[item.color]}`,
    description: item.description,
    cost: item.actionCost,
    accent: item.color,
    badges: itemBadges(item, location),
    variants: variantsFor(item, ctx),
  };
}
