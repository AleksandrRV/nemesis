import type { EventEffectOutcome, HiveDevelopmentOutcome, SanitizedGameState } from '@nemesis/shared';
import { EVENT_CARDS } from '@nemesis/shared';
import type { GameLogSegment } from './gameLogModel';
import { playerName, roomLabel } from './gameLogModel';

export function eventCardName(cardId: string): string {
  return EVENT_CARDS.find((card) => card.id === cardId)?.name ?? cardId;
}

function roomIdsText(view: SanitizedGameState, roomIds: number[]): string {
  return roomIds.map((roomId) => roomLabel(view, roomId)).join(', ');
}

function playerNamesText(view: SanitizedGameState, playerIds: string[]): string {
  return playerIds.map((playerId) => playerName(view, playerId)).join(', ');
}

/** Русские итоги текстовых эффектов карт Событий (стр. 10, шаг 7). */
export function formatEventEffectOutcome(outcome: EventEffectOutcome, view: SanitizedGameState): GameLogSegment[] {
  switch (outcome.kind) {
    case 'HUNT':
      return outcome.movedIntruderIds.length > 0
        ? [
            { text: 'Охота: ', tone: 'danger', strong: true },
            { text: `${outcome.movedIntruderIds.length} Взрослых вне Боя перемещаются в отсеки с Персонажами.` },
          ]
        : [{ text: 'Охота: Взрослым вне Боя некуда двигаться.' }];
    case 'PROTECT_NEST':
      return outcome.contactPlayerIds.length > 0
        ? [
            { text: 'Защита кладки: ', tone: 'danger', strong: true },
            { text: `${playerNamesText(view, outcome.contactPlayerIds)} разыгрывают Контакт.` },
          ]
        : [{ text: 'Защита кладки: в Улье пусто, Яиц никто не несёт.' }];
    case 'BROOD': {
      const parts: GameLogSegment[] = [{ text: 'Выводок: ', tone: 'danger', strong: true }];
      parts.push(
        outcome.eggDiscarded ? { text: '1 Яйцо сброшено с Планшета Чужих.' } : { text: 'на Планшете не осталось Яиц.' },
      );
      if (outcome.infectedPlayerIds.length > 0) {
        parts.push({ text: ` Карта Заражения: ${playerNamesText(view, outcome.infectedPlayerIds)}.` });
      }
      if (outcome.larvaAddedToBag) {
        parts.push({ text: ' Жетон Личинки добавлен в мешок Пула Чужих.' });
      }
      return parts;
    }
    case 'REGENERATION':
      return outcome.healedIntruderIds.length > 0
        ? [
            { text: 'Регенерация: ', tone: 'danger', strong: true },
            {
              text: `${outcome.healedIntruderIds.length} Чужих сбрасывают ${outcome.woundsRemoved} маркеров Ран.`,
            },
          ]
        : [{ text: 'Регенерация: раненых Чужих на поле нет.' }];
    case 'HIDDEN':
      return outcome.withdrawnIntruderIds.length > 0
        ? [
            { text: 'Затаившиеся: ', tone: 'danger', strong: true },
            {
              text: `${outcome.withdrawnIntruderIds.length} Чужих вне Боя сняты с поля, их жетоны — в Пуле.`,
            },
          ]
        : [{ text: 'Затаившиеся: все Чужие на поле в Бою.' }];
    case 'MATURATION': {
      const parts: GameLogSegment[] = [{ text: 'Созревание: ', tone: 'danger', strong: true }];
      if (outcome.deadPlayerIds.length > 0) {
        parts.push({
          text: `${playerNamesText(view, outcome.deadPlayerIds)} гибнут; Криперы вылупляются в ${
            outcome.creeperRoomIds.length
          } отсеке(ах). `,
        });
      } else {
        parts.push({ text: 'носителей Личинки нет. ' });
      }
      parts.push({ text: `Скрытая инфекция проверена у ${outcome.scannedPlayerIds.length} персонажей.` });
      if (outcome.infectedPlayerIds.length > 0) {
        parts.push({ text: ` Личинка на планшете: ${playerNamesText(view, outcome.infectedPlayerIds)}.` });
      }
      return parts;
    }
    case 'RAMPAGE':
      return outcome.malfunctionRoomIds.length > 0
        ? [
            { text: 'Разгром: ', tone: 'malfunction', strong: true },
            { text: `маркеры Неисправности в ${roomIdsText(view, outcome.malfunctionRoomIds)}.` },
          ]
        : [{ text: 'Разгром: крупных Чужих на поле нет.' }];
    case 'PREPARATION':
      return [
        { text: 'Подготовка: ', tone: 'warning', strong: true },
        {
          text: `${playerName(view, outcome.decisionPlayerId)} выбирает одну из трёх карт Событий для розыгрыша.`,
        },
      ];
    case 'PREY_SCENT':
      return outcome.noiseCorridorIds.length > 0
        ? [
            { text: 'Запах добычи: ', tone: 'noise', strong: true },
            { text: `маркеры Шума в Коридорах ${outcome.noiseCorridorIds.join(', ')}.` },
          ]
        : [{ text: 'Запах добычи: Персонажей со Слизью нет или все Коридоры уже шумят.' }];
    case 'NOISE_TECH_CORRIDORS':
      return outcome.markerPlaced
        ? [
            { text: 'Шум в тех. коридорах: ', tone: 'noise', strong: true },
            { text: 'маркер Шума размещён на поле Технических Коридоров.' },
          ]
        : [
            { text: 'Шум в тех. коридорах: ', tone: 'noise', strong: true },
            { text: `кубик Шума бросают ${playerNamesText(view, outcome.rolledPlayerIds)}.` },
          ];
    case 'HIVE':
      return outcome.nestExplored
        ? outcome.noiseCorridorIds.length > 0
          ? [
              { text: 'Улей: ', tone: 'noise', strong: true },
              { text: `маркеры Шума вокруг Улья в Коридорах ${outcome.noiseCorridorIds.join(', ')}.` },
            ]
          : [{ text: 'Улей: все Коридоры вокруг Улья уже шумят.' }]
        : [{ text: 'Улей ещё не исследован — карта не действует.' }];
    case 'FLAMMABLE_MIXTURE':
      return outcome.spread
        ? outcome.fireRoomIds.length > 0
          ? [
              { text: 'Воспламеняемый раствор: ', tone: 'fire', strong: true },
              { text: `огонь распространяется в ${roomIdsText(view, outcome.fireRoomIds)}.` },
            ]
          : [{ text: 'Воспламеняемый раствор: соседние отсеки уже горят или за Дверями.' }]
        : [
            { text: 'Воспламеняемый раствор: ', tone: 'fire', strong: true },
            { text: `маркер Пожара в ${roomIdsText(view, outcome.fireRoomIds)}.` },
          ];
    case 'DESTRUCTIVE_FLAME': {
      const parts: GameLogSegment[] = [{ text: 'Разрушающее пламя: ', tone: 'fire', strong: true }];
      parts.push(
        outcome.malfunctionRoomIds.length > 0
          ? { text: `Неисправность в ${roomIdsText(view, outcome.malfunctionRoomIds)}.` }
          : { text: 'горящие отсеки уже неисправны.' },
      );
      parts.push(
        outcome.fireRoomIds.length > 0
          ? { text: ` Огонь распространяется в ${roomIdsText(view, outcome.fireRoomIds)}.` }
          : { text: ' Огню некуда распространяться.' },
      );
      return parts;
    }
    case 'ESCAPE_POD_EJECTION':
      return outcome.podId !== null
        ? [
            { text: 'Катапультирование капсулы: ', tone: 'warning', strong: true },
            { text: `Спасательная Капсула ${outcome.podId} безвозвратно уничтожена.` },
          ]
        : [{ text: 'Катапультирование капсулы: целых Капсул не осталось.' }];
    case 'SHORT_CIRCUIT':
      return outcome.malfunctionRoomIds.length > 0
        ? [
            { text: 'Короткое замыкание: ', tone: 'malfunction', strong: true },
            {
              text: `Неисправность в жёлтых отсеках с Компьютером — ${roomIdsText(view, outcome.malfunctionRoomIds)}.`,
            },
          ]
        : [{ text: 'Короткое замыкание: жёлтых отсеков с Компьютером нет или они уже неисправны.' }];
    case 'COOLANT_LEAK':
      return outcome.selfDestructStarted
        ? [
            { text: 'Утечка охладителя: ', tone: 'warning', strong: true },
            { text: 'неисправный Генератор взводит процесс Самоуничтожения!' },
          ]
        : [{ text: 'Утечка охладителя: Генератор исправен или Самоуничтожение уже запущено.' }];
    case 'LIFE_SUPPORT_MALFUNCTION':
      return outcome.malfunctionRoomIds.length > 0
        ? [
            { text: 'Неполадка систем жизнеобеспечения: ', tone: 'malfunction', strong: true },
            { text: `маркеры Неисправности в зелёных отсеках — ${roomIdsText(view, outcome.malfunctionRoomIds)}.` },
          ]
        : [{ text: 'Неполадка систем жизнеобеспечения: зелёные отсеки уже неисправны.' }];
    case 'MALFUNCTION':
      return outcome.targetRoomId !== null
        ? [
            { text: 'Неисправность: ', tone: 'malfunction', strong: true },
            { text: `маркер Неисправности в ${roomLabel(view, outcome.targetRoomId)}.` },
          ]
        : [{ text: 'Неисправность: исследованных отсеков нет.' }];
    case 'OPEN_COMPARTMENTS':
      return outcome.openedCorridorIds.length > 0
        ? [
            { text: 'Открытие отсеков: ', tone: 'door', strong: true },
            { text: `${outcome.openedCorridorIds.length} Закрытых Дверей открыты.` },
          ]
        : [{ text: 'Открытие отсеков: Закрытых Дверей на корабле нет.' }];
  }
}

