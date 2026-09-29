import type { GameState } from '../types/state.js';
import type { RoomAbilityPayload } from '../types/actions.js';
import { isPlayerInCombat } from './combatStatus.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { drawSearchCards, placeItemToPlayer } from './search.js';
import { advanceTurnWithoutFire, applyFireEndTurnEffect, bleedOnPass } from './turnCycle.js';
import { queueActionCompletion } from './actionCompletion.js';
import { allocateEntityId } from './stateIds.js';
import { sufferLightWounds } from './characterDamage.js';
import { drawFromStream, shuffle } from '../utils/rng.js';
import { logContaminationScan, removeInfectedCards, scanContaminationCards } from './infectionScanner.js';
import { startHibernationAttempt, startPodBoarding, togglePodLock } from './evacuation.js';
import { toggleSelfDestruct } from './selfDestruct.js';
import { dropHeldObject, studyWeakness } from './weaknessStudy.js';
import { repelIntruderWithSuppressant } from './fireSuppression.js';
import { hasFreeHandSlot } from './seriousWoundEffects.js';
import {
  inspectAllEngines,
  inspectEngineInRoom,
  observeUnexploredRoom,
  operateFlightControl,
} from './shipSystemsAbilities.js';
import { rearrangeRoomDoors } from './doorControl.js';
import { startDecompression } from './decompression.js';
import { snackInCanteen, takeShower } from './hygieneAbilities.js';

