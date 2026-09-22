import type { InterruptEvent } from '../types/interrupts.js';
import type { GameLogEffectOutcome } from '../types/log.js';
import type { RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import { appendGameLog } from './gameLog.js';
import { placeDoorToken, placeFireMarker, placeMalfunctionMarker } from './markers.js';
import { EngineError } from './engineErrors.js';
import { requireCorridor } from './shipGraphQueries.js';
import { endGame } from './gameEnd.js';

const ROOM_DEFINITIONS = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

function roomNameForLog(room: RoomState): string {
  return ROOM_DEFINITIONS.find((definition) => definition.id === room.definitionId)?.name ?? `Отсек #${room.id}`;
}

export function resolveExploreRoom(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'EXPLORE_ROOM_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Прерывание вскрытия ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError(
      'UNKNOWN_PLAYER',
      `Прерывание вскрытия ссылается на неизвестного персонажа: ${interrupt.playerId}.`,
    );
  }

  room.isExplored = true;
  const explorationEffect = room.explorationEffect;

  appendGameLog(state, {
    type: 'ROOM_DISCOVERED',
    playerId: interrupt.playerId,
    roomId: room.id,
    roomName: roomNameForLog(room),
    category: room.category,
  });

  // Эффект вскрытия не должен затирать исходный explorationEffect тайла,
  // так как он требуется следующему прерыванию шума NOISE_ROLL_INTERRUPT.
  if (explorationEffect !== null) {
    appendGameLog(state, {
      type: 'EXPLORATION_TOKEN_REVEALED',
      playerId: interrupt.playerId,
      roomId: room.id,
      itemsCount: room.itemsCount,
      effect: explorationEffect,
    });
  }

  switch (explorationEffect) {
    case 'FIRE': {
      // Маркер Пожара в отсек; последний маркер взрывает корабль (стр. 17).
      const placement = placeFireMarker(state, interrupt.roomId);
      const outcome: GameLogEffectOutcome =
        placement === 'SHIP_EXPLODED'
          ? 'SHIP_EXPLODED'
          : placement === 'ALREADY_PRESENT'
            ? 'FIRE_ALREADY_PRESENT'
            : 'FIRE_PLACED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'FIRE',
        outcome,
      });

      if (placement === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');

      return;
    }

    case 'MALFUNCTION': {
      // Маркер Неисправности; в Улей и Комнату со Слизью его класть нельзя,
      // а последний маркер разрывает обшивку (стр. 17).
      const placement = placeMalfunctionMarker(state, interrupt.roomId);
      const outcome: GameLogEffectOutcome =
        placement === 'HULL_BREACH'
          ? 'HULL_BREACH'
          : placement === 'ALREADY_PRESENT'
            ? 'MALFUNCTION_ALREADY_PRESENT'
            : placement === 'FORBIDDEN_ROOM'
              ? 'MALFUNCTION_FORBIDDEN'
              : 'MALFUNCTION_PLACED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'MALFUNCTION',
        outcome,
      });

      if (placement === 'HULL_BREACH') endGame(state, 'HULL_BREACH');

      return;
    }

    case 'SLIME': {
      // У персонажа не больше одного маркера Слизи (стр. 17).
      const outcome: GameLogEffectOutcome = player.hasSlime ? 'SLIME_ALREADY_PRESENT' : 'SLIME_APPLIED';

      player.hasSlime = true;
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'SLIME',
        outcome,
      });
      return;
    }

    case 'DOORS': {
      const placement = closeDoorOfEntry(state, interrupt.corridorId);
      const outcome: GameLogEffectOutcome =
        placement === 'MOVED_FROM_BOARD'
          ? 'DOOR_MOVED'
          : placement === 'ALREADY_CLOSED'
            ? 'DOOR_ALREADY_CLOSED'
            : placement === 'DESTROYED'
              ? 'DOOR_DESTROYED'
              : 'DOOR_CLOSED';

      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: interrupt.playerId,
        roomId: room.id,
        effect: 'DOORS',
        outcome,
      });
      return;
    }

    case 'SILENCE':
    case 'DANGER':
    case null:
      // «Тишина» и «Опасность» разыгрываются вместе с шумом,
      // а у особых отсеков жетона Исследования нет вовсе (стр. 26).
      return;
  }
}

function closeDoorOfEntry(
  state: GameState,
  corridorId: string,
): 'PLACED' | 'ALREADY_CLOSED' | 'DESTROYED' | 'MOVED_FROM_BOARD' {
  const corridor = requireCorridor(state, corridorId);
  const placement = placeDoorToken(state, corridor.id);

  if (placement === 'UNKNOWN_CORRIDOR') {
    throw new EngineError('UNKNOWN_CORRIDOR', `Коридора ${corridor.id} нет на корабле.`);
  }

  if (placement === 'NO_TOKEN_IN_SUPPLY') {
    throw new EngineError(
      'DOOR_TOKEN_SUPPLY_EXHAUSTED',
      'Жетонов Дверей нет ни в запасе, ни среди Закрытых Дверей на поле (стр. 17).',
    );
  }

  return placement;
}
