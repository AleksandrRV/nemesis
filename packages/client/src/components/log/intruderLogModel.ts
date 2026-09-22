import type { IntruderLogEvent, IntruderToken, SanitizedGameState } from '@nemesis/shared';
import { COMBAT_DIE_PRESENTATION } from '../combat/shootPresentation';
import { retreatNumberLabel, retreatOutcomeText } from '../combat/retreatPresentation';
import type { GameLogSegment } from './gameLogModel';

const NAMES: Record<IntruderToken['type'], string> = {
  BLANK: 'Пустой жетон',
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

/** Винительный падеж для фраз с прямой атакой цели («атакует Крипера»). */
const NAMES_ACCUSATIVE: Record<IntruderToken['type'], string> = {
  BLANK: 'Пустой жетон',
  LARVA: 'Личинку',
  CREEPER: 'Крипера',
  ADULT: 'Взрослую особь',
  BREEDER: 'Трутня',
  QUEEN: 'Королеву',
};

export function formatIntruderLogEvent(event: IntruderLogEvent, view: SanitizedGameState): GameLogSegment[] {
  const name = 'playerId' in event ? (view.players[event.playerId]?.name ?? event.playerId) : '';
  let text: string;
  switch (event.type) {
    case 'CONTACT_OCCURRED':
      text = `${name}: Контакт в отсеке #${event.roomId} — ${NAMES[event.tokenType]}. `;
      if (event.infestation) {
        text += event.infestation.alreadyInfested
          ? 'Повторная Личинка исчезла; ещё одна карта Заражения в сброс, без гибели (FAQ Rules 12).'
          : 'Персонаж немедленно заражён: карта Заражения — в сброс, Личинка — на планшет.';
      } else if (event.tokenType !== 'BLANK') {
        text += `Число жетона ${event.escapeNumber}, карт на руке ${event.handCount}. `;
        text += event.surpriseAttack
          ? 'Внезапная атака!'
          : event.source === 'CALL'
            ? 'Зов: без Внезапной атаки.'
            : 'Внезапной атаки нет.';
      }
      break;
    case 'FIRST_CONTACT':
      text = 'Первый Чужой на поле. Каждый игрок выбирает одну из своих Целей втайне от остальных.';
      break;
    case 'OBJECTIVE_CHOSEN':
      text = `${name} выбрал Цель. Содержание выбранной и удалённой карт скрыто.`;
      break;
    case 'SURPRISE_ATTACK_RESOLVED':
    case 'ESCAPE_ATTACK_RESOLVED': {
      text =
        event.type === 'ESCAPE_ATTACK_RESOLVED'
          ? `Побег: ${NAMES[event.intruderType]} атакует ${name} в спину — `
          : `${NAMES[event.intruderType]} атакует ${name}: `;
      text +=
        event.outcome === 'MISS'
          ? `«${event.card?.name}» — промах, нет символа атакующего.`
          : event.outcome === 'INFESTATION'
            ? 'Личинка удалена с поля; персонаж получает Заражение.'
            : event.outcome === 'SUPPRESSED'
              ? 'Атака подавлена эффектом Зова.'
              : `«${event.card?.name}». ${event.card?.description}`;
      if (event.victims.some((victim) => victim.isDead)) text += ' Есть погибшие персонажи.';
      break;
    }
    case 'SHOOT_RESOLVED': {
      const die = COMBAT_DIE_PRESENTATION[event.dieFace].label;
      text = `${name} стреляет из «${event.weaponName}» (цель: ${NAMES[event.targetType]}): ${die}. `;
      text +=
        event.injuries === 0
          ? 'Без ран.'
          : `Ран ${event.injuries} (всего ${event.woundsTotal}) против Стойкости ${event.toughnessTotal}. `;
      text += event.killed ? 'Чужой убит!' : 'Чужой выжил.';
      if (event.retreat) text += ' Стрелка Отступления — Чужой отступает.';
      break;
    }
    case 'MELEE_RESOLVED': {
      const die = COMBAT_DIE_PRESENTATION[event.dieFace].label;
      text = `${name} атакует ${NAMES_ACCUSATIVE[event.targetType]} рукопашной: ${die}. `;
      text += 'Карта Заражения — в сброс. ';
      if (event.injuries > 0) {
        text += `Ран ${event.injuries} (всего ${event.woundsTotal}) против Стойкости ${event.toughnessTotal}. `;
        text += event.killed ? 'Чужой убит!' : 'Чужой выжил.';
        if (event.retreat) text += ' Стрелка Отступления — Чужой отступает.';
      } else {
        text += 'Промах: Персонаж получает Тяжёлую Травму.';
        if (event.attackerDied) text += ' Персонаж мёртв!';
      }
      break;
    }
    case 'INTRUDER_RETREATED': {
      text =
        `Отступление: карта Событий «${event.retreat.eventCardName}» указывает ${retreatNumberLabel(event.retreat)}. ` +
        retreatOutcomeText(event.retreat);
      break;
    }
    case 'CONTAMINATION_RECEIVED':
      text = `${name} получает карту Заражения в личный сброс. Инфекция не раскрывается.`;
      break;
    case 'PLAYER_DIED':
      text = `${name} погиб в отсеке #${event.roomId}. Труп и Тяжёлые Объекты остаются на полу.`;
      break;
    case 'ESCAPE_PODS_UNLOCKED':
      text = 'Первый погибший персонаж: все Спасательные Капсулы разблокированы.';
      break;
    case 'INTRUDERS_WITHDRAWN':
      text = `Лимит миниатюр: ${event.intruderIds.length} Взрослых вне Боя снято с поля; доступные жетоны возвращены в мешок.`;
      break;
    case 'INTRUDERS_MOVED':
      text = `Опасность: ${event.intruderIds.length} Чужих перемещаются из отсека #${event.fromRoomId} в #${event.toRoomId}, без Контакта.`;
      break;
    case 'INTRUDERS_BLOCKED_BY_DOOR':
      text = `Опасность: Чужие разрушили Дверь в Коридоре ${event.corridorId} и остались на месте.`;
      break;
    case 'INTRUDER_KILLED':
      text = event.remainsObjectId
        ? `${name} убивает ${NAMES_ACCUSATIVE[event.targetType]}! Жетон Останков — на полу отсека #${event.roomId}.`
        : `${name} убивает ${NAMES_ACCUSATIVE[event.targetType]} — Личинка не оставляет Останков (стр. 22).`;
      break;
    case 'INTRUDER_TRANSFORMED':
      text = `Крипер в отсеке #${event.roomId} заменён Трутнем.`;
      break;
  }
  return [{ text, tone: 'danger' }];
}
