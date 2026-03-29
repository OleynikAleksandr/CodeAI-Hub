# Provider Feedback Rollback Architecture

## Problem
Релиз `1.1.836` добавил provider-feedback logging scope для Claude, Codex и Gemini, но эксплуатационный результат оказался слабее ожидаемого.

- `Codex` действительно возвращает exact `reasoning_effort` в raw provider rollout, но normalized `sdk-codex-*.jsonl` seam в реальном прогоне не дала ожидаемой записи.
- `Gemini` и, по тем же причинам, `Claude` не возвращают exact applied level (`low/high/xhigh`) как удобный provider-confirmed field. Там видны только косвенные signals вроде `thought`, `thinking block`, `thoughtsTokenCount`.
- Пользовательский критерий успеха был жёстким: в SDK logs нужен именно applied reasoning/thinking level, а не просто факт того, что provider думал.

Итог: текущий scope добавил код и документацию, но не дал стабильной и симметричной observability value.

## Decision
Откатить provider-feedback logging scope как feature baseline.

Что именно откатываем:
- provider-feedback logging code и связанные тесты в `packages/Codex_Module`, `packages/Claude_Module`, `packages/Gemini_Module`;
- active SSOT-документацию, которая описывает этот scope как действующий runtime contract.

Что не откатываем:
- исторические артефакты релиза `1.1.836`:
  - запись в `CHANGELOG.md`;
  - `doc/Sessions/Session191.md`;
  - архивные planning/todo документы по уже выполненному scope.

Причина: это уже состоявшийся факт истории проекта, а не текущий active baseline.

## Resulting baseline
После rollback:
- `Codex`, `Claude`, `Gemini` возвращаются к baseline без provider-feedback logging scope;
- SDK logs снова не содержат новой нормализации provider feedback;
- historical release docs сохраняют информацию о том, что релиз `1.1.836` существовал и содержал этот экспериментальный scope;
- новый релиз фиксирует отказ от scope как осознанное продуктовое решение.

## Release intent
Новый релиз должен:
- убрать лишний runtime-specific logging code;
- убрать active SSOT-обязательства, которые scope больше не поддерживает;
- оставить историю релиза `1.1.836` нетронутой;
- стать новым baseline для дальнейшей работы.
