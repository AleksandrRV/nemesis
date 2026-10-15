# Партия b02-intruders — Чужие

5 типов Чужих × 3 слота = **15 артов**. Слоты и безопасные зоны — [`doc/art-pipeline.md`](../../../art-pipeline.md) §2.

## Референсы

Жетоны Чужих в сканах — только символы без изображения, поэтому референсы — подписанные фото миниатюр и иллюстрированные
карты Атак, разложенные по тому, какой тип Чужого их наносит.

| Файл | Источник | Что на нём |
| --- | --- | --- |
| `refs/miniatures-larva.jpg` | `rules.pdf`, стр. 2, «Миниатюры» | Личинки |
| `refs/miniatures-creeper.jpg` | `rules.pdf`, стр. 2 | Криперы |
| `refs/miniatures-adult.jpg` | `rules.pdf`, стр. 2 | Взрослые |
| `refs/miniatures-breeder.jpg` | `rules.pdf`, стр. 2 | Трутни |
| `refs/miniatures-queen.jpg` | `rules.pdf`, стр. 2 | Королева |
| `refs/intruder-board.jpg` | `roles.pdf`, стр. 4 | планшет Чужих (Королева, Яйца, Личинка) |
| `refs/attack-transformation.jpg` | `cards_base.pdf` | Атака «Трансформация» — только Крипер |
| `refs/attack-summon.jpg` | `cards_base.pdf` | Атака «Зов» — Крипер, Королева |
| `refs/attack-scratch.jpg` | `cards_base.pdf` | Атака «Царапина» — Крипер, Взрослая особь, Трутень, Королева |
| `refs/attack-claws.jpg` | `cards_base.pdf` | Атака «Атака когтями» — Взрослая особь, Трутень, Королева |
| `refs/attack-bite.jpg` | `cards_base.pdf` | Атака «Укус» — Взрослая особь, Трутень, Королева |
| `refs/attack-frenzy.jpg` | `cards_base.pdf` | Атака «Ярость» — Трутень, Королева |
| `refs/attack-tail.jpg` | `cards_base.pdf` | Атака «Атака хвостом» — только Королева |

## Как генерировать

1. **Сначала Взрослая особь.** `intruder-adult-portrait` задаёт облик вида: хитин, череп, фактуру. Приложите его к
   портретам остальных типов дополнительным референсом — так все пять читаются как один вид на разных стадиях.
2. **Порядок для каждого типа:** сначала `portrait`, затем `splash` и `token` — к ним приложите референсы типа **и**
   готовый `portrait` этого типа.
3. Приложите к генератору файлы из строки «Референсы» и вставьте промпт из блока целиком.
4. Задайте в генераторе соотношение сторон из промпта (3:4, 16:9 или 1:1). Разрешение — не ниже указанного;
   больше — можно, агент уменьшит сам.
5. Если в картинке появился текст, рамка, подставка миниатюры, человек или второй Чужой — перегенерируйте.
6. Сохраните результат под именем из заголовка (`intruder-adult-portrait.png` и т. д.) и загрузите в
   `doc/art/inbox/b02-intruders/` на ветке `claude/dazzling-babbage-wl1ybp`.

## Состав

| Чужой | Референсы | Акцент свечения | Арты |
| --- | --- | --- | --- |
| Личинка | `miniatures-larva.jpg`, `intruder-board.jpg` | #4ade80 | `intruder-larva-portrait`, `intruder-larva-splash`, `intruder-larva-token` |
| Крипер | `miniatures-creeper.jpg`, `attack-transformation.jpg`, `attack-summon.jpg` | #facc15 | `intruder-creeper-portrait`, `intruder-creeper-splash`, `intruder-creeper-token` |
| Взрослая особь | `miniatures-adult.jpg`, `attack-claws.jpg`, `attack-scratch.jpg`, `attack-bite.jpg` | #ef4444 | `intruder-adult-portrait`, `intruder-adult-splash`, `intruder-adult-token` |
| Трутень | `miniatures-breeder.jpg`, `attack-frenzy.jpg` | #9f1239 | `intruder-breeder-portrait`, `intruder-breeder-splash`, `intruder-breeder-token` |
| Королева | `miniatures-queen.jpg`, `attack-tail.jpg`, `intruder-board.jpg` | #a855f7 | `intruder-queen-portrait`, `intruder-queen-splash`, `intruder-queen-token` |

