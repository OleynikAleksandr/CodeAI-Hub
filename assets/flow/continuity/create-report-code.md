# Flow Node Continuity — Create Report (Code Node)

Create a short continuity report for node `{{nodeId}}` (`{{role}}`) and save it to:
- `{{reportPath}}`

Hard rules:
- Do NOT include chat history.
- Do NOT paste code/diffs/logs.
- Use only short bullets, file paths, and command names.
- Atomic write: write to a temporary file first, then rename to the final path.
- Create EXACTLY ONE report per Create Report instruction.
- Do NOT create or update any other continuity reports unless Core sends another explicit Create Report instruction with explicit temp/final paths.

Required structure:

# Continuity Report — {{nodeId}} / {{role}}

## Current Task
- What: <short>
- Scope: <files/packages>
- Acceptance: <criteria>

## Required Reads (ordered)
1. <path>: <why>

## Repo Context
- Branch: <name>
- Last relevant commits:
  - <hash>: <message>

## Gates / Builds (last known)
- `./scripts/check-architecture.sh`: <OK/FAIL/NOT RUN>
- `npx ultracite check`: <OK/FAIL/NOT RUN>
- `npx ts-prune`: <OK/FAIL/NOT RUN>
- `npx jscpd ...`: <OK/FAIL/NOT RUN>
- `npm run check:links`: <OK/FAIL/NOT RUN>
- Target build: <command>: <OK/FAIL/NOT RUN>

## Next Step
- <single next action>
