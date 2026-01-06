# Agent Packages Architecture

**Version:** 1.0.0
**Date:** 2026-01-06
**Status:** Draft — Pending Approval

---

## 1. Problem Statement

### Current State: Distributed Agent Components

Idea Collector functionality is spread across **7 different locations**:

```
assets/templates/full-development-flow/idea/     # 4 files
packages/core/src/remote-bridge/handlers/        # 4 files
packages/Claude_Module/src/messaging/            # 1 file
src/client/ui/src/services/                      # 7 files
src/client/ui/src/components/idea-questionnaire/ # 3 files
src/client/ui/src/app-host/                      # 1 file
src/extension-module/templates/                  # 1 file
```

**Total: ~21 files across 7 directories**

### Architectural Violations

| Principle | Violation |
|-----------|-----------|
| **Facade Pattern** | No single entry point — code scattered everywhere |
| **Closed Modules** | Changes require touching Core, UI, Extension, Claude Module |
| **Single Responsibility** | Boundaries unclear between Idea Collector and other components |

### Scaling Problem

For each new agent (Spec Creator, Plan Builder, Code Generator, Reviewer):
- **+15-20 files** in 7 different locations
- No clear boundary "where Idea ends and Spec begins"
- Hard to understand dependencies
- Risk of accidental cross-agent coupling

---

## 2. Target Architecture: Agent Packages

### Package Structure

```
packages/
├── agents/
│   ├── idea-collector/
│   │   ├── src/
│   │   │   ├── index.ts              # Public exports
│   │   │   ├── facade.ts             # SINGLE entry point
│   │   │   ├── contract/
│   │   │   │   ├── contract-builder.ts
│   │   │   │   ├── contract-types.ts
│   │   │   │   └── index.ts
│   │   │   ├── parser/
│   │   │   │   ├── structured-output-parser.ts
│   │   │   │   ├── parser-types.ts
│   │   │   │   └── index.ts
│   │   │   ├── schema/
│   │   │   │   ├── schema-normalizer.ts
│   │   │   │   └── index.ts
│   │   │   └── paths/
│   │   │       ├── artifact-paths.ts
│   │   │       └── index.ts
│   │   ├── assets/
│   │   │   ├── idea-collector-schema.json
│   │   │   ├── idea-collector-prompt.md
│   │   │   ├── idea-template.md
│   │   │   └── questionnaire-template.md
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── spec-creator/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── facade.ts
│   │   │   ├── contract/
│   │   │   ├── parser/
│   │   │   ├── schema/
│   │   │   └── paths/
│   │   ├── assets/
│   │   │   ├── spec-creator-schema.json
│   │   │   ├── spec-creator-prompt.md
│   │   │   └── spec-template.md
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/
│       ├── src/
│       │   ├── index.ts
│       │   ├── schema-utils/
│       │   │   ├── schema-normalizer.ts
│       │   │   ├── schema-strictifier.ts
│       │   │   └── index.ts
│       │   ├── contract-utils/
│       │   │   ├── file-reader.ts
│       │   │   ├── version-hasher.ts
│       │   │   └── index.ts
│       │   └── types/
│       │       ├── agent-contract.ts
│       │       ├── structured-output.ts
│       │       └── index.ts
│       ├── package.json
│       └── tsconfig.json
```

### Facade Pattern

Each agent exposes a **single facade** as the only public API:

```typescript
// packages/agents/idea-collector/src/facade.ts

export class IdeaCollectorFacade {
  /**
   * Build the complete contract for Idea Collector agent.
   * Returns prompt, schema, template, questionnaire, output paths, version.
   */
  static async buildContract(): Promise<IdeaContractPayload | null>;

  /**
   * Parse structured output from LLM response.
   */
  static parseStructuredOutput(text: string): IdeaStructuredOutput | null;

  /**
   * Get artifact output paths for a given initiative.
   */
  static getArtifactPaths(initiativeSlug: string): IdeaArtifactPaths;
}
```

### Package Dependencies

```
@codeai-hub/agent-shared
    ↑
    ├── @codeai-hub/idea-collector
    ├── @codeai-hub/spec-creator
    ├── @codeai-hub/plan-builder (future)
    └── @codeai-hub/code-generator (future)
```

### Integration Points

After refactoring, external systems interact ONLY through facades:

| Layer | Before | After |
|-------|--------|-------|
| **Core** | `idea-contract-service.ts` (329 lines) | `IdeaCollectorFacade.buildContract()` |
| **Claude Module** | `idea-collector-structured-output.ts` | `IdeaCollectorFacade.parseStructuredOutput()` |
| **UI** | 7 service files | Import types + call Core API |
| **Extension** | `idea-collector-prompt-installer.ts` | Use bundled assets from package |

---

## 3. Migration Strategy

### Phase 1: Create Agent Packages Infrastructure
1. Create `packages/agents/shared/` with common utilities
2. Create `packages/agents/idea-collector/` structure
3. Move assets to package
4. Implement facade

### Phase 2: Migrate Idea Collector Logic
1. Move contract building logic from Core
2. Move structured output parser from Claude Module
3. Move schema utilities from UI
4. Update Core to use facade
5. Update Claude Module to use facade

### Phase 3: Cleanup Legacy Files
1. Remove migrated files from old locations
2. Update imports across codebase
3. Verify all tests pass

### Phase 4: Create Spec Creator Skeleton
1. Create `packages/agents/spec-creator/` with same structure
2. Add placeholder assets
3. Implement facade skeleton

---

## 4. Benefits

| Aspect | Benefit |
|--------|---------|
| **Isolation** | Each agent is a self-contained package |
| **Testability** | Unit test packages independently |
| **Discoverability** | All agent code in one place |
| **Scalability** | New agent = new package, no cross-cutting changes |
| **Maintenance** | Clear ownership and boundaries |
| **Compliance** | Follows project's architectural principles |

---

## 5. What Remains in Other Layers

### UI Layer (`src/client/ui/`)
- React components (webview-specific)
- UI services that call Core API
- State management hooks

### Core Layer (`packages/core/`)
- HTTP API router (registers endpoints)
- Calls agent facades
- Session/request handling

### Extension Layer (`src/extension-module/`)
- Template installers (VSIX fallback only)
- VS Code integration

### Provider Modules (`packages/Claude_Module/`, etc.)
- SDK integration
- Message processing
- Calls agent parsers via Core

---

## 6. Open Questions

1. **Asset bundling**: Should assets be embedded in JS or loaded from filesystem?
   - Recommendation: Load from `~/.codeai-hub/templates/` with fallback to bundled

2. **UI components**: Should questionnaire components move to agent package?
   - Recommendation: Keep in UI, they are webview-specific

3. **Versioning**: Independent versions per agent or unified?
   - Recommendation: Unified version, aligned with main release

---

## 7. Approval

- [x] Architecture reviewed
- [x] Migration plan approved
- [x] Ready for implementation

**Approved by:** Oleksandr
**Date:** 2026-01-06
