# Партия b01-characters — персонажи

6 персонажей × 3 слота = **18 артов** (Медик — промо, в игре его нет, в партию не входит). Слоты и безопасные зоны —
[`doc/art-pipeline.md`](../../../art-pipeline.md) §2.

## Как генерировать

1. **Порядок для каждого персонажа:** сначала `portrait` (только по планшету), затем `splash` и `avatar` — к ним
   приложите планшет **и** готовый `portrait`: так лицо и экипировка совпадут во всех трёх артах.
2. Приложите к генератору файлы, указанные в строке «Референсы», и вставьте промпт из блока целиком.
3. Задайте в генераторе соотношение сторон из промпта (3:4, 16:9 или 1:1). Разрешение — не ниже указанного;
   больше — можно, агент уменьшит сам.
4. Если в картинке появился текст, рамка или вторая фигура — перегенерируйте; мелкие огрехи агент поправит
   кадрированием.
5. Сохраните результат под именем из заголовка (`character-captain-portrait.png` и т. д.) и загрузите в
   `doc/art/inbox/b01-characters/` на ветке `claude/dazzling-babbage-wl1ybp`.

## Состав

| Персонаж | Референс | Арты |
| --- | --- | --- |
| Капитан | `refs/character-captain.jpg` | `character-captain-portrait`, `character-captain-splash`, `character-captain-avatar` |
| Пилот | `refs/character-pilot.jpg` | `character-pilot-portrait`, `character-pilot-splash`, `character-pilot-avatar` |
| Механик | `refs/character-mechanic.jpg` | `character-mechanic-portrait`, `character-mechanic-splash`, `character-mechanic-avatar` |
| Солдат | `refs/character-soldier.jpg` | `character-soldier-portrait`, `character-soldier-splash`, `character-soldier-avatar` |
| Учёный | `refs/character-scientist.jpg` | `character-scientist-portrait`, `character-scientist-splash`, `character-scientist-avatar` |
| Скаут | `refs/character-scout.jpg` | `character-scout-portrait`, `character-scout-splash`, `character-scout-avatar` |

## Капитан

### character-captain-portrait

- Референсы: `refs/character-captain.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth with curling smoke, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core; holding the revolver raised beside his shoulder, calm and commanding.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-captain-splash

- Референсы: `refs/character-captain.jpg` + готовый `character-captain-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth with curling smoke, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame, armed with a large energy revolver with a glowing magenta core, standing at the head of a dim corridor, revolver raised, his free hand gesturing forward as he leads his crew.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-captain-avatar

- Референсы: `refs/character-captain.jpg` + готовый `character-captain-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Captain — a rugged man in his forties with swept-back dark hair and a full dark beard, a cigar clenched in his teeth with curling smoke, wearing an olive military field jacket under a heavy armored harness with a mechanical back frame; expression: steady, weary, authoritative gaze.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft cold blue glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold blue neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

## Пилот

### character-pilot-portrait

- Референсы: `refs/character-pilot.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Pilot — a woman in her thirties with short tousled platinum-blonde pixie hair and a tired, determined face, wearing an olive flight jacket with a shearling collar and light armor plates, armed with a compact pistol in one hand and a heavy rifle resting on her shoulder; pistol held low, rifle on her shoulder, glancing past the viewer as if checking a threat behind.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with toxic green neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-pilot-splash

- Референсы: `refs/character-pilot.jpg` + готовый `character-pilot-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Pilot — a woman in her thirties with short tousled platinum-blonde pixie hair and a tired, determined face, wearing an olive flight jacket with a shearling collar and light armor plates, armed with a compact pistol in one hand and a heavy rifle resting on her shoulder, stepping out of a cockpit hatch into a ruined corridor, pistol drawn, rifle slung on her shoulder, green console light on her face.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with toxic green neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-pilot-avatar

- Референсы: `refs/character-pilot.jpg` + готовый `character-pilot-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Pilot — a woman in her thirties with short tousled platinum-blonde pixie hair and a tired, determined face, wearing an olive flight jacket with a shearling collar and light armor plates; expression: tense, alert, slightly exhausted.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft toxic green glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with toxic green neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

## Механик

### character-mechanic-portrait

- Референсы: `refs/character-mechanic.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Mechanic — a figure in a heavy welding helmet with a scratched white face shield and a small yellow hazard emblem, wearing a dark work suit with orange armor plates, rubber hoses and tool belts, armed with a bulky orange rivet gun held like a pistol; rivet gun raised, welding sparks showering around, the face shield reflecting the sparks.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with warm orange neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-mechanic-splash

- Референсы: `refs/character-mechanic.jpg` + готовый `character-mechanic-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Mechanic — a figure in a heavy welding helmet with a scratched white face shield and a small yellow hazard emblem, wearing a dark work suit with orange armor plates, rubber hoses and tool belts, armed with a bulky orange rivet gun held like a pistol, kneeling beside an opened engine panel full of cables, rivet gun in hand, a fountain of welding sparks lighting the scene.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with warm orange neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-mechanic-avatar

