import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
} from "./translation-engine";

const APPLE_NATIVE_TRANSLATION_ENGINE_ID = "apple-native";

const HELPER_RELATIVE_PATH = [
  "native",
  "apple-translation-helper",
  ".build",
  "release",
  "apple-translation-helper",
] as const;

const createFallbackResult = (
  request: TranslationRequest,
  errorCode: string
): TranslationResult => ({
  engine: APPLE_NATIVE_TRANSLATION_ENGINE_ID,
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createTranslatedResult = (
  request: TranslationRequest,
  translatedText: string
): TranslationResult => ({
  engine: APPLE_NATIVE_TRANSLATION_ENGINE_ID,
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

const APPLE_NATIVE_FALLBACK_CODE_BY_HELPER_CODE: ReadonlyMap<string, string> =
  new Map([
    ["runtime_failure", "apple_native_helper_failed"],
    ["supported_not_installed", "apple_native_language_pack_missing"],
    ["unknown", "apple_native_helper_failed"],
    ["unsupported", "apple_native_language_pair_unsupported"],
    ["xcode_not_ready", "apple_native_requires_xcode"],
  ]);

const isExecutableFile = (path: string): boolean => {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
};

const defaultHelperPathCandidates = (): readonly string[] => [
  ...(process.env.CODEAI_APPLE_TRANSLATION_HELPER_PATH
    ? [process.env.CODEAI_APPLE_TRANSLATION_HELPER_PATH]
    : []),
  ...(process.argv[1]
    ? [join(dirname(process.argv[1]), "..", ...HELPER_RELATIVE_PATH)]
    : []),
  join(process.cwd(), ...HELPER_RELATIVE_PATH),
];

const resolveHelperPath = (
  candidates: readonly string[] = defaultHelperPathCandidates()
): string | null => candidates.find(isExecutableFile) ?? null;

interface AppleNativeHelperResponse {
  readonly diagnostic?: string;
  readonly errorCode?: string;
  readonly helperStatus?: string;
  readonly languageStatus?: string;
  readonly message?: string;
  readonly ok?: boolean;
  readonly translatedText?: string;
  readonly userMessageCode?: string;
  readonly xcodeStatus?: string;
}

export interface AppleNativeTranslationEngineOptions {
  readonly helperPathCandidates?: readonly string[];
  readonly reporter?: TranslationReporter;
}

export class AppleNativeTranslationEngine implements TranslationEngine {
  readonly id = APPLE_NATIVE_TRANSLATION_ENGINE_ID;
  private readonly helperPathCandidates?: readonly string[];
  private readonly reporter?: TranslationReporter;

  constructor(options: AppleNativeTranslationEngineOptions = {}) {
    this.helperPathCandidates = options.helperPathCandidates;
    this.reporter = options.reporter;
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    const helperPath = resolveHelperPath(this.helperPathCandidates);
    if (!helperPath) {
      this.reporter?.warn?.("Apple Native translation helper unavailable", {
        engine: this.id,
      });
      return createFallbackResult(request, "apple_native_helper_unavailable");
    }

    try {
      const response = await this.runHelper(helperPath, request);
      if (response.ok === true && typeof response.translatedText === "string") {
        const translatedText = response.translatedText.trim();
        if (translatedText.length > 0) {
          return createTranslatedResult(request, translatedText);
        }
      }

      const errorCode = resolveFallbackErrorCode(response);
      this.reporter?.warn?.("Apple Native translation returned fallback", {
        engine: this.id,
        diagnostic: response.diagnostic,
        errorCode,
        helperErrorCode: response.errorCode,
        helperStatus: response.helperStatus,
        languageStatus: response.languageStatus,
        userMessageCode: response.userMessageCode,
        xcodeStatus: response.xcodeStatus,
      });
      return createFallbackResult(request, errorCode);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = resolveThrownFallbackErrorCode(errorMessage);
      this.reporter?.warn?.("Apple Native translation failed", {
        engine: this.id,
        error: errorMessage,
        errorCode,
      });
      return createFallbackResult(request, errorCode);
    }
  }

  private runHelper(
    helperPath: string,
    request: NormalizedTranslationRequest
  ): Promise<AppleNativeHelperResponse> {
    return new Promise<AppleNativeHelperResponse>((resolveResult, reject) => {
      const child = spawn(helperPath, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error("Apple Native helper timed out."));
      }, request.timeoutMs);

      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        const parsed = parseHelperResponse(stdout);
        if (parsed) {
          resolveResult(parsed);
          return;
        }
        reject(
          new Error(
            `Apple Native helper exited ${code ?? "unknown"} without JSON output: ${stderr.trim()}`
          )
        );
      });
      child.stdin.end(
        JSON.stringify({
          command: "translate",
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          text: request.text,
        })
      );
    });
  }
}

const parseHelperResponse = (
  stdout: string
): AppleNativeHelperResponse | null => {
  for (const line of stdout.split("\n").reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      return JSON.parse(trimmed) as AppleNativeHelperResponse;
    } catch {
      return null;
    }
  }
  return null;
};

const resolveFallbackErrorCode = (
  response: AppleNativeHelperResponse
): string => {
  if (response.userMessageCode?.startsWith("apple_native_")) {
    return response.userMessageCode;
  }
  if (response.errorCode) {
    return (
      APPLE_NATIVE_FALLBACK_CODE_BY_HELPER_CODE.get(response.errorCode) ??
      response.errorCode
    );
  }
  return "apple_native_empty_translation";
};

const resolveThrownFallbackErrorCode = (message: string): string => {
  if (message.includes("timed out")) {
    return "apple_native_request_timeout";
  }
  if (message.includes("without JSON output")) {
    return "apple_native_helper_failed";
  }
  return "apple_native_request_failed";
};
