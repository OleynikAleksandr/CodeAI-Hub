import type { ProviderRegistry } from "../../provider-registry";
import type { Logger } from "../../telemetry/logger";

interface SessionRequestHandlerProviderSendOptions {
  readonly adapter: NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;
  readonly content: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly providerTurnOptions?: Record<string, unknown>;
  readonly sessionId: string;
}

export class SessionRequestHandlerProviderSend {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async dispatch(
    options: SessionRequestHandlerProviderSendOptions
  ): Promise<void> {
    this.logger.info("Dispatching message to provider adapter", {
      sessionId: options.sessionId,
      providerId: options.providerId,
      providerSessionId: options.providerSessionId,
      contentLength: options.content.length,
    });
    await options.adapter.sendMessage(
      options.providerSessionId,
      options.content,
      options.providerTurnOptions
    );
  }
}
