# Переписывание CodexDefaultModelCard

## Проблема

После выбора модели в Settings → Codex → Codex Default model, на **ранее выбранной** карточке появляется белая обводка. Три попытки исправления через CSS не дали результата:

1. `blur()` на onChange радио-кнопки
2. CSS `focusResetStyles` с `outline: none !important`  
3. `data-selected` атрибут + CSS для `:focus-within`

**Ключевое наблюдение**: белая обводка исчезает при закрытии/открытии Settings — значит это **браузерный focus-ring** застревающий на нативном `<input type="radio">`.

## Решение

Полностью переписать компонент **без использования `<input type="radio">`**:
- Кликабельные `<div>` карточки  
- Состояние "selected" через React state + визуальные стили
- Кастомный визуальный индикатор вместо нативного radio

---

## Предлагаемые изменения

### [MODIFY] [codex-default-model-card.tsx](file:///Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/components/settings/codex-default-model/codex-default-model-card.tsx)

#### Что удалить:
- `<input type="radio">` элементы
- `<label htmlFor>` обёртки  
- `focusResetStyles` и `<style>` блок
- `blurActiveElement` функция
- Все `outline: none`, `boxShadow: none` хаки

#### Что добавить:
- Кастомный `RadioCircle` компонент (SVG или CSS circle)
- `onClick` на div-карточку вместо onChange на input
- `role="radio"` и `aria-checked` для accessibility
- `tabIndex={0}` + `onKeyDown` для keyboard navigation

#### Новая структура:
```tsx
<div
  role="radio"
  aria-checked={isSelected}
  tabIndex={0}
  onClick={() => onDefaultModelChange(model.id)}
  onKeyDown={(e) => e.key === 'Enter' && onDefaultModelChange(model.id)}
  style={{...modelRowStyles, ...(isSelected ? modelRowSelectedStyles : {})}}
>
  <RadioCircle checked={isSelected} />
  <div style={modelBodyStyles}>
    {/* model info */}
  </div>
</div>
```

---

## Verification Plan

### Ручное тестирование
1. Открыть Settings → Codex → Codex Default model
2. Выбрать модель A
3. Выбрать модель B  
4. Убедиться что на A **нет белой обводки**
5. Закрыть/открыть Settings — убедиться что состояние корректное

### Автоматическая верификация
```bash
./scripts/check-architecture.sh
npx ultracite check
npm run build:webview
```
