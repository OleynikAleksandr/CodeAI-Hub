import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
import type { GlmOpenCodeRuntimeProfile } from "./glm-opencode-runtime-profile";
import { OpenCodeServerProcess } from "./glm-opencode-server-process";
import {
  abortOpenCodeRemoteSession,
  createOpenCodeRemoteSession,
  deleteOpenCodeRemoteSession,
  streamOpenCodeTurn,
} from "./glm-opencode-turn-stream";

export interface GlmOpenCodeRunOptions {
  readonly content: string;
  readonly modelSelector: string;
  readonly onEvent: (event: GlmOpenCodeSessionEvent) => void;
  readonly onRemoteSessionId?: (sessionId: string) => void;
  readonly profile: GlmOpenCodeRuntimeProfile;
  readonly remoteSessionId?: string;
}

interface OpenCodeTurnState {
  readonly abortController: AbortController;
  aborted: boolean;
}

const emitFailure = (options: GlmOpenCodeRunOptions, message: string): void => {
  options.onEvent({
    message,
    provider: "glmOpenCode",
    timestamp: new Date().toISOString(),
    type: "turn_failed",
    uuid: `${randomUUID()}::turn_failed`,
  });
};

const emitCompleted = (options: GlmOpenCodeRunOptions): void => {
  options.onEvent({
    data: { modelSelector: options.modelSelector },
    provider: "glmOpenCode",
    timestamp: new Date().toISOString(),
    type: "turn_completed",
    uuid: `${randomUUID()}::turn_completed`,
  });
};

export class GlmOpenCodeServerRuntime {
  private readonly activeTurnByRemoteSessionId = new Map<
    string,
    OpenCodeTurnState
  >();
  private readonly server = new OpenCodeServerProcess();

  async runTurn(options: GlmOpenCodeRunOptions): Promise<string> {
    const handle = await this.server.getHandle(options.profile);
    const remoteSessionId =
      options.remoteSessionId ??
      (await createOpenCodeRemoteSession(
        handle.client,
        options.profile.workspacePath
      ));
    options.onRemoteSessionId?.(remoteSessionId);
    const turnState: OpenCodeTurnState = {
      abortController: new AbortController(),
      aborted: false,
    };
    this.activeTurnByRemoteSessionId.set(remoteSessionId, turnState);
    try {
      await streamOpenCodeTurn({
        abortSignal: turnState.abortController.signal,
        client: handle.client,
        content: options.content,
        modelSelector: options.modelSelector,
        onEvent: options.onEvent,
        remoteSessionId,
        serverUrl: handle.url,
        workspacePath: options.profile.workspacePath,
      });
      emitCompleted(options);
      return remoteSessionId;
    } catch (error) {
      let message = "OpenCode server transport failed.";
      if (turnState.aborted) {
        message = "OpenCode session aborted.";
      } else if (error instanceof Error) {
        message = error.message;
      }
      emitFailure(options, message);
      throw new Error(message);
    } finally {
      this.activeTurnByRemoteSessionId.delete(remoteSessionId);
    }
  }

  async abortRemoteSession(
    profile: GlmOpenCodeRuntimeProfile,
    remoteSessionId: string
  ): Promise<void> {
    const turnState = this.activeTurnByRemoteSessionId.get(remoteSessionId);
    if (turnState) {
      turnState.aborted = true;
      turnState.abortController.abort();
    }
    const handle = await this.server.getHandle(profile);
    await abortOpenCodeRemoteSession(
      handle.client,
      remoteSessionId,
      profile.workspacePath
    ).catch(() => undefined);
  }

  async deleteRemoteSession(
    profile: GlmOpenCodeRuntimeProfile,
    remoteSessionId: string
  ): Promise<void> {
    const handle = await this.server.getHandle(profile);
    await deleteOpenCodeRemoteSession(
      handle.client,
      remoteSessionId,
      profile.workspacePath
    ).catch(() => undefined);
  }
}