/** Русские итоги Развития Улья (стр. 10, шаг 8; стр. 31). */
export function formatHiveDevelopmentOutcome(
  outcome: HiveDevelopmentOutcome,
  view: SanitizedGameState,
): GameLogSegment[] {
  switch (outcome.kind) {
    case 'LARVA':
      return [
        { text: 'Развитие Улья: ', tone: 'danger', strong: true },
        { text: 'жетон Личинки удалён из Пула' },
        ...(outcome.adultAdded
          ? [{ text: ', в мешок добавлен жетон Взрослой Особи.', tone: 'danger' as const }]
          : [{ text: ', свободных жетонов Взрослых Особей нет.', tone: 'silence' as const }]),
      ];
    case 'CREEPER':
      return [
        { text: 'Развитие Улья: ', tone: 'danger', strong: true },
        { text: 'жетон Крипера удалён из Пула' },
        ...(outcome.breederAdded
          ? [{ text: ', в мешок добавлен жетон Трутня.', tone: 'danger' as const }]
          : [{ text: ', свободных жетонов Трутней нет.', tone: 'silence' as const }]),
      ];
    case 'ADULT':
    case 'BREEDER': {
      const tokenLabel = outcome.kind === 'ADULT' ? 'Взрослой Особи' : 'Трутня';
      if (outcome.rolledPlayerIds.length === 0) {
        return [
          { text: 'Развитие Улья: ', tone: 'danger', strong: true },
          { text: `жетон ${tokenLabel} — все Персонажи в Бою, кубик Шума никто не бросает.` },
        ];
      }
      return [
        { text: 'Развитие Улья: ', tone: 'danger', strong: true },
        { text: `жетон ${tokenLabel} — кубик Шума бросают ` },
        { text: outcome.rolledPlayerIds.map((playerId) => playerName(view, playerId)).join(', '), tone: 'player' },
        { text: '.' },
      ];
    }
    case 'QUEEN':
      if (outcome.queenPlaced) {
        return [
          { text: 'Развитие Улья: ', tone: 'danger', strong: true },
          {
            text: `Королева появляется в Улье — ${outcome.contactPlayerIds
              .map((playerId) => playerName(view, playerId))
              .join(', ')} вступают в Контакт!`,
          },
        ];
      }
      return [
        { text: 'Развитие Улья: ', tone: 'danger', strong: true },
        {
          text: outcome.eggAdded
            ? 'Королева откладывает 1 жетон Яйца на Планшет Чужих.'
            : 'Планшет Чужих заполнен — новое Яйцо не помещается.',
        },
      ];
    case 'BLANK':
      return [
        { text: 'Развитие Улья: ', tone: 'danger', strong: true },
        {
          text: outcome.adultAdded
            ? 'Пустой жетон — в мешок добавлен жетон Взрослой Особи.'
            : 'Пустой жетон — свободных жетонов Взрослых Особей нет.',
        },
      ];
  }
}
