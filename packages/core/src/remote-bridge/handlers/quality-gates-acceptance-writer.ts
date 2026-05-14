export type QualityGatesAcceptanceWriteStatus =
  | "patched"
  | "noop"
  | "contract_missing"
  | "invalid_json"
  | "path_unresolved";

export interface QualityGatesAcceptanceWriteResult {
  readonly contractPath?: string;
  readonly status: QualityGatesAcceptanceWriteStatus;
}
