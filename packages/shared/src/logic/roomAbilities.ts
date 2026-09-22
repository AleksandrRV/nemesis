import type { GameState } from '../types/state.js';
import type { RoomAbilityPayload } from '../types/actions.js';
import type { ActionDeckCard, ContaminationCard } from '../types/cards.js';
import { isPlayerInCombat } from './combatStatus.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { drawSearchCards } from './search.js';
import { advanceTurn } from './turnCycle.js';
import { queueActionCompletion } from './actionCompletion.js';
import { allocateEntityId } from './stateIds.js';
import { sufferLightWounds } from './characterDamage.js';

export function executeRoomAbility(state: GameState, actorId: string, payload: RoomAbilityPayload): void {
  const player = state.players[actorId]!;
  const room = state.ship.rooms[player.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
  }

  if (!room.isExplored) {
    throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать неисследованный отсек');
  }

  if (room.hasMalfunction) {
    throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать неисправный отсек (требуется починка)');
  }

  if (isPlayerInCombat(state, actorId)) {
    throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нельзя активировать отсек в Бою с Чужими (стр. 18).');
  }

  switch (room.definitionId) {
    case 'ARMORY': {
      // Перезарядка энергооружия: ищем в слотах рук оружие с isEnergyWeapon: true
      const energyWeaponSlot = player.handSlots.find(
        (slot) => slot.source === 'ITEM' && slot.card.isWeapon && slot.card.isEnergyWeapon === true,
      );
      if (!energyWeaponSlot || energyWeaponSlot.source !== 'ITEM') {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'У персонажа нет энергооружия в руках для перезарядки');
      }
      const weapon = energyWeaponSlot.card;
      const maxAmmo = weapon.maxAmmo ?? 4;
      const currentAmmo = weapon.ammo ?? 0;
      const newAmmo = Math.min(maxAmmo, currentAmmo + 2);
      weapon.ammo = newAmmo;

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'ARMORY',
        detail: `Заряжено энергооружие «${weapon.name}»: ${newAmmo}/${maxAmmo} зарядов`,
      });
      break;
    }

    case 'COMM_ROOM': {
      // Радиорубка: отправка сигнала
      if (player.hasSignalSent) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Сигнал с корабля уже был отправлен этим персонажем');
      }
      player.hasSignalSent = true;

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'COMM_ROOM',
        detail: 'Отправлен сигнал бедствия с корабля',
      });
      break;
    }

    case 'INFIRMARY': {
      // Лазарет: 3 варианта:
      // 1) TREAT_SERIOUS: обработать все тяжёлые травмы
      // 2) HEAL_SERIOUS: вылечить 1 обработанную травму
      // 3) HEAL_LIGHT: вылечить все лёгкие травмы
      const option = payload.option ?? 'TREAT_SERIOUS';
      if (option === 'TREAT_SERIOUS') {
        const untreated = player.seriousWounds.filter((w) => !w.isTreated);
        if (untreated.length === 0) {
          throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нет необработанных тяжёлых травм');
        }
        for (const wound of player.seriousWounds) {
          wound.isTreated = true;
        }
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'INFIRMARY',
          detail: 'Все тяжёлые травмы обработаны',
        });
      } else if (option === 'HEAL_SERIOUS') {
        const treatedIdx = player.seriousWounds.findIndex((w) => w.isTreated);
        if (treatedIdx === -1) {
          throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нет обработанных тяжёлых травм для излечения');
        }
        player.seriousWounds.splice(treatedIdx, 1);
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'INFIRMARY',
          detail: 'Одна обработанная тяжёлая травма полностью излечена',
        });
      } else if (option === 'HEAL_LIGHT') {
        if (player.lightWounds === 0) {
          throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Нет лёгких травм для излечения');
        }
        player.lightWounds = 0;
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'INFIRMARY',
          detail: 'Все лёгкие травмы вылечены',
        });
      } else {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `Недопустимый вариант для Лазарета: ${option}`);
      }
      break;
    }

    case 'GENERATOR': {
      // Генератор: запуск / остановка таймера самоуничтожения (стр. 25).
      // Запрещено, если хотя бы один персонаж находится в Анабиозе.
      // Запрещено выключать, если таймер находится в жёлтой зоне (<= 3).
      const someoneInHibernation = Object.values(state.players).some((p) => p.isInHibernation);
      if (someoneInHibernation) {
        throw new EngineError(
          'ROOM_ABILITY_NOT_ALLOWED',
          'Нельзя управлять Генератором, пока персонажи находятся в Анабиозе',
        );
      }

      const currentPos = state.meta.selfDestructTrackPosition;
      if (currentPos === null) {
        // Запуск
        state.meta.selfDestructTrackPosition = 0;
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'GENERATOR',
          detail: 'Взведён таймер самоуничтожения корабля',
        });
      } else {
        // Остановка (если не в жёлтой/критической зоне)
        if (currentPos >= 6) {
          throw new EngineError(
            'ROOM_ABILITY_NOT_ALLOWED',
            'Таймер самоуничтожения находится в необратимой зоне и не может быть остановлен',
          );
        }
        state.meta.selfDestructTrackPosition = null;
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'GENERATOR',
          detail: 'Таймер самоуничтожения корабля остановлен',
        });
      }
      break;
    }

    case 'FIRE_CONTROL': {
      // Пожарная безопасность: сброс маркера Пожара из любого выбранного отсека
      const targetRoomId = payload.targetRoomId;
      if (!targetRoomId || !state.ship.rooms[targetRoomId]) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Не указан целевой отсек для системы пожаротушения');
      }
      const targetRoom = state.ship.rooms[targetRoomId]!;
      if (!targetRoom.hasFire) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `В отсеке #${targetRoomId} нет маркера Пожара`);
      }
      targetRoom.hasFire = false;
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'FIRE_CONTROL',
        detail: `Маркер Пожара потушен в отсеке #${targetRoomId}`,
      });
      break;
    }

    case 'STORAGE': {
      // Склад: Поиск в любой колоде (Красная, Жёлтая, Зелёная) без уменьшения itemsCount комнаты
      const targetDeck = payload.targetDeckColor ?? 'YELLOW';
      const drawn = drawSearchCards(state, targetDeck);
      if (drawn.length === 0) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `В колоде ${targetDeck} не осталось карт`);
      }
      state.pendingDecision = {
        id: allocateEntityId(state, 'storage-choice'),
        playerId: actorId,
        type: 'CHOOSE_SEARCH_ITEM',
        drawnCardIds: drawn.map((c) => c.id),
        sourceDeck: targetDeck,
        roomId: room.id,
      };
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'STORAGE',
        detail: `Поиск на Складе в колоде ${targetDeck}`,
      });
      return;
    }

    case 'NEST': {
      // Улей: взятие 1 яйца Чужих
      if (state.intrudersPool.eggsOnBoard <= 0) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'В Улье не осталось яиц Чужих');
      }
      if (player.handSlots.length >= 2) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Обе руки персонажа заняты: нельзя взять яйцо');
      }
      state.intrudersPool.eggsOnBoard -= 1;
      player.handSlots.push({
        source: 'OBJECT',
        object: { id: `EGG_${5 - state.intrudersPool.eggsOnBoard}`, kind: 'EGG' },
      });
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'NEST',
        detail: 'Персонаж взял яйцо Чужих',
      });
      break;
    }

    case 'LABORATORY': {
      // Лаборатория [2] «Изучите 1 объект» (стр. 16): в отсеке должен быть
      // Труп, Останки или Яйцо — на полу или в руках любого Персонажа («например,
      // в руках Персонажа»). Объект не удаляется из игры; после изучения можно
      // сбросить свой объект с руки, не тратя Действия (стр. 16).
      const targetKind = payload.targetObjectKind;
      if (!targetKind) {
        throw new EngineError(
          'ROOM_ABILITY_NOT_ALLOWED',
          'Не указан тип объекта для изучения: Труп, Останки или Яйцо (стр. 16).',
        );
      }
      const weaknessSlot = state.intrudersPool.weaknessSlots.find((slot) => slot.objectKind === targetKind);
      if (!weaknessSlot) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `Слота Слабостей для объекта ${targetKind} не существует.`);
      }
      if (!weaknessSlot.card) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'В этом слоте Планшета Чужих нет карты Слабости.');
      }
      if (weaknessSlot.card.isRevealed) {
        throw new EngineError(
          'WEAKNESS_ALREADY_REVEALED',
          `Слабость «${weaknessSlot.card.name}» уже изучена — раскрывать больше нечего (стр. 21).`,
        );
      }
      const onFloor = room.objects.some((object) => object.kind === targetKind);
      const inHands = room.occupantPlayerIds.some((occupantId) =>
        state.players[occupantId]!.handSlots.some(
          (slot) => slot.source === 'OBJECT' && slot.object.kind === targetKind,
        ),
      );
      if (!onFloor && !inHands) {
        throw new EngineError(
          'ROOM_ABILITY_NOT_ALLOWED',
          `В Лаборатории нет объекта типа ${targetKind} ни на полу, ни в руках Персонажей (стр. 16).`,
        );
      }

      weaknessSlot.card.isRevealed = true;

      if (payload.discardObjectAfterStudy) {
        const slotIndex = player.handSlots.findIndex(
          (slot) => slot.source === 'OBJECT' && slot.object.kind === targetKind,
        );
        if (slotIndex > -1) {
          const dropped = player.handSlots.splice(slotIndex, 1)[0];
          if (dropped && dropped.source === 'OBJECT') {
            // Сброшенный объект — жетон в текущую Комнату (стр. 22).
            room.objects.push(dropped.object);
          }
        }
      }

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'LABORATORY',
        detail: `Изучен объект (${targetKind}): раскрыта Слабость «${weaknessSlot.card.name}»`,
      });
      break;
    }

    case 'ESCAPE_POD_A':
    case 'ESCAPE_POD_B': {
      // Спасательные отсеки: вход в капсулу
      const section = room.definitionId === 'ESCAPE_POD_A' ? 'A' : 'B';
      const availablePods = Object.values(state.ship.escapePods).filter((pod) => pod.section === section);
      const pod = availablePods.find((p) => !p.isLocked && !p.isDestroyed && p.occupantIds.length < 2);
      if (!pod) {
        throw new EngineError(
          'ROOM_ABILITY_NOT_ALLOWED',
          'В данном отсеке нет разблокированных капсул со свободными местами',
        );
      }
      pod.occupantIds.push(actorId);
      player.hasEscapedInPod = true;

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: room.definitionId,
        detail: `Персонаж занял место в капсуле ${pod.id}`,
      });
      break;
    }

    case 'SURGERY': {
      // Операционная: сканирование всех карт Заражения, удаление инфекций ценой 1 лёгкой травмы и паса
      const infectedCards: ContaminationCard[] = [];
      const cleanCards: ActionDeckCard[] = [];

      for (const card of player.actionDeck.hand) {
        if (!('characterClass' in card)) {
          const contam = card as ContaminationCard;
          contam.isScanned = true;
          if (contam.isInfected) {
            infectedCards.push(contam);
          } else {
            cleanCards.push(card);
          }
        } else {
          cleanCards.push(card);
        }
      }

      // Карты с инфекцией удаляются из игры, чистые карты замешиваются в колоду
      player.actionDeck.hand = [];
      player.actionDeck.drawPile.push(...cleanCards);
      player.hasLarva = false;
      sufferLightWounds(state, actorId, 1);
      player.hasPassed = true;

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'SURGERY',
        detail: `Хирургическая операция: удалено ${infectedCards.length} карт инфекции, получена 1 лёгкая травма, пас`,
      });
      advanceTurn(state, actorId);
      return;
    }

    default:
      throw new EngineError(
        'ROOM_ABILITY_NOT_ALLOWED',
        `Действие отсека ${room.definitionId ?? 'неизвестный'} не поддерживается в v0.3.0`,
      );
  }

  queueActionCompletion(state, actorId);
}
