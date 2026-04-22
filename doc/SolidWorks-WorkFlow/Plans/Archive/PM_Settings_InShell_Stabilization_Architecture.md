# PM Settings In-Shell Stabilization Architecture

**Status:** Draft (2026-04-22)
**Created:** 2026-04-22
**Updated:** 2026-04-22
**Owner:** Oleksandr + Codex
**Scope:** Стабилизировать PM-owned Settings после релиза `1.2.53`: убрать detached popup, перевести Settings в правую панель Project Manager, вернуть `Restart Core` и выровнять save UX с фактическим localization sync contract.

**Связанные документы:**
- `doc/BugRegistry.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

---

## 1. Problem

Релиз `1.2.53` правильно перенёс ownership `Settings` в связку `Core + Project Manager`, но выбрал неверную UI-границу: detached popup window.

Это уже дало три подтверждённых regression-класса:

1. Закрытие окна Settings закрывает и PM.
2. В General tab исчез `Restart Core`.
3. Provider-only save показывает blocking overlay `Synchronizing localization`, хотя реальный strict sync не запускается.

Следовательно, речь идёт не о наборе изолированных cosmetic багов, а о неверной stabilization boundary:
- popup-lifecycle не подходит для PM-owned settings;
- recovery contract оказался частично потерян;
- shared save UI перепутал обычный save и strict localization sync.

---

## 2. Accepted Product Decision

Принятое решение:

- `Settings` остаются единственным живым PM-owned product surface;
- но больше не открываются отдельным окном;
- `Settings` занимают правую панель Project Manager, то есть тот surface, где обычно живут artifacts/help/source;
- пока `Settings` открыты, обычный right-panel content считается временно заменённым settings surface;
- закрытие `Settings` возвращает пользователя в предыдущий right-panel context.

Это согласуется с пользовательской моделью:
- один PM window;
- один runtime/UI контур;
- один lifecycle ownership без межоконной синхронизации.

---

## 3. Target Behavior

После стабилизации:

1. Кнопка `Open Settings` в footer PM открывает Settings внутри текущего PM окна.
2. Правая панель переключается в отдельный settings mode без popup и без второго browser window.
3. `Close Settings` возвращает предыдущий right-panel режим.
4. `General` снова показывает `Core Controls`, включая `Restart Core`.
5. `Restart Core` работает и в VS Code-host, и в standalone launcher-host.
6. Overlay `Synchronizing localization` показывается только при реальном strict localization sync.
7. Provider-only save остаётся обычным save path и не блокирует PM ложным localization message.

---

## 4. Architecture Decision

### 4.1. Settings становятся PM in-shell right-panel state

Ownership правой панели PM переносится с модели:
- `artifacts | help | source`

на модель:
- `artifacts/help/source` как обычные режимы;
- отдельный `settings takeover` поверх того же right-panel host.

Это должен владеть `MainArea`, а не отдельный popup helper.

### 4.2. Detached settings window удаляется

Удаляются:
- detached settings route `?mode=detached-settings`;
- popup opener hook;
- межоконный lifecycle для Settings.

Диаграммы как отдельный detached surface не затрагиваются этим scope.

### 4.3. Restart Core возвращается как часть shared General contract

`Restart Core` не должен жить в PM-specific форке General tab.

Правильная модель:
- PM переиспользует shared `GeneralSettings` path;
- restart intent идёт через host bridge;
- standalone launcher получает явный restart contract, а не fallback `ensure-started`;
- PM surface показывает status restart lifecycle.

### 4.4. Save overlay должен читать фактический localization sync state

Shared `SettingsView` обязан различать:
- обычный `saving settings`;
- реальный `strict localization sync`.

Blocking localization overlay разрешён только для второго случая.

---

## 5. Non-Goals

- Не переносить Settings в workflow tree как stage.
- Не делать отдельный redesign visual language для Settings.
- Не менять Core-owned selective localization classifier, если проблема ограничивается UI-state contract.
- Не трогать detached diagram window: он относится к другому surface и не входит в этот stabilization scope.

---

## 6. Implementation Streams

### Stream A — In-shell Settings takeover
- открыть Settings внутри `MainArea` правой панели;
- сохранить и восстанавливать предыдущий right-panel context;
- удалить detached popup path.

### Stream B — Restart Core contract restoration
- вернуть shared `Core Controls` в PM General tab;
- провести restart request через PM host bridge;
- добавить standalone launcher restart primitive и feedback-path.

### Stream C — Save/localization UX correction
- прокинуть actual localization sync status в shared settings state;
- ограничить blocking overlay только strict sync cases.

### Stream D — SSOT + release
- синхронизировать SSOT после реализации;
- собрать следующий patch release.
