---
trigger: always_on
---

# Ultracite Quality Guide

Ultracite (Biome) enforces linting, formatting, a11y, and architectural limits across the entire repo. Всегда запускай проверки локально — pre-commit hook не пропустит изменения со 100+ файлов назад.

## Code Style & Linting Rules
1. **Организация импортов**: Biome выполняет `source.organizeImports` как assist и не поддерживает `biome-ignore`. Следи за порядком (внешние пакеты → workspace alias → относительные импорты) и пустыми строками между группами.
2. **Magic numbers**: правило `noMagicNumbers` требует именованных констант. Все таймеры, размеры и пороги (например, `1500`, `2500`, `512 * 1024 * 1024`) выноси в `const` и используй числовые разделители (`1_048_576`).
3. **Когнитивная сложность**: методы, подобные `CorePortManager.resolve`, должны разбиваться на вспомогательные функции (лимит 15). Проверки архитектуры не пропустят «большие» функции.
4. **Hooks / эффекты**: правило `useConsistentArrowReturn` требует компактных стрелочных функций — `useEffect(() => () => {...}, [])`. Избегай вложенных тернарников (`noNestedTernary`).
5. **A11y статусы**: для сообщений статуса применяй семантические элементы (`<output>`, `role="status"` на соответствующем элементе). `accessKey`, позитивный `tabIndex`, `aria-hidden` на фокусируемых элементах запрещены.

## Полезные ссылки
- Ultracite Docs: https://www.ultracite.ai/introduction/
- Ultracite GitHub: https://github.com/haydenbleasel/ultracite
- Biome Suppressions: https://biomejs.dev/linter/suppressions/
