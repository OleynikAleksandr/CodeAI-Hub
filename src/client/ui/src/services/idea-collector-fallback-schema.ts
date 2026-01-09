const FALLBACK_SCHEMA_JSON = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codeai-hub.local/schemas/idea-collector-schema.json",
  "title": "Idea Collector — Structured Output Contract (Slim)",
  "description": "Контракт Structured Output для Idea Collector. Агент анализирует заполненную анкету, оценивает готовность к финализации и задаёт 1–3 умных уточняющих вопроса. На финале (next_action=finalize) обязан вернуть готовые Idea.md и virtual-simulation.md как markdown + целевые пути сохранения.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "next_action",
    "suggested_response",
    "reasoning_summary_ru",
    "assessment",
    "questions",
    "artifact"
  ],
  "properties": {
    "next_action": {
      "type": "string",
      "description": "Что делать дальше: ask_question | clarify | summarize | finalize."
    },
    "suggested_response": {
      "type": "string",
      "description": "Текст следующего сообщения агента (вопрос/уточнение/сводка/финализация), который показываем пользователю."
    },
    "reasoning_summary_ru": {
      "type": "string",
      "description": "Краткое резюме прогресса/решений на русском без chain-of-thought."
    },
    "assessment": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ready_for_finalize",
        "confidence_percent",
        "missing_info",
        "assumptions",
        "risks"
      ],
      "description": "Оценка достаточности данных анкеты для подготовки Idea.md и virtual-simulation.md.",
      "properties": {
        "ready_for_finalize": {
          "type": "boolean",
          "description": "Готов ли агент финализировать документы прямо сейчас."
        },
        "confidence_percent": {
          "type": "integer",
          "description": "Уверенность в полноте данных (0–100). Ожидаемый порог для финализации: >= 80."
        },
        "missing_info": {
          "type": "array",
          "description": "Список пробелов/данных, которых не хватает для уверенной финализации.",
          "items": {
            "type": "string"
          }
        },
        "assumptions": {
          "type": "array",
          "description": "Список допущений, на которых агент готов строить финальные документы.",
          "items": {
            "type": "string"
          }
        },
        "risks": {
          "type": "array",
          "description": "Список рисков/сомнений при финализации.",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "questions": {
      "type": "array",
      "description": "1–3 точечных вопроса, чтобы закрыть пробелы. До финализации вопросы обязательны; на finalize — пустой список.",
      "items": {
        "type": "string"
      }
    },
    "artifact": {
      "type": "object",
      "additionalProperties": false,
      "description": "Финальные артефакты. Обязательны при next_action=finalize.",
      "required": [
        "idea_markdown",
        "virtual_simulation_markdown",
        "idea_path",
        "virtual_simulation_path"
      ],
      "properties": {
        "idea_markdown": {
          "type": "string",
          "description": "Готовый Idea.md как markdown (включая заголовок и все секции по шаблону)."
        },
        "virtual_simulation_markdown": {
          "type": "string",
          "description": "Виртуальный тест (virtual-simulation.md) как markdown с обязательными секциями: # Virtual Simulation, Цель симуляции, Сценарии, UI ↔ Core события, Логи и телеметрия, Мини-матрица рисков, Must-pass проверки (E2E), Выводы."
        },
        "idea_path": {
          "type": "string",
          "description": "Куда сохранить Idea.md в проекте (канон: .codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/idea.md)."
        },
        "virtual_simulation_path": {
          "type": "string",
          "description": "Куда сохранить virtual-simulation.md в проекте (канон: .codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/virtual-simulation.md)."
        }
      }
    }
  }
}`;

export const IDEA_COLLECTOR_FALLBACK_SCHEMA = JSON.parse(
  FALLBACK_SCHEMA_JSON
) as Record<string, unknown>;
