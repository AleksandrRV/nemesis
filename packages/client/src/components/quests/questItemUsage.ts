import { getRoomDeckColor, questDefinition, questItemCardId, type ItemCard } from '@nemesis/shared';
import { blocked, searchReason, whenAvailable } from '../hand/actionCardUsage';
import { adjacentCorridors, type UsageContext } from '../hand/usageContext';
import { singleStep, type UsageVariant } from '../hand/usageTypes';

function questKeyOf(item: ItemCard, ctx: UsageContext) {
  return (ctx.player.questItems ?? []).find((quest) => questItemCardId(quest.id) === item.id)?.questKey ?? null;
}

export function questItemVariants(item: ItemCard, ctx: UsageContext): UsageVariant[] {
  const key = questKeyOf(item, ctx);
  if (!key) return [blocked('QUEST', 'Использовать', 'Квестовый Предмет принадлежит другому Персонажу')];
  const definition = questDefinition(key);
  switch (key) {
    case 'EVACUATION_KEY': {
      const inPodRoom = ctx.room.definitionId === 'ESCAPE_POD_A' || ctx.room.definitionId === 'ESCAPE_POD_B';
      return [
        whenAvailable(
          {
            id: 'EVAC_KEY',
            label: 'Разблокировать или заблокировать Капсулу',
            icon: 'lock',
            steps: [singleStep('ESCAPE_POD', 'Выберите Капсулу')],
          },
          inPodRoom ? undefined : 'Нужно находиться в Спасательном отсеке',
        ),
      ];
    }
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
            label: 'Переключить все Двери комнаты',
            hint: 'Если есть открытые — все закроются, иначе все откроются',
            icon: 'door',
            steps: [singleStep('ANY_ROOM', 'Выберите комнату')],
          },
          undefined,
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
