import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ACTION_CARDS } from './actionCards.js';
import { CRAFTED_ITEM_CARDS } from './crafting.js';
import { RED_ITEM_CARDS } from './itemCards.js';
import { QUEST_DEFINITIONS } from './questItems.js';
import { STARTING_WEAPONS } from './startingItems.js';
import { weaponModifiers } from './weaponModifiers.js';

interface CharacterTable {
  status: string;
  facts: { source: string; page?: string; lines?: string }[];
  expectation: Record<string, unknown>;
  scanDiscrepancies?: unknown[];
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { tables: Record<string, CharacterTable> };

function table(id: string): CharacterTable {
  const entry = dataSources.tables[id];
  if (!entry) throw new Error(`В пакете источника нет таблицы ${id}`);
  return entry;
}

const CHARACTER_TABLES = ['starting-weapons', 'weapon-modifiers', 'action-cards', 'quest-items'];

describe('Golden: карты Персонажей (cards_additional.pdf стр. 15–18, cards_base.pdf стр. 17–29)', () => {
  it('таблицы Этапа 4 сверены со сканом и не содержат открытых расхождений', () => {
    for (const id of CHARACTER_TABLES) {
      const entry = table(id);
      expect(entry.status, id).toBe('SCAN_VERIFIED');
      expect(
        entry.facts.some((fact) => fact.source === 'pnp-scans' && fact.page),
        id,
      ).toBe(true);
      expect(entry.scanDiscrepancies ?? [], id).toEqual([]);
    }
  });

  it('стартовое Оружие совпадает с картами: тип, Боезапас, Тяжесть и текст', () => {
    const expectation = table('starting-weapons').expectation as { weapons: Record<string, unknown> };
    const actual = Object.fromEntries(
      Object.entries(STARTING_WEAPONS).map(([characterClass, weapon]) => [
        characterClass,
        {
          name: weapon.name,
          isEnergyWeapon: weapon.isEnergyWeapon,
          ammo: weapon.ammo,
          isHeavy: weapon.isHeavy,
          description: weapon.description,
        },
      ]),
    );

    expect(actual).toEqual(expectation.weapons);
    for (const weapon of Object.values(STARTING_WEAPONS)) expect(weapon.maxAmmo).toBe(weapon.ammo);
  });

  it('модификаторы каждого Оружия совпадают с таблицей источника', () => {
    const expectation = table('weapon-modifiers').expectation as { weaponModifiers: Record<string, unknown> };
    const weapons = [...Object.values(STARTING_WEAPONS), ...RED_ITEM_CARDS, ...CRAFTED_ITEM_CARDS].filter(
      (card) => card.isWeapon,
    );

    expect(Object.fromEntries(weapons.map((card) => [card.name, weaponModifiers(card.id)]))).toEqual(
      expectation.weaponModifiers,
    );
  });

  it('60 карт Действий совпадают с картами по названию, цене и тексту', () => {
    const expectation = table('action-cards').expectation as { cards: Record<string, unknown> };

    expect(
      Object.fromEntries(
        ACTION_CARDS.map((card) => [
          card.id,
          { name: card.name, playCost: card.playCost, description: card.description },
        ]),
      ),
    ).toEqual(expectation.cards);
  });

  it('12 Квестовых Предметов совпадают с обеими сторонами карт', () => {
    const expectation = table('quest-items').expectation as { quests: Record<string, unknown> };

    expect(
      Object.fromEntries(
        QUEST_DEFINITIONS.map((quest) => [
          quest.key,
          {
            characterClass: quest.characterClass,
            name: quest.name,
            activation:
              quest.activation.kind === 'ROOM'
                ? { room: quest.activation.roomDefinitionId }
                : { sacrifice: quest.activation.label },
            questText: quest.questText,
            itemDescription: quest.itemDescription,
            actionCost: quest.actionCost,
            isSingleUse: quest.isSingleUse,
            isHeavy: quest.isHeavy,
          },
        ]),
      ),
    ).toEqual(expectation.quests);
  });
});
