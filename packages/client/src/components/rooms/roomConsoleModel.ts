import {
  ADDITIONAL_ROOMS_2,
  BASIC_ROOMS_1,
  CARD_OPTION,
  ROOM_OPTION,
  SELF_DESTRUCT_IRREVERSIBLE_AT,
  SPECIAL_ROOMS,
  hasFreeHandSlot,
  type CourseMarker,
  type ItemDeckColor,
  type RoomAbilityPayload,
  type RoomDefinition,
  type SanitizedGameState,
} from '@nemesis/shared';
import {
  buildContext,
  decompressionRooms,
  engineRoomNumber,
  unexploredRooms,
  type UsageContext,
} from '../hand/usageContext';
import { singleStep, type TargetSelection, type UsageVariant } from '../hand/usageTypes';

export const ROOM_CONSOLE_COST = 2;

export type RoomConsolePayload = Omit<RoomAbilityPayload, 'discardCardIds'>;

export interface RoomConsoleVariant extends UsageVariant {
  payload: RoomConsolePayload;
}

export interface RoomConsole {
  definitionId: string;
  title: string;
  description: string;
  cost: number;
  variants: RoomConsoleVariant[];
}

const OWN_PANEL_ROOMS = new Set(['LABORATORY', 'HIBERNATORIUM', 'ESCAPE_POD_A', 'ESCAPE_POD_B', 'HATCH_CONTROL']);

const ROOM_DEFINITIONS: readonly RoomDefinition[] = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

export function roomDefinitionOf(definitionId: string | null | undefined): RoomDefinition | null {
  return ROOM_DEFINITIONS.find((definition) => definition.id === definitionId) ?? null;
}

type VariantSeed = Omit<RoomConsoleVariant, 'available' | 'steps' | 'payload'> &
  Partial<Pick<RoomConsoleVariant, 'steps' | 'payload'>>;

function variant(seed: VariantSeed, reason?: string): RoomConsoleVariant {
  return { steps: [], payload: {}, ...seed, available: reason === undefined, reason };
}

function hasContamination(ctx: UsageContext): string | undefined {
  return ctx.contaminationCount > 0 ? undefined : 'На руке нет карт Заражения';
}

function infirmaryVariants(ctx: UsageContext): RoomConsoleVariant[] {
  const wounds = ctx.player.seriousWounds;
  return [
    variant(
      {
        id: 'TREAT',
        label: 'Обработать все Тяжёлые Травмы',
        icon: 'heal',
        payload: { option: CARD_OPTION.TREAT_SERIOUS },
      },
      wounds.some((wound) => !wound.isTreated) ? undefined : 'Нет необработанных Тяжёлых Травм',
    ),
    variant(
      {
        id: 'HEAL_SERIOUS',
        label: 'Вылечить 1 обработанную Тяжёлую Травму',
        icon: 'heal',
        payload: { option: 'HEAL_SERIOUS' },
      },
      wounds.some((wound) => wound.isTreated) ? undefined : 'Нет обработанных Тяжёлых Травм',
    ),
    variant(
      {
        id: 'HEAL_LIGHT',
        label: 'Вылечить все Лёгкие Травмы',
        icon: 'heal',
        payload: { option: CARD_OPTION.HEAL_LIGHT },
      },
      ctx.player.lightWounds > 0 ? undefined : 'Лёгких Травм нет',
    ),
  ];
}

function generatorVariant(view: SanitizedGameState): RoomConsoleVariant {
  const position = view.meta.selfDestructTrackPosition;
  if (position === null) {
    const sleeping = Object.values(view.players).some((player) => player.isInHibernation);
    return variant(
      {
        id: 'SELF_DESTRUCT',
        label: 'Запустить Самоуничтожение',
        hint: 'Капсулы откроются на жёлтом делении',
        icon: 'bolt',
      },
      sleeping ? 'Кто-то в Анабиозе — запуск запрещён' : undefined,
    );
  }
  return variant(
    { id: 'SELF_DESTRUCT', label: 'Остановить Самоуничтожение', icon: 'bolt' },
    position >= SELF_DESTRUCT_IRREVERSIBLE_AT ? 'Маркер на жёлтом делении — процесс не остановить' : undefined,
  );
}

