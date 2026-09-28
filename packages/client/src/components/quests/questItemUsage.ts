import { getRoomDeckColor, questDefinition, questItemCardId, type ItemCard } from '@nemesis/shared';
import { blocked, searchReason, whenAvailable } from '../hand/actionCardUsage';
import {
  adjacentCorridors,
  hasAvailableComputer,
  livingOtherPlayers,
  studyableObjectKinds,
  type UsageContext,
} from '../hand/usageContext';
import { singleStep, type UsageVariant } from '../hand/usageTypes';

export function evacuationKeyVariant(ctx: UsageContext): UsageVariant {
  const inPodRoom = ctx.room.definitionId === 'ESCAPE_POD_A' || ctx.room.definitionId === 'ESCAPE_POD_B';
  return whenAvailable(
    {
      id: 'EVAC_KEY',
      label: 'Разблокировать или заблокировать Капсулу',
      icon: 'lock',
      steps: [singleStep('ESCAPE_POD', 'Выберите Капсулу')],
    },
    inPodRoom ? undefined : 'Нужно находиться в Спасательном Отсеке',
  );
}

function questKeyOf(item: ItemCard, ctx: UsageContext) {
  return (ctx.player.questItems ?? []).find((quest) => questItemCardId(quest.id) === item.id)?.questKey ?? null;
}

export function questItemVariants(item: ItemCard, ctx: UsageContext): UsageVariant[] {
  const key = questKeyOf(item, ctx);
  if (!key) return [blocked('QUEST', 'Использовать', 'Квестовый Предмет принадлежит другому Персонажу')];
  const definition = questDefinition(key);
  switch (key) {
    case 'EVACUATION_KEY':
      return [evacuationKeyVariant(ctx)];
    case 'PLASMA_TORCH':
      return [
        whenAvailable(
          {
            id: 'TORCH',
            label: 'Открыть, закрыть или заварить Дверь',
            hint: 'Работает и с Разрушенными Дверями',
            icon: 'fire',
            steps: [singleStep('ADJACENT_DOOR_ANY_STATE', 'Выберите Дверь')],
          },
          adjacentCorridors(ctx).length > 0 ? undefined : 'У вашей комнаты нет Коридоров',
        ),
      ];
    case 'FLASHLIGHT': {
      const white = getRoomDeckColor(ctx.room.definitionId ?? null) === 'WHITE';
      return [
        whenAvailable(
          {
            id: 'SEARCH',
            label: 'Обыскать комнату с Фонариком',
            icon: 'search',
            steps: white ? [singleStep('DECK_COLOR', 'Колода Предметов')] : [],
          },
          searchReason(ctx),
        ),
      ];
    }
    case 'SECURITY_KEY':
      return [
        whenAvailable(
          {
            id: 'SECURITY',
            label: 'Открыть или Закрыть Двери выбранной Комнаты',
            hint: 'Отмеченные Двери будут Закрыты, остальные — Открыты',
            icon: 'door',
            steps: [
              singleStep('ANY_ROOM', 'Выберите Комнату'),
              { kind: 'ROOM_DOORS_TO_CLOSE', title: 'Какие Двери Закрыть', min: 0, max: 6 },
            ],
          },
          undefined,
        ),
      ];
    case 'SHIP_LOG':
      return [
        whenAvailable(
          {
            id: 'SHIP_LOG',
            label: 'Посмотреть карту Цели Персонажа',
            icon: 'eye',
            steps: [singleStep('PLAYER_ANY_OTHER', 'Выберите Персонажа')],
          },
          !hasAvailableComputer(ctx)
            ? 'Нужна Комната с исправным Компьютером'
            : livingOtherPlayers(ctx).length === 0
              ? 'Нет других живых Персонажей'
              : undefined,
        ),
      ];
    case 'LAB_EQUIPMENT':
      return [
        whenAvailable(
          {
            id: 'LAB_EQUIPMENT',
            label: 'Изучить Слабость Чужих',
            icon: 'biohazard',
            steps: [singleStep('STUDY_OBJECT', 'Выберите Объект')],
          },
          studyableObjectKinds(ctx).length > 0
            ? undefined
            : 'Нет Трупа, Останков или Яйца с неизученной Слабостью в вашей Комнате',
        ),
      ];
    default:
      return [
        blocked(
          'QUEST',
          definition.name,
          definition.effectMode === 'PASSIVE'
            ? 'Пассивный эффект: действует постоянно'
            : definition.effectMode === 'REACTIVE'
              ? 'Сработает сама при следующей Атаке Чужого'
              : 'Эффект появится вместе с механикой, от которой он зависит',
          'shield',
        ),
      ];
  }
}
