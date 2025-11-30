# Quality Gate Manager — Консолидированная диаграмма (RU)

Ниже представлена объединённая диаграмма архитектуры непрерывного контроля качества кода в CodeAI Hub. Она собирает ключевые идеи из диаграмм Claude / Codex / Kimi в один целостный вид.

```mermaid
flowchart TD
  %% --- СЛОЙ РАЗРАБОТКИ ---
  subgraph Dev["Слой разработки"]
    user["Пользователь"]
    ide["VS Code / Project Manager"]
    writers["Агенты-авторы Claude / Codex / Gemini"]
  end

  %% --- ПЛАТФОРМА И РЕПОЗИТОРИЙ ---
  subgraph Core["CodeAI Hub Core"]
    core["Orchestrator ядра"]
  end

  subgraph Repo["Репозиторий и файлы"]
    fs["Исходный код и документация"]
  end

  %% --- QUALITY GATE MANAGER ---
  subgraph QGM["Quality Gate Manager"]
    bus["Шина событий качества"]
    trig["Движок триггеров"]
    runners["Инструменты проверки\nUltracite / архитектура / ts-prune / jscpd"]
    qagent["Quality AI агент"]
    qstate["Хранилище состояния качества"]
  end

  %% --- GIT И CI ---
  subgraph GitCI["Git и CI"]
    git["Git hooks pre-commit / pre-push"]
    ci["CI / CD"]
  end

  %% --- ИНТЕГРАЦИИ С UI И АГЕНТАМИ ---
  subgraph UI["Интерфейсы"]
    diag["Диагностика в редакторе"]
    dash["Quality Dashboard"]
  end

  %% Связи: разработка и ядро
  user -->|"Задачи и команды"| ide
  ide -->|"Запросы к агентам"| writers
  ide -->|"Команды и настройки"| core
  writers -->|"Патчи и изменения"| core

  %% Связи: ядро и файловая система
  core -->|"Чтение / запись файлов"| fs

  %% Связи: события в Quality Gate Manager
  fs -->|"Сохранение и изменения файлов"| bus
  git -->|"События Git"| bus
  ci -->|"События CI / CD"| bus

  bus --> trig
  trig -->|"Планы проверок"| runners

  %% Связи: инструменты, агент и состояние
  runners -->|"Найденные проблемы"| qstate
  runners -->|"Отчёты о проблемах"| qagent

  qagent -->|"Безопасные авто-фиксы"| fs
  qagent -->|"Задачи на исправление"| qstate

  %% Связи: состояние качества обратно в систему
  qstate -->|"Диагностика и метрики"| diag
  qstate -->|"Сводные показатели"| dash
  qstate -->|"Контекст качества"| writers
  qstate -->|"Статус гейтов"| git
  qstate -->|"Отчёты для пайплайнов"| ci

  %% Связи: отображение интерфейсов
  diag -->|"Подсветка проблем"| ide
  dash -->|"Обзор качества"| ide

  %% Классы для читаемых цветов
  classDef dev fill:#e3f2fd,stroke:#1565c0,stroke-width:1px,color:#111111;
  classDef core fill:#ede7f6,stroke:#5e35b1,stroke-width:1px,color:#111111;
  classDef repo fill:#fff3e0,stroke:#ef6c00,stroke-width:1px,color:#111111;
  classDef quality fill:#c8e6c9,stroke:#2e7d32,stroke-width:1px,color:#111111;
  classDef infra fill:#ffe082,stroke:#f9a825,stroke-width:1px,color:#111111;
  classDef ui fill:#f8bbd0,stroke:#c2185b,stroke-width:1px,color:#111111;
  classDef store fill:#b2ebf2,stroke:#00838f,stroke-width:1px,color:#111111;

  class user,ide,writers dev
  class core Core
  class fs repo
  class bus,trig,runners,qagent,qstate quality
  class git,ci infra
  class diag,dash ui
```

