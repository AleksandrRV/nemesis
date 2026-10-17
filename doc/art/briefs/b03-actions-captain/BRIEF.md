# Партия b03-actions-captain — карты Действий Капитана

10 карт колоды Капитана, **9 артов**: две копии «Поиска» — одна иллюстрация. Слот `action-<id>-art` и его
безопасная зона — [`doc/art-pipeline.md`](../../../art-pipeline.md) §2.

## Референсы

- `refs/action-captain-<карта>.jpg` — карты целиком из `cards_base.pdf` (стр. 17 и 19): по ним берётся **сюжет**
  сцены и настроение.
- `refs/character-captain-portrait.png` — **принятый портрет Капитана** из партии b01. Внешность в цифровой версии
  новая (решение владельца, `doc/art-pipeline.md` §6), поэтому лицо, борода, экипировка и револьвер берутся с
  портрета, а не с карты.

## Как генерировать

1. К каждому промпту приложите **два** файла: карту из строки «Референсы» и `character-captain-portrait.png`.
2. Вставьте промпт из блока целиком и задайте соотношение сторон **4:3**. Разрешение — не ниже 1200×900; больше —
   можно, агент уменьшит сам.
3. Главное действие и лицо Капитана — в центральных 60% ширины: в руке игрока виден только центральный квадрат.
   Нижняя треть кадра — темнее и спокойнее: поверх неё ложится текст карты.
4. Если появился текст, рамка, значок или второй Капитан — перегенерируйте.
5. Сохраните результат под именем из заголовка (`action-captain-reload-art.png` и т. д.) и загрузите в
   `doc/art/inbox/b03-actions-captain/` на ветке `claude/dazzling-babbage-wl1ybp`.

## Состав

| Карта | id в игре | Референс | Арт |
| --- | --- | --- | --- |
| Перезарядка | `ACT_CAP_RELOAD` | `refs/action-captain-reload.jpg` | `action-captain-reload-art` |
| Приказ | `ACT_CAP_ORDER` | `refs/action-captain-order.jpg` | `action-captain-order-art` |
| Мотивация | `ACT_CAP_MOTIVATION` | `refs/action-captain-motivation.jpg` | `action-captain-motivation-art` |
| Огонь на подавление | `ACT_CAP_SUPPRESSIVE_FIRE` | `refs/action-captain-suppressive-fire.jpg` | `action-captain-suppressive-fire-art` |
| Базовый ремонт | `ACT_CAP_BASIC_REPAIR` | `refs/action-captain-basic-repair.jpg` | `action-captain-basic-repair-art` |
| Отставить | `ACT_CAP_DISMISS` | `refs/action-captain-dismiss.jpg` | `action-captain-dismiss-art` |
| Поиск | `ACT_CAP_SEARCH_1`, `ACT_CAP_SEARCH_2` | `refs/action-captain-search.jpg` | `action-captain-search-art` |
| Отдых | `ACT_CAP_REST` | `refs/action-captain-rest.jpg` | `action-captain-rest-art` |
| Разрушение | `ACT_CAP_DEMOLITION` | `refs/action-captain-demolition.jpg` | `action-captain-demolition-art` |

## Перезарядка

### action-captain-reload-art

- Референсы: `refs/action-captain-reload.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Добавьте 1 ед. Боезапаса в ваш Револьвер
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Reload" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; crouched behind a twisted bulkhead used as cover, snapping a fresh glowing magenta energy cell into the open cylinder of his revolver, eyes fixed on the dark corridor ahead, focused and calm.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Приказ

### action-captain-order-art

- Референсы: `refs/action-captain-order.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Переместите выбранного Персонажа в соседнюю Комнату
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Order" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; standing tall with the revolver held up in one hand, the other arm stretched out sharply pointing toward an open hatch to the side, barking a command; a blurred crew silhouette in the foreground already turning toward the hatch.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Мотивация

### action-captain-motivation-art

- Референсы: `refs/action-captain-motivation.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Все Персонажи в Комнате берут по 1 карте Действий
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Motivation" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; standing on a raised cargo crate in a dim hold, one fist raised high, the cigar glowing, rallying the crew; two or three blurred crew silhouettes below him look up, lit by a cold blue spotlight from above.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Огонь на подавление

### action-captain-suppressive-fire-art

- Референсы: `refs/action-captain-suppressive-fire.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Переместите себя или другого Персонажа, не вызывая Атаки Чужих
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Suppressive Fire" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; firing his revolver down a smoky corridor with a bright magenta muzzle flash, covering a crew member who runs past him toward safety; shapes of something inhuman barely visible in the darkness at the far end.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Базовый ремонт

### action-captain-basic-repair-art

- Референсы: `refs/action-captain-basic-repair.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Сбросьте маркер Неисправности или почините/повредите Двигатель
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Basic Repair" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; kneeling at an open wall panel full of torn cables, holding a sparking cutting tool, a shower of sparks lighting his face and hands, the revolver holstered at his hip.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Отставить

### action-captain-dismiss-art

- Референсы: `refs/action-captain-dismiss.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Отмените Действие другого Игрока в вашей Комнате
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Belay That" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; stepping forward with his palm raised in a firm 'stop' gesture toward a blurred crew member in the foreground whose hand is reaching for a console, the Captain's stern face lit from below by the console's light.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Поиск

### action-captain-search-art

- Референсы: `refs/action-captain-search.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Вытяните 2 карты Предметов, возьмите 1 (две копии карты — один арт)
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Search" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; seen from behind and slightly to the side, stepping into a cluttered storage room, a shoulder lamp beam sweeping over open lockers, crates and scattered supplies, the revolver held low.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Отдых

### action-captain-rest-art

- Референсы: `refs/action-captain-rest.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Просканируйте карты Заражения в руке
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Rest" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; pausing for breath in a dim side room, running a small handheld medical scanner over his forearm, its pale beam casting light on his tired face; the twisted remains of a dead alien creature lie on the floor in the background.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```

## Разрушение

### action-captain-demolition-art

- Референсы: `refs/action-captain-demolition.jpg` + `refs/character-captain-portrait.png`
- Смысл карты: Разрушьте Дверь или поместите маркер Неисправности
- Слот: окно карты Действия, превью в руке — **4:3, 1200×900**

```text
Use the attached images as references. The finished portrait shows how the Captain looks in this game: keep exactly the same face, beard, hair, outfit, harness and revolver. The original card shows only the idea of the scene: take the action and mood from it, but do NOT copy its character design, composition, text, letters, numbers, frames, icons, logos or UI.

Create: a dramatic scene illustrating the action "Demolition" (do not write this word in the image) — the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; smashing a jammed corridor door with a heavy kick and the butt of his revolver, the door buckling, sparks and shattered metal fragments flying, a red emergency light behind him.
Composition: horizontal 4:3 aspect ratio, 1200x900 px (or larger at 4:3). The main action and the Captain's face are inside the central 60% of the width — the card in hand shows only the central square of the image. The bottom third of the frame is darker and low in detail: card text is overlaid there.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, extra fingers, distorted hands, duplicated weapons, a second Captain.
```
