# Backlog Planning Documents

**Status:** navigation and freshness map  
**Updated:** 2026-06-24

Backlog содержит planning/research документы, которые ещё не стали SSOT и не закрыты как `Plans/Archive`. Перед запуском execution scope документ из Backlog нужно перечитать, сверить с текущими `System/`, `Modules/`, `Contracts/` и при необходимости обновить.

Raw benchmark scripts, logs and one-off reports остаются в `doc/tmp/prototypes/`. В Backlog хранятся только durable summaries и planning-документы.

## Freshness Map

| Документ | Текущий статус | Что делать перед execution |
| --- | --- | --- |
| `Intent_Normalizer_Module_Planning_RU.md` | Active backlog candidate. | Использовать как planning source для будущего pre-turn intent normalizer; сначала согласовать MVP packet + routing whitelist. |
| `Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md` | Active backlog candidate. | Перепроверить controlled A/B: exact prompt path, sha256, size, tool hash, client path, reasoning/temperature. Текущие результаты считать exploratory. |
| `Coding_Model_Benchmark_RU.md` | Exploratory benchmark summary. | Не выбирать production model только по этому документу; повторить shortlist с frozen instruction/tool stack. |
| `Documentation_Planning_Model_Benchmark_RU.md` | Exploratory benchmark summary. | Повторить shortlist с frozen instruction/tool stack и отдельными stop/read-only cases. |
| `Claude_Agent_SDK_Capabilities_Analysis.md` | Research catalogue, partially aged. | Refresh по текущему Agent SDK перед новым scope; текущий runtime SSOT искать в `Modules/Claude.md`. |
| `Codex_AppServer_Capabilities_Analysis.md` | Research catalogue, partially aged. | Refresh по текущему `codex app-server generate-ts` перед новым scope; runtime SSOT искать в `Modules/Codex*.md`. |
| `CrossProvider_Common_Capabilities.md` | Decision backlog, still useful. | Обновить с учетом Kimi, GLM, OpenRouter, Local Models и будущего normalizer routing. |
| `Provider_Native_Request_Capture_Workbench_Architecture.md` | Deferred parent plan. | Refresh provider set and Gemini-removal assumptions before implementation. |
| `Capture_Workbench_UI_Architecture.md` | Deferred child UI plan. | Refresh against current PM UI/runtime before implementation. |
| `DevelopmentTree_Sidebar_Visualization_Architecture.md` | Accepted/implemented planning residue. | Candidate for archive or SSOT fold-in cleanup; not an active backlog item as written. |
| `Implementation_Continuity_Deterministic_Snapshot_Architecture.md` | Deferred planning candidate. | Still relevant; refresh against current Plan Orchestrator and continuity runtime before implementation. |
| `Kimi_Audit_Followup_Planning.md` | Backlog intake from older audit. | Refresh findings before execution; some code paths changed since the audit. |
| `KIMI/` | Baseline snapshot bundle for Kimi CLI `1.44.0`. | Keep as reference; recapture after Kimi CLI updates. |

## Experiment Hygiene Rule

Future model/profile benchmarks must record at least:

- provider/client path;
- exact model id;
- exact system prompt path, size and sha256;
- exact tool set hash;
- thinking/reasoning/temperature;
- test case set and scoring script path;
- run date and retry policy.
