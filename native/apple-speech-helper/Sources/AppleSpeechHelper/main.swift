import AVFAudio
import Foundation

private func currentMacOSVersion() -> String {
    let version = ProcessInfo.processInfo.operatingSystemVersion
    return "\(version.majorVersion).\(version.minorVersion).\(version.patchVersion)"
}

private func readStandardInput() throws -> Data {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard input.isEmpty == false else {
        throw HelperFailure.invalidInput("Expected JSON request on stdin.")
    }
    return input
}

private func writeResponse(_ response: HelperResponse) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(response)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

private func makeResponse(
    ok: Bool,
    request: HelperRequest?,
    errorCode: String? = nil,
    message: String? = nil,
    helperStatus: String? = "ready",
    voiceCount: Int? = nil,
    voices: [SpeechVoice]? = nil,
    id: String? = nil,
    normalizedRate: Double? = nil,
    userMessageCode: SpeechUserMessageCode? = nil,
    diagnostic: String? = nil
) -> HelperResponse {
    HelperResponse(
        ok: ok,
        requestId: request?.requestId,
        command: request?.command.rawValue,
        helperVersion: appleSpeechHelperVersion,
        errorCode: errorCode,
        message: message,
        platform: "macos",
        macOSVersion: currentMacOSVersion(),
        helperStatus: helperStatus,
        voiceCount: voiceCount,
        voices: voices,
        id: id,
        normalizedRate: normalizedRate,
        userMessageCode: userMessageCode?.rawValue,
        diagnostic: diagnostic
    )
}

private func speechVoices() -> [SpeechVoice] {
    AVSpeechSynthesisVoice.speechVoices()
        .map {
            SpeechVoice(
                identifier: $0.identifier,
                language: $0.language,
                name: $0.name,
                quality: $0.quality.rawValue
            )
        }
        .sorted {
            if $0.language == $1.language {
                return $0.name < $1.name
            }
            return $0.language < $1.language
        }
}

private func handlePreflight(_ request: HelperRequest) -> HelperResponse {
    let voices = speechVoices()
    return makeResponse(
        ok: voices.isEmpty == false,
        request: request,
        errorCode: voices.isEmpty ? "voices_unavailable" : nil,
        message: voices.isEmpty
            ? "Apple speech synthesis voices are unavailable."
            : "Apple Text-to-Speech is ready.",
        helperStatus: voices.isEmpty ? "unavailable" : "ready",
        voiceCount: voices.count,
        userMessageCode: voices.isEmpty
            ? .appleSpeechHelperFailed
            : .appleSpeechReady
    )
}

private func handleVoices(_ request: HelperRequest) -> HelperResponse {
    let voices = speechVoices()
    return makeResponse(
        ok: true,
        request: request,
        voiceCount: voices.count,
        voices: voices,
        userMessageCode: .appleSpeechReady
    )
}

private func handleScaffoldedRuntimeCommand(_ request: HelperRequest) -> HelperResponse {
    makeResponse(
        ok: false,
        request: request,
        errorCode: "not_implemented",
        message: "Apple Text-to-Speech runtime command is not implemented in scaffold.",
        helperStatus: "scaffold",
        id: request.id,
        userMessageCode: .appleSpeechHelperFailed
    )
}

private func handle(_ request: HelperRequest) throws -> HelperResponse {
    switch request.command {
    case .preflight:
        return handlePreflight(request)
    case .voices:
        return handleVoices(request)
    case .speak, .stop:
        return handleScaffoldedRuntimeCommand(request)
    }
}

private func errorResponse(
    errorCode: String,
    message: String,
    diagnostic: String? = nil
) -> HelperResponse {
    HelperResponse(
        ok: false,
        requestId: nil,
        command: nil,
        helperVersion: appleSpeechHelperVersion,
        errorCode: errorCode,
        message: message,
        platform: "macos",
        macOSVersion: currentMacOSVersion(),
        helperStatus: "failed",
        voiceCount: nil,
        voices: nil,
        id: nil,
        normalizedRate: nil,
        userMessageCode: SpeechUserMessageCode.appleSpeechHelperFailed.rawValue,
        diagnostic: diagnostic
    )
}

do {
    let input = try readStandardInput()
    let request = try JSONDecoder().decode(HelperRequest.self, from: input)
    try writeResponse(try handle(request))
    exit(HelperExitCode.success.rawValue)
} catch HelperFailure.invalidInput(let message) {
    try? writeResponse(errorResponse(errorCode: "invalid_input", message: message))
    exit(HelperExitCode.invalidInput.rawValue)
} catch let error as DecodingError {
    try? writeResponse(
        errorResponse(
            errorCode: "invalid_json",
            message: "Invalid helper request JSON.",
            diagnostic: String(describing: error)
        )
    )
    exit(HelperExitCode.invalidInput.rawValue)
} catch {
    try? writeResponse(
        errorResponse(
            errorCode: "runtime_failure",
            message: "Apple Text-to-Speech helper failed.",
            diagnostic: String(describing: error)
        )
    )
    exit(HelperExitCode.runtimeFailure.rawValue)
}