Акцент свечения совпадает с цветом типа в интерфейсе (`intruderShapes.ts`): по нему Чужой узнаётся и на жетоне
размером 32 px.

## Взрослая особь

### intruder-adult-portrait

- Референсы: `refs/miniatures-adult.jpg` + `refs/attack-claws.jpg` + `refs/attack-scratch.jpg` + `refs/attack-bite.jpg`
- Слот: планшет Чужих, окна Боя и Атаки — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference.

Create: full-body or waist-up portrait of the Adult — a tall, lean biomechanical predator with an elongated eyeless skull, a ribbed exoskeleton, long sickle-clawed arms and a segmented bladed tail; standing half-crouched, claws raised, elongated skull tilted toward the viewer, tail curling around its legs. Bioluminescent emergency red glow (#ef4444) in its throat, joints and along the seams of its plating.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). The head in the upper third of the frame, the creature centered. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-adult-splash

- Референсы: `refs/miniatures-adult.jpg` + `refs/attack-claws.jpg` + `refs/attack-scratch.jpg` + `refs/attack-bite.jpg` + готовый `intruder-adult-portrait`
- Слот: кинематограф Контакта и Первого Контакта — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: cinematic wide shot of the Adult — a tall, lean biomechanical predator with an elongated eyeless skull, a ribbed exoskeleton, long sickle-clawed arms and a segmented bladed tail, leaping out of a ruptured bulkhead, sickle claws spread wide and jaws open in a hiss, tail whipping behind it. Bioluminescent emergency red glow (#ef4444) in its throat, joints and along the seams of its plating; flickering emergency light.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The creature is centered in an attacking pose and fills most of the height; the top 10% and the bottom 10% of the frame contain no important details (they will be covered by cinematic bars). Strong depth: the corridor recedes behind the creature.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-adult-token

- Референсы: `refs/miniatures-adult.jpg` + `refs/attack-claws.jpg` + `refs/attack-scratch.jpg` + `refs/attack-bite.jpg` + готовый `intruder-adult-portrait`
- Слот: значок Чужого в Комнате на поле — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: iconic token image of the Adult — a tall, lean biomechanical predator with an elongated eyeless skull, a ribbed exoskeleton, long sickle-clawed arms and a segmented bladed tail, side profile in a hunting crouch, elongated skull and curled bladed tail clearly readable. Bioluminescent emergency red glow (#ef4444) outlining the silhouette.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The whole creature is centered and fits entirely inside a centered circle whose diameter is 80% of the frame — the image will be shown in a circular mask. Uniform plain dark background (near-black teal) with a soft emergency red rim glow behind the silhouette; no environment. Bold, high-contrast silhouette that stays readable at 32-48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

## Личинка

### intruder-larva-portrait

- Референсы: `refs/miniatures-larva.jpg` + `refs/intruder-board.jpg` + готовый `intruder-adult-portrait` (облик вида)
- Слот: планшет Чужих, окна Боя и Атаки — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of the Adult is attached, keep the same species: the same chitin, skull style and texture.

Create: full-body or waist-up portrait of the Larva — a small pale eyeless parasitic larva, a segmented grub-like body glistening with slime, thin hooked legs along its underside and a split, four-part jaw opening at the front; coiled on a grated floor, front half raised and jaw opened toward the viewer, seen close and low. Bioluminescent sickly green glow (#4ade80) in its throat, joints and along the seams of its plating.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). The head in the upper third of the frame, the creature centered. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-larva-splash

- Референсы: `refs/miniatures-larva.jpg` + `refs/intruder-board.jpg` + готовый `intruder-larva-portrait`
- Слот: кинематограф Контакта и Первого Контакта — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: cinematic wide shot of the Larva — a small pale eyeless parasitic larva, a segmented grub-like body glistening with slime, thin hooked legs along its underside and a split, four-part jaw opening at the front, bursting out of a dark floor vent and lunging straight toward the viewer with its split jaw wide open, slime dripping. Bioluminescent sickly green glow (#4ade80) in its throat, joints and along the seams of its plating; flickering emergency light.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The creature is centered in an attacking pose and fills most of the height; the top 10% and the bottom 10% of the frame contain no important details (they will be covered by cinematic bars). Strong depth: the corridor recedes behind the creature.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-larva-token

- Референсы: `refs/miniatures-larva.jpg` + `refs/intruder-board.jpg` + готовый `intruder-larva-portrait`
- Слот: значок Чужого в Комнате на поле — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: iconic token image of the Larva — a small pale eyeless parasitic larva, a segmented grub-like body glistening with slime, thin hooked legs along its underside and a split, four-part jaw opening at the front, seen from a three-quarter top view, curled body and open jaw clearly readable. Bioluminescent sickly green glow (#4ade80) outlining the silhouette.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The whole creature is centered and fits entirely inside a centered circle whose diameter is 80% of the frame — the image will be shown in a circular mask. Uniform plain dark background (near-black teal) with a soft sickly green rim glow behind the silhouette; no environment. Bold, high-contrast silhouette that stays readable at 32-48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

## Крипер

### intruder-creeper-portrait

- Референсы: `refs/miniatures-creeper.jpg` + `refs/attack-transformation.jpg` + `refs/attack-summon.jpg` + готовый `intruder-adult-portrait` (облик вида)
- Слот: планшет Чужих, окна Боя и Атаки — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of the Adult is attached, keep the same species: the same chitin, skull style and texture.

Create: full-body or waist-up portrait of the Creeper — a low-slung crawling creature with a spiny segmented body, a long eyeless skull close to the ground and two long scythe-like blade arms; crouched low on the floor, both scythe arms raised above its head, eyeless skull turned toward the viewer. Bioluminescent toxic yellow glow (#facc15) in its throat, joints and along the seams of its plating.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). The head in the upper third of the frame, the creature centered. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-creeper-splash

- Референсы: `refs/miniatures-creeper.jpg` + `refs/attack-transformation.jpg` + `refs/attack-summon.jpg` + готовый `intruder-creeper-portrait`
- Слот: кинематограф Контакта и Первого Контакта — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: cinematic wide shot of the Creeper — a low-slung crawling creature with a spiny segmented body, a long eyeless skull close to the ground and two long scythe-like blade arms, scuttling out of the darkness along a corridor floor, both scythe arms raised high to strike. Bioluminescent toxic yellow glow (#facc15) in its throat, joints and along the seams of its plating; flickering emergency light.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The creature is centered in an attacking pose and fills most of the height; the top 10% and the bottom 10% of the frame contain no important details (they will be covered by cinematic bars). Strong depth: the corridor recedes behind the creature.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-creeper-token

- Референсы: `refs/miniatures-creeper.jpg` + `refs/attack-transformation.jpg` + `refs/attack-summon.jpg` + готовый `intruder-creeper-portrait`
- Слот: значок Чужого в Комнате на поле — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: iconic token image of the Creeper — a low-slung crawling creature with a spiny segmented body, a long eyeless skull close to the ground and two long scythe-like blade arms, seen from the front, crouched with both scythe arms raised in a clear V shape. Bioluminescent toxic yellow glow (#facc15) outlining the silhouette.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The whole creature is centered and fits entirely inside a centered circle whose diameter is 80% of the frame — the image will be shown in a circular mask. Uniform plain dark background (near-black teal) with a soft toxic yellow rim glow behind the silhouette; no environment. Bold, high-contrast silhouette that stays readable at 32-48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

## Трутень

### intruder-breeder-portrait

- Референсы: `refs/miniatures-breeder.jpg` + `refs/attack-frenzy.jpg` + готовый `intruder-adult-portrait` (облик вида)
- Слот: планшет Чужих, окна Боя и Атаки — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of the Adult is attached, keep the same species: the same chitin, skull style and texture.

Create: full-body or waist-up portrait of the Breeder — a hulking hunched brute, twice the bulk of an adult, with thick perforated plated hide, a massive armored back, a heavy low head and long clawed arms; towering in a hunched stance, long clawed arms raised to the sides, heavy head lowered toward the viewer. Bioluminescent deep crimson glow (#9f1239) in its throat, joints and along the seams of its plating.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). The head in the upper third of the frame, the creature centered. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-breeder-splash

- Референсы: `refs/miniatures-breeder.jpg` + `refs/attack-frenzy.jpg` + готовый `intruder-breeder-portrait`
- Слот: кинематограф Контакта и Первого Контакта — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: cinematic wide shot of the Breeder — a hulking hunched brute, twice the bulk of an adult, with thick perforated plated hide, a massive armored back, a heavy low head and long clawed arms, smashing through a corridor in a frenzy, long clawed arms raised high above its head, debris and sparks flying. Bioluminescent deep crimson glow (#9f1239) in its throat, joints and along the seams of its plating; flickering emergency light.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The creature is centered in an attacking pose and fills most of the height; the top 10% and the bottom 10% of the frame contain no important details (they will be covered by cinematic bars). Strong depth: the corridor recedes behind the creature.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-breeder-token

- Референсы: `refs/miniatures-breeder.jpg` + `refs/attack-frenzy.jpg` + готовый `intruder-breeder-portrait`
- Слот: значок Чужого в Комнате на поле — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: iconic token image of the Breeder — a hulking hunched brute, twice the bulk of an adult, with thick perforated plated hide, a massive armored back, a heavy low head and long clawed arms, seen from the front, hunched massive silhouette with both long arms raised. Bioluminescent deep crimson glow (#9f1239) outlining the silhouette.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The whole creature is centered and fits entirely inside a centered circle whose diameter is 80% of the frame — the image will be shown in a circular mask. Uniform plain dark background (near-black teal) with a soft deep crimson rim glow behind the silhouette; no environment. Bold, high-contrast silhouette that stays readable at 32-48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

## Королева

### intruder-queen-portrait

- Референсы: `refs/miniatures-queen.jpg` + `refs/attack-tail.jpg` + `refs/intruder-board.jpg` + готовый `intruder-adult-portrait` (облик вида)
- Слот: планшет Чужих, окна Боя и Атаки — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of the Adult is attached, keep the same species: the same chitin, skull style and texture.

Create: full-body or waist-up portrait of the Queen — a towering monstrosity with a huge crest of long spikes crowning her skull, a long segmented serpentine tail, slender many-jointed clawed arms and a regal, terrifying presence; rearing upright in her nest, spiked crest fanned out, slender claws spread, tail coiling up behind her. Bioluminescent violet glow (#a855f7) in its throat, joints and along the seams of its plating.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). The head in the upper third of the frame, the creature centered. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-queen-splash

- Референсы: `refs/miniatures-queen.jpg` + `refs/attack-tail.jpg` + `refs/intruder-board.jpg` + готовый `intruder-queen-portrait`
- Слот: кинематограф Контакта и Первого Контакта — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: cinematic wide shot of the Queen — a towering monstrosity with a huge crest of long spikes crowning her skull, a long segmented serpentine tail, slender many-jointed clawed arms and a regal, terrifying presence, rising to full height in her nest of resin and cables, crest flared, slender claws spread and the long tail lashing forward like a spear. Bioluminescent violet glow (#a855f7) in its throat, joints and along the seams of its plating; flickering emergency light.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The creature is centered in an attacking pose and fills most of the height; the top 10% and the bottom 10% of the frame contain no important details (they will be covered by cinematic bars). Strong depth: the corridor recedes behind the creature.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```

### intruder-queen-token

- Референсы: `refs/miniatures-queen.jpg` + `refs/attack-tail.jpg` + `refs/intruder-board.jpg` + готовый `intruder-queen-portrait`
- Слот: значок Чужого в Комнате на поле — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the creature: anatomy, silhouette, head shape, limbs, tail and body plating. The photo of the unpainted grey miniature shows the shape only — render the creature as living chitin and wet flesh. Do NOT copy any text, letters, numbers, frames, icons, logos, bases, miniatures or UI elements from the reference. If a finished portrait of this creature is attached, keep exactly the same anatomy, head and coloring.

Create: iconic token image of the Queen — a towering monstrosity with a huge crest of long spikes crowning her skull, a long segmented serpentine tail, slender many-jointed clawed arms and a regal, terrifying presence, seen from the front, spiked crest fanned out as the dominant shape of the silhouette. Bioluminescent violet glow (#a855f7) outlining the silhouette.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The whole creature is centered and fits entirely inside a centered circle whose diameter is 80% of the frame — the image will be shown in a circular mask. Uniform plain dark background (near-black teal) with a soft violet rim glow behind the silhouette; no environment. Bold, high-contrast silhouette that stays readable at 32-48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows, glossy black-blue biomechanical chitin with wet highlights.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniature bases, human figures, extra heads, duplicated limbs, cute or cartoonish look.
```
