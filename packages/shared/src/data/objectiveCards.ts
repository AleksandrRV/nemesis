import type { ObjectiveCard, ObjectiveKind } from '../types/cards.js';

function objective(
  id: string,
  kind: ObjectiveKind,
  name: string,
  minPlayers: number | null,
  conditions: string[],
  flavorText: string,
): ObjectiveCard {
  return { id, kind, name, minPlayers, conditions, flavorText, description: conditions.join(' ИЛИ ') };
}

export const PERSONAL_OBJECTIVE_CARDS: readonly ObjectiveCard[] = [
  objective(
    'OBJ_PERSONAL_SAVE_PROPERTY',
    'PERSONAL',
    'Сохранить имущество',
    2,
    ['Корабль должен достигнуть Земли.', 'Только ваш Персонаж должен выжить.'],
    'Слыхали о тех бедолагах, которые смылись с TSH-7 после взрыва двигателя?',
  ),
  objective(
    'OBJ_PERSONAL_OLD_FRIEND',
    'PERSONAL',
    'Старинный друг',
    3,
    ['Корабль должен достигнуть Земли.', 'Только ваш Персонаж должен выжить.'],
    'Этот корабль спасал мою шкуру не один раз, чего я не могу сказать ни об одном из вас! Будь я проклят, если брошу старушку вот так!',
  ),
  objective(
    'OBJ_PERSONAL_QUARANTINE',
    'PERSONAL',
    'Карантин',
    2,
    ['Корабль должен достигнуть Марса.', 'Корабль должен достигнуть Земли И Улей должен быть уничтожен.'],
    'Кто знает, что еще есть на этом корабле? Слишком опасно привозить это на Землю.',
  ),
  objective(
    'OBJ_PERSONAL_TIRELESS_EXPLORER',
    'PERSONAL',
    'Неутомимый исследователь',
    2,
    ['Отправьте Сигнал И все Комнаты на Корабле должны быть Исследованы.'],
    'Я узнаю, что произошло на этом корабле, с вами или без вас.',
  ),
  objective(
    'OBJ_PERSONAL_DECENT_BURIAL',
    'PERSONAL',
    'Достойное погребение',
    2,
    ['Отправьте Сигнал И закончите игру в Капсуле или Камере Анабиоза с Синим Трупом Персонажа.'],
    'Прах к праху, пепел к пеплу.',
  ),
  objective(
    'OBJ_PERSONAL_SCAVENGER',
    'PERSONAL',
    'Хламовщик',
    2,
    [
      'Закончите игру в Капсуле И у вас должно быть хотя бы 7 Предметов. Неактивированные Квестовые Предметы не учитываются.',
    ],
    'К черту корабль. Главное я забрал свои вещички!',
  ),
  objective(
    'OBJ_PERSONAL_BIG_HUNT',
    'PERSONAL',
    'Большая охота',
    2,
    ['Отправьте Сигнал И Корабль должен быть уничтожен.', 'Отправьте Сигнал И Королева должна быть убита.'],
    '“Она огромная, чувак, ГИГАНТСКАЯ!” “И что? Возьмем пушки побольше.”',
  ),
  objective(
    'OBJ_PERSONAL_BEST_FRIENDS',
    'PERSONAL',
    'Лучшие друзья на всю жизнь',
    4,
    ['Вы и хотя бы 1 другой Персонаж должны выжить.'],
    'Хватит этой корпоративной чуши. Нам нужно держаться вместе, как всегда.',
  ),
  objective(
    'OBJ_PERSONAL_ALIENS_ON_BOARD',
    'PERSONAL',
    'Пришельцы на корабле',
    5,
    ['Отправьте Сигнал И Улей должен быть уничтожен.', 'Отправьте Сигнал И Корабль должен быть уничтожен.'],
    'Я уже сыт по горло этими ****** пришельцами на этом ****** корабле!.',
  ),
];

function playerMustNotSurvive(playerNumber: number): string[] {
  return [`Персонаж Игрока ${playerNumber} не должен выжить.`, 'Только ваш Персонаж должен выжить.'];
}