function flightControlVariants(ctx: UsageContext): RoomConsoleVariant[] {
  const sleeping = Object.values(ctx.view.players).some((player) => player.isInHibernation);
  return [
    variant({
      id: 'CHECK_COORDINATES',
      label: 'Проверить Координаты',
      hint: 'Тайно: куда ведёт каждый маркер Курса',
      icon: 'eye',
      payload: { option: ROOM_OPTION.CHECK_COORDINATES },
    }),
    variant(
      {
        id: 'SET_COURSE',
        label: 'Установить Курс',
        hint: `Сейчас маркер на Координатах ${ctx.view.ship.coordinates.currentCourseMarker}`,
        icon: 'course',
        steps: [singleStep('COURSE_MARKER', 'Новые Координаты')],
        payload: { option: ROOM_OPTION.SET_COURSE },
      },
      sleeping ? 'Кто-то в Анабиозе — Курс менять нельзя' : undefined,
    ),
  ];
}

function hygieneVariants(ctx: UsageContext, kind: 'CANTEEN' | 'SHOWER'): RoomConsoleVariant[] {
  const nothingToClean = kind === 'CANTEEN' ? ctx.player.lightWounds === 0 : !ctx.player.hasSlime;
  const base = kind === 'CANTEEN' ? 'Перекусить: вылечить 1 Лёгкую Травму' : 'Принять душ: смыть Слизь';
  return [
    variant(
      { id: kind, label: base, icon: 'heal' },
      nothingToClean ? (kind === 'CANTEEN' ? 'Лёгких Травм нет' : 'Слизи нет') : undefined,
    ),
    variant(
      {
        id: `${kind}_SCAN`,
        label: `${base} и просканировать руку`,
        hint: 'Карты без ИНФЕКЦИИ уйдут; ИНФЕКЦИЯ — Личинка на планшет',
        icon: 'biohazard',
        payload: { scanContamination: true },
      },
      hasContamination(ctx),
    ),
  ];
}

function roomVariants(ctx: UsageContext, definitionId: string): RoomConsoleVariant[] {
  switch (definitionId) {
    case 'ARMORY':
      return [
        variant(
          { id: 'RECHARGE', label: 'Перезарядить энергооружие', icon: 'ammo' },
          ctx.energyWeapon ? undefined : 'В руках нет энергооружия',
        ),
      ];
    case 'COMM_ROOM':
      return [
        variant(
          { id: 'SIGNAL', label: 'Отправить Сигнал', icon: 'bolt' },
          ctx.player.hasSignalSent ? 'Сигнал уже отправлен' : undefined,
        ),
      ];
    case 'INFIRMARY':
      return infirmaryVariants(ctx);
    case 'GENERATOR':
      return [generatorVariant(ctx.view)];
    case 'FIRE_CONTROL':
      return [
        variant({
          id: 'SUPPRESS',
          label: 'Запустить пожаротушение',
          hint: 'Пожар гаснет, Чужие в Комнате Отступают',
          icon: 'fire',
          steps: [singleStep('ANY_ROOM', 'Комната')],
        }),
      ];
    case 'STORAGE':
      return [
        variant({
          id: 'STORAGE',
          label: 'Поискать на Складе',
          hint: 'Счётчик Предметов не уменьшается',
          icon: 'search',
          steps: [singleStep('DECK_COLOR', 'Колода Предметов')],
        }),
      ];
    case 'NEST':
      return [
        variant(
          { id: 'EGG', label: 'Взять Яйцо Чужих', icon: 'biohazard' },
          ctx.view.intrudersPool.eggsOnBoard <= 0
            ? 'Яиц не осталось'
            : hasFreeHandSlot(ctx.player)
              ? undefined
              : 'Нет свободного слота Руки',
        ),
      ];
    case 'SURGERY':
      return [
        variant({
          id: 'SURGERY',
          label: 'Провести операцию',
          hint: 'Удалит ИНФЕКЦИЮ и Личинку; 1 Лёгкая Травма и Пас',
          icon: 'biohazard',
        }),
      ];
    case 'ENGINE_01':
    case 'ENGINE_02':
    case 'ENGINE_03':
      return [
        variant({
          id: 'ENGINE',
          label: `Проверить Двигатель №${engineRoomNumber(ctx)}`,
          hint: 'Тайно: вы не обязаны говорить правду',
          icon: 'engine',
        }),
      ];
    case 'ENGINE_CONTROL':
      return [
        variant({
          id: 'ENGINES',
          label: 'Проверить все 3 Двигателя',
          hint: 'Тайно; менять состояние здесь нельзя',
          icon: 'engine',
        }),
      ];
    case 'COCKPIT':
      return flightControlVariants(ctx);
    case 'OBSERVATION_ROOM':
      return [
        variant(
          {
            id: 'OBSERVE',
            label: 'Посмотреть неисследованную Комнату',
            hint: 'Тайно: тайл и жетон Исследования',
            icon: 'eye',
            steps: [singleStep('UNEXPLORED_ROOM', 'Отсек')],
          },
          unexploredRooms(ctx).length > 0 ? undefined : 'Неисследованных отсеков не осталось',
        ),
      ];
    case 'COMMAND_CENTER':
      return [
        variant({
          id: 'DOORS',
          label: 'Открыть или Закрыть Двери Комнаты',
          hint: 'Отмеченные Двери закроются, остальные откроются',
          icon: 'door',
          steps: [
            singleStep('DOOR_ROOM', 'Комната'),
            { kind: 'ROOM_DOORS_TO_CLOSE', title: 'Какие Двери Закрыть', min: 0, max: 6 },
          ],
        }),
      ];
    case 'AIRLOCK_CONTROL':
      return [
        variant(
          {
            id: 'DECOMPRESSION',
            label: 'Запустить Экстренную Декомпрессию',
            hint: 'Если до конца Фазы Игроков Двери не откроют — все внутри погибнут',
            icon: 'lock',
            steps: [singleStep('DECOMPRESSION_ROOM', 'Жёлтая Комната')],
          },
          decompressionRooms(ctx).length > 0 ? undefined : 'Нет жёлтой Комнаты без Разрушенных Дверей',
        ),
      ];
    case 'CANTEEN':
    case 'SHOWER':
      return hygieneVariants(ctx, definitionId);
    default:
      return [];
  }
}