- Референсы: `refs/character-mechanic.jpg` + готовый `character-mechanic-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Mechanic — a figure in a heavy welding helmet with a scratched white face shield and a small yellow hazard emblem, wearing a dark work suit with orange armor plates, rubber hoses and tool belts; expression: the face shield turned toward the viewer, a faint glint of eyes behind it.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft warm orange glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with warm orange neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

## Солдат

### character-soldier-portrait

- Референсы: `refs/character-soldier.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Soldier — a battle-hardened Black man in his thirties with a shaved head and small cuts on his face, inside a heavy armored space suit with an closed armored glass helmet and a thick metal neck ring, armed with a heavy assault rifle; rifle held across his chest, ready to fire, red emergency light sweeping across his armor.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with alarm red neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-soldier-splash

- Референсы: `refs/character-soldier.jpg` + готовый `character-soldier-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Soldier — a battle-hardened Black man in his thirties with a shaved head and small cuts on his face, inside a heavy armored space suit with an closed armored glass helmet and a thick metal neck ring, armed with a heavy assault rifle, advancing through a red-lit corridor with flashing alarm lights, assault rifle shouldered and aimed into the darkness ahead.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with alarm red neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-soldier-avatar

- Референсы: `refs/character-soldier.jpg` + готовый `character-soldier-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Soldier — a battle-hardened Black man in his thirties with a shaved head and small cuts on his face, inside a heavy armored space suit with an closed armored glass helmet and a thick metal neck ring; expression: hard, focused, unflinching.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft alarm red glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with alarm red neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

## Учёный

### character-scientist-portrait

- Референсы: `refs/character-scientist.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Scientist — a lean man in his thirties with messy brown hair, stubble and a small cut on his forehead, wearing protective goggles and a head lamp, and a padded insulated lab jacket with straps and pouches, armed with a small sidearm and a handheld laser sample scanner; examining something off-frame with a thin cyan laser beam from the handheld scanner, sidearm holstered.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold cyan neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-scientist-splash

- Референсы: `refs/character-scientist.jpg` + готовый `character-scientist-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Scientist — a lean man in his thirties with messy brown hair, stubble and a small cut on his forehead, wearing protective goggles and a head lamp, and a padded insulated lab jacket with straps and pouches, armed with a small sidearm and a handheld laser sample scanner, crouching in a wrecked laboratory among broken specimen tanks, scanning a strange organic sample with a thin cyan laser beam.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold cyan neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-scientist-avatar

- Референсы: `refs/character-scientist.jpg` + готовый `character-scientist-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Scientist — a lean man in his thirties with messy brown hair, stubble and a small cut on his forehead, wearing protective goggles and a head lamp, and a padded insulated lab jacket with straps and pouches; expression: curious, intense, a little unhinged.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft cold cyan glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with cold cyan neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

## Скаут

### character-scout-portrait

- Референсы: `refs/character-scout.jpg`
- Слот: планшет персонажа во время партии, окна Боя и Контакта — **3:4, 900×1200**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference.

Create: waist-up portrait of the Scout — a young woman with long wavy auburn hair, wearing dark form-fitting tactical armor with violet trim, armed with a compact signal device in one hand and a combat knife; pressing a finger to her lips in a silent "shh" gesture, device in her other hand.
Composition: vertical 3:4 aspect ratio, 900x1200 px (or larger at 3:4). Head in the upper third of the frame, face within the central 60% of the width, slight three-quarter view. Background: dim starship corridor, softly blurred, getting darker toward the bottom edge.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with deep violet neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-scout-splash

- Референсы: `refs/character-scout.jpg` + готовый `character-scout-portrait`
- Слот: выбор роли в лобби, брифинг экипажа, экран итогов — **16:9, 1920×1080**

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: cinematic wide shot of the Scout — a young woman with long wavy auburn hair, wearing dark form-fitting tactical armor with violet trim, armed with a compact signal device in one hand and a combat knife, crouching behind cover in a shadowy maintenance shaft, finger to her lips in a silent "shh" gesture, peering toward the viewer.
Composition: horizontal 16:9 aspect ratio, 1920x1080 px (or larger at 16:9). The character stands in the right half of the frame, framed from mid-thigh up; head and weapon within the middle 80% of the height. The left third of the frame is a dark, low-detail starship interior that will sit under overlaid text.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with deep violet neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```

### character-scout-avatar

- Референсы: `refs/character-scout.jpg` + готовый `character-scout-portrait`
- Слот: жетон на поле, ростер экипажа, Рация, журнал — **1:1, 512×512**, круглая маска

```text
Use the attached image(s) only as a design reference for the character: face, hairstyle, outfit, armor, gear and weapon. Do NOT copy any text, letters, frames, icons, logos, miniatures or UI elements from the reference. If a second image (the finished portrait) is attached, keep exactly the same face, hair and outfit.

Create: close-up head-and-shoulders avatar of the Scout — a young woman with long wavy auburn hair, wearing dark form-fitting tactical armor with violet trim; expression: sly, watchful, half-smiling.
Composition: square 1:1 aspect ratio, 512x512 px (or larger at 1:1). The face is centered and fits entirely inside a centered circle whose diameter is 70% of the frame — the image will be shown in a circular mask. Plain dark background with a soft deep violet glow behind the head. Strong, simple shapes that stay readable at 48 px.
Style: dark sci-fi horror digital painting in the spirit of the reference, cinematic and painterly, dramatic rim lighting, deep teal and violet shadows with deep violet neon accent light, haze, drifting smoke and sparks, gritty derelict starship interior.
Avoid: text, letters, numbers, logos, watermarks, signatures, card frames, borders, UI, icons, miniatures, extra fingers, distorted hands, duplicated weapons.
```
