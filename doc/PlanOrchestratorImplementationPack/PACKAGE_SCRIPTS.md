# Package Scripts

Эти `package.json` scripts нужны для воспроизведения Plan Orchestrator.
Команды качества (`lint`, `check:knip`, `format:fix`, `check:dup`, `check:links`) здесь приведены в том виде, в котором они используются текущими hooks.

```json
{
  "scripts": {
    "lint": "npx ultracite check",
    "check:knip": "knip",
    "check:dup": "npm run -s check:dup:repo",
    "check:links": "node ./scripts/check-markdown-links.js",
    "format:fix": "npx ultracite fix",
    "plan:complete": "node ./scripts/plan-orchestrator/plan-cli.mjs complete",
    "plan:commit": "node ./scripts/plan-orchestrator/plan-cli.mjs commit",
    "plan:closeout": "node ./scripts/plan-orchestrator/plan-closeout.mjs",
    "plan:repair": "node ./scripts/plan-orchestrator/plan-cli.mjs repair",
    "plan:snapshot": "node ./scripts/plan-orchestrator/plan-snapshot.mjs",
    "plan:status": "node ./scripts/plan-orchestrator/plan-cli.mjs status",
    "plan:validate": "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
  }
}
```

## Операторские Команды

```bash
npm run plan:status
npm run plan:validate
npm run plan:complete -- "<short result>"
npm run plan:commit -- "<expected commit message>"
npm run plan:repair
npm run plan:snapshot -- "<snapshot note>"
npm run plan:closeout -- "<acceptance evidence>"
```

## Тесты

```bash
node --test scripts/plan-orchestrator/*.test.mjs
node --test scripts/plan-orchestrator/plan-markdown-updater.test.mjs
node --test scripts/plan-orchestrator/plan-closeout.test.mjs
```

## Качество И Hooks

`pre-commit` запускает:

```bash
node ./scripts/plan-orchestrator/plan-hook-pre-commit.mjs
./scripts/check-architecture.sh
npm run lint
npm run check:knip
npx ultracite fix <staged files only>
```

`commit-msg` запускает:

```bash
./scripts/check-commit-message.sh "$1"
node ./scripts/plan-orchestrator/plan-hook-commit-msg.mjs "$1"
```

`post-commit` запускает:

```bash
node ./scripts/plan-orchestrator/plan-hook-post-commit.mjs
```

`pre-push` запускает:

```bash
node ./scripts/plan-orchestrator/plan-hook-pre-push.mjs
npm run -s check:dup
npm run -s check:links
```

`post-checkout` запускает:

```bash
node ./scripts/plan-orchestrator/plan-hook-branch-advisory.mjs || true
```