function fireControlDetail(roomId: number, extinguished: boolean, repelledCount: number): string {
  const fire = extinguished ? `Маркер Пожара потушен в отсеке #${roomId}` : `В отсеке #${roomId} Пожара не было`;
  return repelledCount > 0 ? `${fire}; Чужих Отступает: ${repelledCount}` : fire;
}

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
      // Шаг 6, долг 18: если 2 энергоствола в руках — давать выбор через CHOOSE_ENERGY_WEAPON, или заряжать все.
      // Реализуем выбор: если несколько — ставим решение CHOOSE_ENERGY_WEAPON.
      const energyWeaponSlots = player.handSlots.filter(
        (slot) => slot.source === 'ITEM' && slot.card.isWeapon && slot.card.isEnergyWeapon === true,
      );

      if (energyWeaponSlots.length === 0) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'У персонажа нет энергооружия в руках для перезарядки');
      }

      if (energyWeaponSlots.length > 1) {
        // Несколько энергооружий — игрок выбирает одно
        state.pendingDecision = {
          id: allocateEntityId(state, 'armory-choice'),
          playerId: actorId,
          type: 'CHOOSE_ENERGY_WEAPON',
          weaponIds: energyWeaponSlots.map((s) => (s.source === 'ITEM' ? s.card.id : '')),
          roomId: room.id,
        };
        return;
      }

      const weaponSlot = energyWeaponSlots[0]!;
      if (weaponSlot.source !== 'ITEM') {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'У персонажа нет энергооружия в руках для перезарядки');
      }
      const weapon = weaponSlot.card;
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
      const toggle = toggleSelfDestruct(state);
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'GENERATOR',
        detail:
          toggle === 'STARTED' ? 'Взведён таймер самоуничтожения корабля' : 'Таймер самоуничтожения корабля остановлен',
      });
      break;
    }

    case 'FIRE_CONTROL': {
      const targetRoomId = payload.targetRoomId;
      const targetRoom = targetRoomId === undefined ? undefined : state.ship.rooms[targetRoomId];
      if (!targetRoom) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Выберите Комнату для Системы Пожаротушения.');
      }
      const extinguished = targetRoom.hasFire;
      targetRoom.hasFire = false;
      const repelledIntruderIds = [...targetRoom.occupantIntruderIds];
      for (const intruderId of repelledIntruderIds) {
        if (state.intrudersPool.boardTokens.some((token) => token.id === intruderId)) {
          repelIntruderWithSuppressant(state, intruderId, actorId);
        }
      }
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'FIRE_CONTROL',
        detail: fireControlDetail(targetRoom.id, extinguished, repelledIntruderIds.length),
      });
      break;
    }

    case 'STORAGE': {
      // Склад: Поиск в любой колоде (Красная, Жёлтая, Зелёная) без уменьшения itemsCount комнаты
      // Шаг 5, долг 14: введён отдельный тип CHOOSE_STORAGE_ITEM чтобы не путать itemsCount-- логику
      const targetDeck = payload.targetDeckColor ?? 'YELLOW';
      const drawn = drawSearchCards(state, targetDeck);
      if (drawn.length === 0) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `В колоде ${targetDeck} не осталось карт`);
      }
      if (drawn.length === 1) {
        // Одиночная карта — сразу помещаем, но с проверкой тяжёлых рук (Шаг 5, долг 12)
        // Склад не уменьшает itemsCount, поэтому roomId не передаём — DISCARD_HEAVY не должен декрементить
        const placed = placeItemToPlayer(state, actorId, drawn[0]!);
        if (!placed) {
          appendGameLog(state, {
            type: 'ROOM_ABILITY_USED',
            playerId: actorId,
            roomId: room.id,
            roomDefinitionId: 'STORAGE',
            detail: `Поиск на Складе в колоде ${targetDeck} (требуется сброс тяжёлого)`,
          });
          return;
        }
        appendGameLog(state, {
          type: 'ROOM_ABILITY_USED',
          playerId: actorId,
          roomId: room.id,
          roomDefinitionId: 'STORAGE',
          detail: `Поиск на Складе в колоде ${targetDeck}`,
        });
        queueActionCompletion(state, actorId);
        return;
      }
      state.pendingDecision = {
        id: allocateEntityId(state, 'storage-choice'),
        playerId: actorId,
        type: 'CHOOSE_STORAGE_ITEM',
        cards: drawn,
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
      // Шаг 6, долг 16: id генерация через allocateEntityId чтобы избежать коллизий EGG_${5-eggsOnBoard}
      if (state.intrudersPool.eggsOnBoard <= 0) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'В Улье не осталось яиц Чужих');
      }
      if (!hasFreeHandSlot(player)) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Свободного слота Руки нет: нельзя взять Яйцо (стр. 22)');
      }
      state.intrudersPool.eggsOnBoard -= 1;
      player.handSlots.push({
        source: 'OBJECT',
        object: { id: allocateEntityId(state, 'egg'), kind: 'EGG' },
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
      const weaknessName = studyWeakness(state, actorId, payload.targetObjectKind, 'ROOM_ABILITY_NOT_ALLOWED');
      if (payload.discardObjectAfterStudy && payload.targetObjectKind) {
        dropHeldObject(state, actorId, payload.targetObjectKind);
      }
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'LABORATORY',
        detail: `Изучен объект (${payload.targetObjectKind}): раскрыта Слабость «${weaknessName}»`,
      });
      break;
    }

    case 'ESCAPE_POD_A':
    case 'ESCAPE_POD_B':
      startPodBoarding(state, actorId, room, payload.targetEscapePodId);
      break;

    case 'HIBERNATORIUM':
      startHibernationAttempt(state, actorId, room);
      break;

    case 'HATCH_CONTROL':
      togglePodLock(state, actorId, payload.targetEscapePodId, 'HATCH_CONTROL');
      break;

    case 'SURGERY': {
      const deck = player.actionDeck;
      const hadLarva = player.hasLarva;
      const results = [
        ...scanContaminationCards(deck.hand),
        ...scanContaminationCards(deck.drawPile),
        ...scanContaminationCards(deck.discard),
      ];
      const remaining = removeInfectedCards([...deck.hand, ...deck.drawPile, ...deck.discard]);
      player.hasLarva = false;
      logContaminationScan(state, actorId, 'SURGERY', results, remaining.removed, hadLarva ? 'LARVA_REMOVED' : 'CLEAN');

      deck.hand = [];
      deck.discard = [];
      deck.drawPile = shuffle(() => {
        const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
        state.meta.rngDraws.cards += 1;
        return value;
      }, remaining.kept);
      sufferLightWounds(state, actorId, 1);
      applyFireEndTurnEffect(state, actorId);
      bleedOnPass(state, actorId);
      if (!player.isDead) {
        player.hasPassed = true;
      }

      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: 'SURGERY',
        detail: `Хирургическая операция: удалено карт с Инфекцией — ${remaining.removed}${hadLarva ? ', Личинка удалена' : ''}; 1 Лёгкая Травма, Пас`,
      });
      advanceTurnWithoutFire(state, actorId);
      return;
    }

    case 'ENGINE_01':
    case 'ENGINE_02':
    case 'ENGINE_03':
      inspectEngineInRoom(state, actorId, room);
      break;

    case 'ENGINE_CONTROL':
      inspectAllEngines(state, actorId, room);
      break;

    case 'COCKPIT':
      operateFlightControl(state, actorId, room, payload);
      break;

    case 'OBSERVATION_ROOM':
      observeUnexploredRoom(state, actorId, payload);
      break;

    case 'COMMAND_CENTER': {
      const doors = rearrangeRoomDoors(state, payload.targetRoomId, payload.closedCorridorIds ?? []);
      appendGameLog(state, {
        type: 'DOORS_REARRANGED',
        playerId: actorId,
        roomId: room.id,
        ...doors,
      });
      break;
    }

    case 'AIRLOCK_CONTROL':
      startDecompression(state, actorId, room, payload);
      break;

    case 'CANTEEN':
    case 'SHOWER': {
      const detail =
        room.definitionId === 'CANTEEN' ? snackInCanteen(state, actorId, payload) : takeShower(state, actorId, payload);
      appendGameLog(state, {
        type: 'ROOM_ABILITY_USED',
        playerId: actorId,
        roomId: room.id,
        roomDefinitionId: room.definitionId,
        detail,
      });
      break;
    }

    default:
      throw new EngineError(
        'ROOM_ABILITY_NOT_ALLOWED',
        `У отсека ${room.definitionId ?? 'неизвестный'} нет Действия: его свойство срабатывает само.`,
      );
  }

  queueActionCompletion(state, actorId);
}