export const CORPORATE_OBJECTIVE_CARDS: readonly ObjectiveCard[] = [
  objective(
    'OBJ_CORPORATE_MY_PRECIOUS',
    'CORPORATE',
    'Моя прелесть',
    2,
    ['Отправьте Сигнал И закончите игру в Капсуле или Камере Анабиоза с Яйцом Чужих.'],
    'Я слышу его, оно говорит со мной!',
  ),
  objective(
    'OBJ_CORPORATE_NECROSCOPY',
    'CORPORATE',
    'Некроскопия',
    2,
    ['Отправьте Сигнал И Останки Чужого должны быть изучены.'],
    'Я убежден, что детальный анализ кокона может дать бесценные знания о происхождении и строении этого вида.',
  ),
  objective(
    'OBJ_CORPORATE_AB_OVO',
    'CORPORATE',
    'AB OVO',
    2,
    ['Яйцо Чужих должно быть изучено.'],
    'Жаль, что остальные члены экипажа не разделяют моего академического интереса.',
  ),
  objective(
    'OBJ_CORPORATE_EXTREME_FIELD_BIOLOGY',
    'CORPORATE',
    'Экстремальная полевая биология',
    2,
    ['Хотя бы 2 Слабости Чужих должны быть изучены.'],
    'На кону стоит больше, чем наши жизни. Мы должны сделать все возможное, чтобы подготовить других к грядущему.',
  ),
  objective(
    'OBJ_CORPORATE_BIDE_YOUR_TIME',
    'CORPORATE',
    'Выждать момент для атаки',
    2,
    playerMustNotSurvive(1),
    'Мне советовали дождаться хорошей возможности, и мне кажется, она появилась.',
  ),
  objective(
    'OBJ_CORPORATE_GREENER_GRASS',
    'CORPORATE',
    'Трава зеленее',
    2,
    playerMustNotSurvive(2),
    'Некоторые люди знают слишком много, чтобы так просто покинуть корпорацию.',
  ),
  objective(
    'OBJ_CORPORATE_OLD_FEUD',
    'CORPORATE',
    'Старый спор',
    3,
    playerMustNotSurvive(3),
    'В долгих и скучных полетах через холодный космос что-то просто обязано пойти не так. Старые раны долго заживают.',
  ),
  objective(
    'OBJ_CORPORATE_ARMED_TAKEOVER',
    'CORPORATE',
    'Вооруженный захват',
    4,
    playerMustNotSurvive(4),
    'Есть только 2 типа людей: те, кого можно купить, и те, кого можно убить.',
  ),
  objective(
    'OBJ_CORPORATE_OUTSIDE_INSIGHT',
    'CORPORATE',
    'Прозрение извне',
    5,
    playerMustNotSurvive(5),
    'Разве вы не слышите их? Знания Древних будут дарованы тому, кто готов заплатить за них кровавую цену.',
  ),
];

export const SOLO_COOP_OBJECTIVE_CARDS: readonly ObjectiveCard[] = [
  objective(
    'OBJ_SOLO_DESTINATION_EARTH',
    'SOLO_COOP',
    'Пункт назначения: Земля',
    null,
    ['Корабль должен достигнуть Земли.'],
    'Они отправили нас на верную гибель. Пусть теперь сами разгребают все это.',
  ),
  objective(
    'OBJ_SOLO_AUTOPSY',
    'SOLO_COOP',
    'Вскрытие покажет',
    null,
    ['Поместите Синий Труп Персонажа в Операционную.'],
    'Что бы не произошло с ним, это может повториться с нами.',
  ),
  objective(
    'OBJ_SOLO_CLOSE_CONTACT_PROTOCOL',
    'SOLO_COOP',
    'Протокол близких контактов',
    null,
    ['Хотя бы 2 Слабости Чужих должны быть изучены.'],
    '11.8b - Участвующие стороны обязаны сохранять контакт с объектом до получения достаточного количества данных.',
  ),
  objective(
    'OBJ_SOLO_BEHEAD_THE_ENEMY',
    'SOLO_COOP',
    'Обезглавить врага',
    null,
    ['Отправьте Сигнал И Корабль должен быть уничтожен.', 'Отправьте Сигнал И Королева должна быть убита.'],
    'Когда шансов на победу нет, меньшее, что можно сделать - это уйти красиво.',
  ),
  objective(
    'OBJ_SOLO_NO_ONE_LEFT_BEHIND',
    'SOLO_COOP',
    'Своих не бросаем',
    null,
    ['Отправьте Сигнал И все Комнаты на Корабле должны быть Исследованы.'],
    'Некоторые камеры Анабиоза пусты. Нужно убедиться, что все на своих местах.',
  ),
  objective(
    'OBJ_SOLO_SPECIAL_DELIVERY',
    'SOLO_COOP',
    'Спецдоставка',
    null,
    ['Закончите игру в Капсуле или Камере Анабиоза с Яйцом Чужих.'],
    'Знаю одного парня в Нью Токио, который скупает странную хрень из глубокого космоса...',
  ),
  objective(
    'OBJ_SOLO_CLEANUP_CREW',
    'SOLO_COOP',
    'Команда зачистки',
    null,
    ['Отправьте Сигнал И Улей должен быть уничтожен.', 'Отправьте Сигнал И Корабль должен быть уничтожен.'],
    'Я не так представлял себе “Санобработку корабля”.',
  ),
];

export const SOLO_OBJECTIVES_DEALT = 2;

export function objectivesForPlayerCount(cards: readonly ObjectiveCard[], playerCount: number): ObjectiveCard[] {
  return cards.filter((card) => card.minPlayers === null || card.minPlayers <= playerCount);
}
