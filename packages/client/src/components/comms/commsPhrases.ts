import type {
  CommitmentStatus,
  CommsClaim,
  CommsDraft,
  CommsIntent,
  CommsKind,
  CommsMessage,
  CommsReaction,
  CommsRequestTopic,
  ItemNeed,
  SanitizedGameState,
} from '@nemesis/shared';
import { DESTINATION_LABELS } from '../endgame/endgameModel';
import { corridorLabel, playerName, roomLabel } from '../log/gameLogModel';
import { roomDefinitionName } from '../log/roomNames';

export const COMMS_KIND_LABELS: Record<CommsKind, string> = {
  SYSTEM: 'Системное объявление',
  CLAIM: 'Заявление',
  INTENT: 'Намерение',
  REQUEST: 'Просьба',
  ANSWER: 'Ответ',
  REACTION: 'Реакция',
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  OPEN: 'обещано',
  FULFILLED: 'выполнено',
  BROKEN: 'нарушено',
  EXPIRED: 'истекло',
};

const ITEM_NEED_LABELS: Record<Exclude<ItemNeed, 'SPECIFIC'>, string> = {
  WEAPON: 'Оружие',
  ENERGY_CHARGE: 'Энергозаряд',
  EXTENDED_MAGAZINE: 'Увеличенный магазин',
  HEALING: 'лечение',
};

function roomTypeName(definitionId: string): string {
  return roomDefinitionName(definitionId) ?? definitionId;
}

function podName(view: SanitizedGameState, podId: string): string {
  const pod = view.ship.escapePods[podId];
  return pod ? `Капсула ${pod.number}` : 'Капсула';
}

export function claimText(view: SanitizedGameState, claim: CommsClaim): string {
  switch (claim.topic) {
    case 'ENGINE_STATUS':
      return `Двигатель №${claim.engineNumber} ${claim.status === 'WORKING' ? 'исправен' : 'сломан'}.`;
    case 'ENGINE_DEED':
      if (claim.deed === 'UNTOUCHED') return `Я не трогал Двигатель №${claim.engineNumber}.`;
      return `Я ${claim.deed === 'REPAIRED' ? 'починил' : 'повредил'} Двигатель №${claim.engineNumber}.`;
    case 'COORDINATES':
      return `Координаты: маркер ${claim.marker} ведёт на ${DESTINATION_LABELS[claim.destination]}.`;
    case 'COURSE':
      return claim.toEarth ? 'Курс ведёт к Земле.' : 'Курс ведёт не к Земле.';
    case 'ROOM_IDENTITY':
      return `${roomLabel(view, claim.roomId)} — это ${roomTypeName(claim.definitionId)}.`;
    case 'NOT_INFECTED':
      return 'Я не заражён.';
    case 'HAS_ITEM':
      return `У меня есть «${claim.itemName}».`;
  }
}

export function intentText(view: SanitizedGameState, intent: CommsIntent): string {
  switch (intent.topic) {
    case 'EXPLORE':
      return 'Иду исследовать корабль.';
    case 'SEEK_ROOM':
      return `Ищу Комнату: ${roomTypeName(intent.definitionId)}.`;
    case 'GO_TO_ENGINES':
      return 'Иду к Двигателям.';
    case 'GO_TO_BRIDGE':
      return 'Иду на Мостик.';
    case 'GO_HEAL':
      return 'Иду лечиться.';
    case 'GO_TO_HIBERNATION':
      return 'Иду в Анабиоз.';
    case 'GO_TO_POD':
      return `Иду к ${podName(view, intent.podId).replace('Капсула', 'Капсуле')}.`;
    case 'COVER_PLAYER':
      return `Прикрываю: ${playerName(view, intent.playerId)}.`;
    case 'GO_TO_ROOM':
      return `Иду в ${roomLabel(view, intent.roomId)}.`;
  }
}

export function requestText(view: SanitizedGameState, request: CommsRequestTopic): string {
  switch (request.topic) {
    case 'NEED_ITEM':
      return request.need === 'SPECIFIC'
        ? `Нужен Предмет: «${request.itemName ?? '?'}».`
        : `Нужно: ${ITEM_NEED_LABELS[request.need]}.`;
    case 'HELP_KILL':
      return `Помогите убить Чужого: ${roomLabel(view, request.roomId)}.`;
    case 'CHECK_ENGINE':
      return `Проверьте Двигатель №${request.engineNumber}.`;
    case 'CHECK_COORDINATES':
      return 'Проверьте Координаты.';
    case 'SET_DOOR':
      return `${request.doorState === 'OPEN' ? 'Откройте' : 'Закройте'} Дверь: Коридор ${corridorLabel(request.corridorId)}.`;
    case 'EXTINGUISH':
      return `Потушите Пожар: ${roomLabel(view, request.roomId)}.`;
    case 'WAIT_IN_POD':
      return `Подождите меня: ${podName(view, request.podId)}.`;
    case 'NO_SELF_DESTRUCT':
      return 'Не запускайте Самоуничтожение.';
  }
}

function reactionText(view: SanitizedGameState, reaction: CommsReaction): string {
  if (reaction.topic === 'THANKS_FOR_DEED') return 'Спасибо!';
  const target = view.comms.messages.find((message) => message.id === reaction.messageId);
  const quoted = target ? `«${messageText(view, target)}»` : 'это';
  return reaction.topic === 'DISBELIEVE' ? `Не верю: ${quoted}` : `Спасибо за ${quoted}`;
}

export function messageText(view: SanitizedGameState, message: CommsMessage): string {
  switch (message.kind) {
    case 'SYSTEM':
      return `Жетоны Двигателя №${message.body.engineNumber} переставлены.`;
    case 'CLAIM':
      return claimText(view, message.body);
    case 'INTENT':
      return intentText(view, message.body);
    case 'REQUEST':
      return requestText(view, message.body);
    case 'ANSWER':
      return message.body.answer === 'WILL_HELP' ? 'Помогу.' : 'Не могу.';
    case 'REACTION':
      return reactionText(view, message.body);
  }
}

export function addresseeText(view: SanitizedGameState, message: CommsMessage): string {
  return message.to === 'ALL' ? 'всем' : playerName(view, message.to);
}

export function draftText(view: SanitizedGameState, draft: CommsDraft): string {
  switch (draft.kind) {
    case 'CLAIM':
      return claimText(view, draft.body);
    case 'INTENT':
      return intentText(view, draft.body);
    case 'REQUEST':
      return requestText(view, draft.body);
    case 'ANSWER':
      return draft.body.answer === 'WILL_HELP' ? 'Помогу.' : 'Не могу.';
    case 'REACTION':
      return reactionText(view, draft.body);
  }
}
