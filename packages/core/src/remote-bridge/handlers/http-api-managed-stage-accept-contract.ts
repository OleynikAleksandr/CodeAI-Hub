import type { Request, Response } from "express";
import type { ManagedWorkflowPostTurnService } from "./managed-workflow-post-turn-service";

// HTTP transport for the Application Skeleton accept-contract command.
// Pure transport: parses the request, delegates to the Core command handler,
// and returns the decision shape verbatim. No read-model reasoning lives here;
// every gating concern is owned by the Core handler.

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readSource = (value: unknown): "ui-button" | "typed-fallback" =>
  value === "typed-fallback" ? "typed-fallback" : "ui-button";

export const handleApplicationSkeletonAcceptContract = async (
  req: Request,
  res: Response,
  service: ManagedWorkflowPostTurnService
): Promise<void> => {
  const body = isRecord(req.body) ? req.body : {};
  const sessionId = readNonEmptyString(body.sessionId);
  if (!sessionId) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Missing sessionId" });
    return;
  }
  const decision = await service.handleApplicationSkeletonAcceptContractCommand(
    { sessionId, source: readSource(body.source) }
  );
  if (decision.kind === "rejected") {
    res.status(HTTP_CONFLICT).json({
      error: "rejected",
      reasons: decision.reasons,
      stage: decision.stage,
    });
    return;
  }
  res.json({ stage: decision.stage, status: "accepted" });
};

export const handleQualityGatesAcceptContract = async (
  req: Request,
  res: Response,
  service: ManagedWorkflowPostTurnService
): Promise<void> => {
  const body = isRecord(req.body) ? req.body : {};
  const sessionId = readNonEmptyString(body.sessionId);
  if (!sessionId) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Missing sessionId" });
    return;
  }
  const decision = await service.handleQualityGatesAcceptContractCommand({
    sessionId,
    source: readSource(body.source),
  });
  if (decision.kind === "rejected") {
    res.status(HTTP_CONFLICT).json({
      error: "rejected",
      reasons: decision.reasons,
      stage: decision.stage,
    });
    return;
  }
  res.json({ stage: decision.stage, status: "accepted" });
};
