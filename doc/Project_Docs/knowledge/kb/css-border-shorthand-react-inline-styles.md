# CSS Border Shorthand в React Inline Styles — Известная Проблема

**Дата:** 2025-12-23  
**Версия фикса:** v1.1.337  
**Затронутый компонент:** `CodexDefaultModelCard`

---

## Проблема

При использовании CSS shorthand `border` в React inline styles:
```tsx
const styles = {
  border: "1px solid #2f2f2f"
};
```

Браузер/VS Code webview может **не применить `border-color`** корректно. В DevTools видно:
- `border-width: 1px` ✓
- `border-style: solid` ✓
- `border-color`: **отсутствует или перезаписан**

В результате обводка элемента становится белой (дефолтный цвет браузера) вместо ожидаемого тёмно-серого.

---

## Дополнительный фактор: VS Code Webview Focus Styling

VS Code webview инжектит свои focus-стили на элементы с `tabIndex={0}`. Даже при:
- `outline: none`
- `box-shadow: none`

...webview может добавить свою обводку через другие механизмы.

---

## Решение

### 1. Использовать явные свойства вместо shorthand

```tsx
// ❌ Не работает надёжно в VS Code webview
const badStyles = {
  border: "1px solid #2f2f2f"
};

// ✅ Работает корректно
const goodStyles = {
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2f2f2f"
};
```

### 2. Предотвратить фокус на кликабельных div

```tsx
// ❌ Получает фокус при клике → VS Code применяет focus стили
<div tabIndex={0} onClick={...}>

// ✅ Не получает фокус при клике мыши
<div tabIndex={-1} onClick={...}>
```

---

## Диагностика

Если видишь белую/неожиданную обводку:

1. Открой DevTools: `Cmd+Shift+P` → "Developer: Open Webview Developer Tools"
2. Инспектируй элемент с обводкой
3. Проверь вкладку **Computed** → `border-color`
4. Если `border-color` не соответствует ожиданию — замени shorthand на явные свойства

---

## Коммиты с фиксом

- `75f8439` — explicit borderColor, tabIndex=-1
- `756317f` — bump to v1.1.337
