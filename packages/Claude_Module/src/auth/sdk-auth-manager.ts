import type { ModuleReporter } from "../types";
import { ClaudeAuthHomeBridge } from "./claude-auth-home-bridge";
import {
  CLAUDE_LOGIN_HINT,
  CLAUDE_PROVIDER_HOME_LOGIN_HINT,
  ClaudeAuthRuntime,
} from "./claude-auth-runtime";

export class SDKAuthManager {
  private readonly authHomeBridge: ClaudeAuthHomeBridge;
  private readonly authRuntime: ClaudeAuthRuntime;
  private readonly reporter?: ModuleReporter;
  private providerHomeBootstrapReady = false;

  constructor(options?: { readonly reporter?: ModuleReporter }) {
    this.reporter = options?.reporter;
    this.authHomeBridge = new ClaudeAuthHomeBridge({
      reporter: this.reporter,
    });
    this.authRuntime = new ClaudeAuthRuntime({
      reporter: this.reporter,
    });
  }

  async ensureSubscriptionAuth(): Promise<void> {
    await this.authHomeBridge.ensureMacOSProviderHomeKeychainBridgeIfNeeded();
    await this.authHomeBridge.linkLegacyCliStateIfNeeded();
    await this.authHomeBridge.migrateLegacyCredentialsIfNeeded();
    await this.authRuntime.bootstrapOAuthToken();
    const authenticated = await this.authRuntime.checkAuthentication();
    if (!authenticated) {
      throw new Error(CLAUDE_LOGIN_HINT);
    }
  }

  async ensureProviderHomeSessionBootstrap(payload: {
    readonly workspacePath: string;
  }): Promise<void> {
    if (this.providerHomeBootstrapReady) {
      return;
    }

    await this.authHomeBridge.ensureMacOSProviderHomeKeychainBridgeIfNeeded();

    // Best-effort: reuse existing auth without forcing users to re-login
    // after we sandbox HOME for provider execution.
    await this.authHomeBridge.linkLegacyCliStateIfNeeded();
    await this.authHomeBridge.migrateLegacyCredentialsIfNeeded();
    await this.authRuntime.bootstrapOAuthToken();

    const initialAttempt = await this.authRuntime.runAuthProbe(
      payload.workspacePath
    );
    if (initialAttempt) {
      this.providerHomeBootstrapReady = true;
      return;
    }

    this.reporter?.warn?.(
      "Claude preflight auth probe failed; retrying with refreshed OAuth token"
    );
    await this.authRuntime.bootstrapOAuthToken({ forceRefresh: true });
    const retryAttempt = await this.authRuntime.runAuthProbe(
      payload.workspacePath
    );
    if (retryAttempt) {
      this.providerHomeBootstrapReady = true;
      return;
    }

    throw new Error(CLAUDE_PROVIDER_HOME_LOGIN_HINT);
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    return this.authRuntime.getAuthEnvironment();
  }
}
