import { describe, expect, it } from 'vitest';
import { combatStatusState, putIntruder } from '../testing/contactFixtures.js';
import { isPlayerInCombat, isRoomInCombat } from './combatStatus.js';

describe('Статус Боя (стр. 18)', () => {
  it('персонаж в Бою, когда в его отсеке стоит Чужой', () => {
    const state = combatStatusState();
    expect(isRoomInCombat(state, 11)).toBe(false);
    expect(isPlayerInCombat(state, 'player-1')).toBe(false);

    putIntruder(state, 'ADULT', 11);

    expect(isRoomInCombat(state, 11)).toBe(true);
    expect(isPlayerInCombat(state, 'player-1')).toBe(true);
  });

  it('мёртвые, спящие и улетевшие персонажи в Бою не состоят', () => {
    const state = combatStatusState();
    putIntruder(state, 'ADULT', 11);

    state.players['player-1']!.isDead = true;
    expect(isPlayerInCombat(state, 'player-1')).toBe(false);

    state.players['player-1']!.isDead = false;
    state.players['player-1']!.isInHibernation = true;
    expect(isPlayerInCombat(state, 'player-1')).toBe(false);

    state.players['player-1']!.isInHibernation = false;
    state.players['player-1']!.hasEscapedInPod = true;
    expect(isPlayerInCombat(state, 'player-1')).toBe(false);
  });

  it('в отсеке без Чужих Боя нет, даже если Чужой стоит в соседнем', () => {
    const state = combatStatusState();
    putIntruder(state, 'ADULT', 12);
    expect(isRoomInCombat(state, 11)).toBe(false);
    expect(isPlayerInCombat(state, 'player-1')).toBe(false);
  });

  it('неизвестный персонаж не в Бою (защита от чужого идентификатора)', () => {
    const state = combatStatusState();
    expect(isPlayerInCombat(state, 'no-such-player')).toBe(false);
  });
});
