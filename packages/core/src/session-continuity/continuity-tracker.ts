import type { Session } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import { ContinuityChainStore, readContinuityChains } from "./continuity-store";
import type {
  ContinuityChain,
  ContinuityChainSummary,
  ContinuitySegment,
  ContinuityStageId,
} from "./continuity-types";

const normalizeStageId = (
  value: string | null | undefined
): ContinuityStageId => {
  if (
    value === "description" ||
    value === "virtual_simulation" ||
    value === "diagram_modules"
  ) {
    return value;
  }
  return "unknown";
};

const buildProviderSessionKey = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly providerSessionId: string;
}): string =>
  [
    options.workspaceRoot,
    options.workspaceSlug,
    options.stage,
    options.providerSessionId,
  ].join("|");

export class ContinuityTracker {
  private readonly logger: Logger;
  private readonly clock: () => string;
  private readonly sessionLookup: (sessionId: string) => Session | undefined;
  private readonly rootBySessionId = new Map<string, string>();
  private readonly hasPersistedInitialSegment = new Set<string>();
  private readonly rootByProviderSessionKey = new Map<string, string>();

  constructor(options: {
    readonly logger: Logger;
    readonly clock: () => string;
    readonly sessionLookup: (sessionId: string) => Session | undefined;
  }) {
    this.logger = options.logger;
    this.clock = options.clock;
    this.sessionLookup = options.sessionLookup;
  }

  registerSession(options: {
    readonly session: Session;
    readonly rootSessionId?: string | null;
  }): void {
    const session = options.session;
    const rootSessionId =
      options.rootSessionId ??
      this.rootBySessionId.get(session.id) ??
      session.id;
    this.rootBySessionId.set(session.id, rootSessionId);
  }

  getRootSessionId(sessionId: string): string {
    return this.rootBySessionId.get(sessionId) ?? sessionId;
  }

  updateProviderSessionId(sessionId: string, providerSessionId: string): void {
    const session = this.sessionLookup(sessionId);
    if (!session) {
      return;
    }
    const rootSessionId = this.rootBySessionId.get(sessionId);
    if (!(rootSessionId && session.initiativeSlug)) {
      return;
    }

    this.updateChain(session, rootSessionId, (chain) => {
      const updated = chain.segments.map((segment) =>
        segment.sessionId === sessionId
          ? { ...segment, providerSessionId }
          : segment
      );
      return { ...chain, segments: updated, updatedAt: this.clock() };
    }).catch((error: unknown) => {
      this.logger.warn("Failed to update continuity provider session id", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async ensureTrackedOnOutboundMessage(options: {
    readonly sessionId: string;
    readonly providerSessionId?: string | null;
  }): Promise<void> {
    if (this.hasPersistedInitialSegment.has(options.sessionId)) {
      return;
    }

    const context = this.resolveOutboundContext(options);
    if (!context) {
      return;
    }

    const rootSessionId = await this.resolveRootSessionId(context);
    await this.persistInitialSegment(context, rootSessionId);
  }

  updateChain(
    session: Session,
    rootSessionId: string,
    update: (chain: ContinuityChain) => ContinuityChain
  ): Promise<void> {
    return this.updateChainInternal(session, rootSessionId, update);
  }

  private setRootSessionId(sessionId: string, rootSessionId: string): void {
    this.rootBySessionId.set(sessionId, rootSessionId);
  }

  private resolveOutboundContext(options: {
    readonly sessionId: string;
    readonly providerSessionId?: string | null;
  }): {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stage: ContinuityStageId;
    readonly providerSessionId: string;
    readonly providerSessionKey: string;
  } | null {
    const session = this.sessionLookup(options.sessionId);
    if (!session) {
      return null;
    }

    const workspaceSlug = session.initiativeSlug;
    if (!workspaceSlug) {
      return null;
    }

    const providerSessionId =
      options.providerSessionId ?? session.providerSessionId ?? null;
    if (!providerSessionId || providerSessionId.trim().length === 0) {
      return null;
    }

    const stage = normalizeStageId(session.stage);
    const providerSessionKey = buildProviderSessionKey({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      stage,
      providerSessionId,
    });

    return {
      session,
      workspaceSlug,
      stage,
      providerSessionId,
      providerSessionKey,
    };
  }

  private async resolveRootSessionId(context: {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stage: ContinuityStageId;
    readonly providerSessionId: string;
    readonly providerSessionKey: string;
  }): Promise<string> {
    const cachedRoot = this.rootByProviderSessionKey.get(
      context.providerSessionKey
    );
    if (cachedRoot) {
      this.setRootSessionId(context.session.id, cachedRoot);
      return cachedRoot;
    }

    const currentRoot = this.getRootSessionId(context.session.id);
    if (currentRoot !== context.session.id) {
      this.rootByProviderSessionKey.set(
        context.providerSessionKey,
        currentRoot
      );
      return currentRoot;
    }

    const existingRoot = await this.findExistingRootSessionId({
      workspaceRoot: context.session.workspacePath,
      workspaceSlug: context.workspaceSlug,
      stage: context.stage,
      providerSessionId: context.providerSessionId,
    });

    const resolved = existingRoot ?? currentRoot;
    if (resolved !== currentRoot) {
      this.setRootSessionId(context.session.id, resolved);
    }
    this.rootByProviderSessionKey.set(context.providerSessionKey, resolved);
    return resolved;
  }

  private async persistInitialSegment(
    context: {
      readonly session: Session;
      readonly providerSessionId: string;
    },
    rootSessionId: string
  ): Promise<void> {
    const segment: ContinuitySegment = {
      sessionId: context.session.id,
      providerId: context.session.providerId,
      providerSessionId: context.providerSessionId,
      createdAt: context.session.createdAt,
    };

    try {
      const store = this.createStore(context.session, rootSessionId);
      const existing = await store.read();
      if (!existing) {
        await store.appendSegment(segment);
        this.hasPersistedInitialSegment.add(context.session.id);
        return;
      }

      const lastSegment = existing.segments.at(-1);
      const isDuplicate = lastSegment
        ? lastSegment.providerId === segment.providerId &&
          lastSegment.providerSessionId === segment.providerSessionId
        : false;

      if (isDuplicate) {
        await store.save({ ...existing, updatedAt: this.clock() });
        this.hasPersistedInitialSegment.add(context.session.id);
        return;
      }

      await store.save({
        ...existing,
        segments: [...existing.segments, segment],
        updatedAt: this.clock(),
      });
      this.hasPersistedInitialSegment.add(context.session.id);
    } catch (error: unknown) {
      this.logger.warn(
        "Failed to persist continuity chain on outbound message",
        {
          sessionId: context.session.id,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  private createStore(
    session: Session,
    rootSessionId: string
  ): ContinuityChainStore {
    return new ContinuityChainStore({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug ?? "unknown",
      stage: session.stage,
      rootSessionId,
    });
  }

  private async updateChainInternal(
    session: Session,
    rootSessionId: string,
    update: (chain: ContinuityChain) => ContinuityChain
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }
    const store = this.createStore(session, rootSessionId);
    const existing = await store.read();
    if (!existing) {
      return;
    }
    const next = update(existing);
    await store.save(next);
  }

  private async findExistingRootSessionId(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly stage: ContinuityStageId;
    readonly providerSessionId: string;
  }): Promise<string | null> {
    const chains: ContinuityChainSummary[] = await readContinuityChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });

    const match = chains.find((chain) => {
      if (chain.stage !== options.stage) {
        return false;
      }
      return chain.segments.some(
        (segment) => segment.providerSessionId === options.providerSessionId
      );
    });

    return match?.rootSessionId ?? null;
  }
}
