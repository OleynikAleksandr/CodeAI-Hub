# Provider Module Contract — Draft (Phase 0)

> Status: Draft v0.1 (Phase 0 — F0-2)

## Goals
- Allow CodeAI-Hub core to load pluggable provider modules (Claude, Codex, etc.) with a uniform API.
- Provide enough structure for orchestration while leaving room for iteration (versioned contract, capability flags).
- Mirror proven flow from `claude-code-fusion` (SDKManager, MessageCoordinator, Feedback Parser) without hard-wiring Claude specifics.

## Key Interfaces

```ts
export interface ProviderModuleDescriptor {
  id: string;                 // "claude", "codex"...
  displayName: string;        // Human readable name
  contractVersion: string;    // Semantic version of this contract revision
  capabilities: ProviderCapabilities;
  dependencies: ProviderDependencies;
  status: ProviderRuntimeStatus; // installation/auth state, telemetry flags
}

export interface ProviderModule {
  descriptor: ProviderModuleDescriptor;
  installOrUpdate(): Promise<InstallResult>;
  checkAuth(): Promise<AuthStatus>;
  createSession(options: SessionCreateOptions): Promise<SessionHandle>;
  resumeSession(request: SessionResumeRequest): Promise<SessionHandle>;
  sendMessage(request: SessionMessageRequest): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  killSession(sessionId: string): Promise<void>;
  dispose?(): Promise<void>;
}
```

### Capabilities & Dependencies

```ts
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsResume: boolean;
  supportsTools: boolean;
  supportsFileDrop: boolean;
  supportsDrafts: boolean;
  custom?: Record<string, boolean | string | number>;
}

export interface ProviderDependencies {
  cli: Array<{ name: string; versionRange: string }>;
  sdk: Array<{ name: string; versionRange: string }>;
  env?: Array<{ key: string; description: string }>;
  notes?: string;
}
```

### Session Lifecycle Structures

```ts
export interface SessionCreateOptions {
  workspaceUri: string;
  projectName?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionResumeRequest {
  previousSessionId: string;
  workspaceUri: string;
}

export interface SessionHandle {
  tempId: string;                    // temp_<uuid>
  emitter: ProviderSessionEmitter;   // publishes ProviderSessionEvent
  dispose(): Promise<void>;
}

export type ProviderSessionEmitter = {
  on(event: 'event', listener: (payload: ProviderSessionEvent) => void): void;
  on(event: 'error', listener: (payload: ProviderError) => void): void;
  on(event: 'sessionIdChanged', listener: SessionIdChangeEvent): void;
  off(...): void;
};
```

### Event Model

```ts
export type ProviderSessionEvent =
  | StreamEvent
  | AssistantMessageEvent
  | SystemMessageEvent
  | ResultEvent
  | UserEchoEvent;

interface BaseEvent {
  sessionId: string;
  timestamp: string;
  providerId: string;
}

interface StreamEvent extends BaseEvent {
  kind: 'stream_event';
  streamType: 'message_start' | 'content_block_delta' | 'message_stop' | string;
  payload: Record<string, unknown>;
}

interface AssistantMessageEvent extends BaseEvent {
  kind: 'assistant';
  content: ProviderContentBlock[];
  metadata?: Record<string, unknown>;
}

interface SystemMessageEvent extends BaseEvent {
  kind: 'system';
  message: string;
  subtype?: 'init' | 'warning' | 'info' | string;
}

interface ResultEvent extends BaseEvent {
  kind: 'result';
  usage?: ProviderUsage;
  durationMs?: number;
  costUsd?: number;
}

interface UserEchoEvent extends BaseEvent {
  kind: 'user_input';
  text: string;
  uuid: string;
}
```

### Error Model

```ts
enum ProviderErrorCode {
  NotInstalled = 'NotInstalled',
  NotAuthenticated = 'NotAuthenticated',
  ProcessCrashed = 'ProcessCrashed',
  RateLimited = 'RateLimited',
  ValidationFailed = 'ValidationFailed',
  Unknown = 'Unknown'
}

interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  providerHint?: string;     // Text to show user ("Run claude login")
  retryAfterMs?: number;
  underlying?: unknown;      // for logs only
}
```

### Status Metadata

```ts
interface ProviderRuntimeStatus {
  installed: boolean;
  authenticated: boolean;
  version?: string;
  lastChecked?: string;
  telemetry?: Record<string, unknown>;
}

interface InstallResult {
  installed: boolean;
  version?: string;
  notes?: string;
}

interface AuthStatus {
  authenticated: boolean;
  expiresAt?: string;
  actionRequired?: string; // e.g. "Run claude login"
}
```

## Notes & Open Questions
- Event emitter typed after Claude SDK pattern; actual implementation may expose Observable wrapper in addition to Node emitter.
- Capability bag intentionally loose (boolean + arbitrary map) to avoid schema churn during early integrations.
- Resume semantics expect provider to emit `sessionIdChanged` once новый UUID получен, matching tempo from `DirectSDKManager`.
- Error codes inspired by Claude stack; additional provider-specific codes can be exposed via `custom` capability flags.
- Contract versioning: start with `"0.1.0"`; breaking changes bump major, orchestrator can negotiate via `contractVersion`.

## Next Steps
1. Implement `ProviderRegistryFacade` storing `ProviderModuleDescriptor` and capability flags.
2. Expose `SessionOrchestratorFacade` that accepts `ProviderModule` references and routes lifecycle operations.
3. Prepare Claude provider stub implementing this draft contract for integration tests.