function blockedEverywhere(ctx: UsageContext): string | undefined {
  if (ctx.room.hasMalfunction) return 'Неисправность в Комнате: сначала почините её';
  if (ctx.view.intrudersPool.boardTokens.some((token) => token.roomId === ctx.room.id)) {
    return 'В Бою Действия Комнат запрещены';
  }
  return undefined;
}

export function getRoomConsole(view: SanitizedGameState): RoomConsole | null {
  const ctx = buildContext(view);
  const definition = roomDefinitionOf(ctx.room.definitionId);
  if (!definition || !ctx.room.isExplored || definition.actionCost === 0 || OWN_PANEL_ROOMS.has(definition.id)) {
    return null;
  }
  const blocker = blockedEverywhere(ctx);
  const variants = roomVariants(ctx, definition.id).map((entry) =>
    blocker ? { ...entry, available: false, reason: blocker } : entry,
  );
  return {
    definitionId: definition.id,
    title: definition.name,
    description: definition.actionDescription,
    cost: ROOM_CONSOLE_COST,
    variants,
  };
}

export function buildRoomAbilityPayload(
  variantToUse: RoomConsoleVariant,
  selection: TargetSelection,
): RoomConsolePayload {
  const payload: RoomConsolePayload = { ...variantToUse.payload };
  variantToUse.steps.forEach((step, index) => {
    const ids = selection[index] ?? [];
    const first = ids[0];
    switch (step.kind) {
      case 'ANY_ROOM':
      case 'DOOR_ROOM':
      case 'DECOMPRESSION_ROOM':
      case 'UNEXPLORED_ROOM':
        if (first !== undefined) payload.targetRoomId = Number(first);
        return;
      case 'DECK_COLOR':
        if (first !== undefined) payload.targetDeckColor = first as ItemDeckColor;
        return;
      case 'COURSE_MARKER':
        if (first !== undefined) payload.targetCourseMarker = first as CourseMarker;
        return;
      case 'ROOM_DOORS_TO_CLOSE':
        payload.closedCorridorIds = [...ids];
        return;
      default:
        return;
    }
  });
  return payload;
}
