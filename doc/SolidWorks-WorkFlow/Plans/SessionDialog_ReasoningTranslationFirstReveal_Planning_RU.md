# Translation-first reveal для reasoning в Session Dialog

Дата: 2026-06-25.

Статус: accepted implementation planning source. Пользователь подтвердил подход: reasoning переводится смысловыми блоками, но отображается постепенно, как живой ответ агента.

## Цель

Изменить UX видимых `Thinking` / `Reasoning` сообщений в панели диалога сессии:

- не показывать английский source как временный текст, когда Core уже знает, что reasoning будет переводиться;
- сохранять английский source в истории и provider transcript как исходную правду;
- после готовности перевода показывать русский текст постепенно, word-by-word, без резкой замены уже прочитанного текста;
- использовать английский source только как аварийный fallback, если перевод не пришел за короткий timeout.

## Текущее поведение

Сейчас Core сначала broadcast-ит source reasoning message, затем асинхронно пишет translation overlay и отправляет `localizedContent`. Shared Session UI отображает `localizedContent ?? content`, поэтому пользователь сначала видит английский текст, а потом он заменяется русским.

Это неудобно:

- пользователь без английского все равно не может читать source;
- пользователь с английским начинает читать текст, который вскоре меняется;
- новая Gemini reasoning translation модель переводит достаточно быстро, поэтому source-first display больше не дает полезного UX выигрыша.

## Целевое поведение

1. Provider/Core продолжают сохранять source reasoning как обычное сообщение.
2. Core помечает visible reasoning message как `translationState: "pending"` только если translation policy действительно будет переводить этот message.
3. Session UI для такого message не отображает `content` до готовности перевода.
4. Пока перевода нет, UI показывает компактное pending-состояние.
5. Когда приходит `localizedContent`, UI раскрывает перевод постепенно по словам/коротким токенам.
6. Если перевод не пришел за короткий timeout, UI показывает source как fallback; поздний translation patch все равно может перейти на переведенный текст.

## Не цели

- Не переводить reasoning word-by-word. Перевод должен оставаться paragraph/chunk based, чтобы не терять смысл.
- Не менять provider-native transcript.
- Не писать искусственные word chunks в Core history.
- Не добавлять новую пользовательскую настройку: текущие `Reasoning` language + `Reasoning Translation Engine` уже задают политику.

## Implementation Notes

- `translationState` является UI projection hint, не заменяет source truth.
- Core должен выставлять pending только на основе той же policy/dispatcher логики, которая запускает translation overlay.
- UI reveal должен быть локальным эффектом отображения, а не новым stream event protocol.
- Replay старой истории с уже готовым `localizedContent` не должен заново проигрывать анимацию; анимация нужна для live transition from pending to translated.

## Acceptance

- При включенном reasoning translation на русский английский reasoning не появляется как временный visible text.
- Готовый перевод раскрывается постепенно и читается как живой поток.
- При отключенном reasoning translation или target English source отображается как раньше.
- При переводческой ошибке/зависании source появляется как fallback.
