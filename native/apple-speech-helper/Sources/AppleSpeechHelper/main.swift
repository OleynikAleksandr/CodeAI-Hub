import AVFAudio
import Foundation

private let defaultSpeechRate = 1.0
private let maxSpeechRate = 2.0
private let minSpeechRate = 0.75
private let speechRunLoopStepSeconds = 0.05

private final class SpeechRunDelegate: NSObject, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    private(set) var diagnostic: String?
    private(set) var finished = false

    func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        finished = true
    }

    func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        finished = true
    }

    func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didEncounterError error: Error,
        for utterance: AVSpeechUtterance,
        at characterRange: NSRange
    ) {
        diagnostic = String(describing: error)
        finished = true
    }
}

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

private func trimToNil(_ value: String?) -> String? {
    guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines),
          trimmed.isEmpty == false
    else {
        return nil
    }
    return trimmed
}

private func normalizedRate(_ value: Double?) -> Double {
    let candidate = value ?? defaultSpeechRate
    if candidate.isFinite == false {
        return defaultSpeechRate
    }
    return min(max(candidate, minSpeechRate), maxSpeechRate)
}

private func utteranceRate(for normalizedRate: Double) -> Float {
    let rawRate = Double(AVSpeechUtteranceDefaultSpeechRate) * normalizedRate
    let clamped = min(
        max(rawRate, Double(AVSpeechUtteranceMinimumSpeechRate)),
        Double(AVSpeechUtteranceMaximumSpeechRate)
    )
    return Float(clamped)
}

private func handleSpeak(_ request: HelperRequest) -> HelperResponse {
    let rate = normalizedRate(request.rate)
    guard let text = trimToNil(request.text) else {
        return makeResponse(
            ok: false,
            request: request,
            errorCode: "text_missing",
            message: "Missing text to speak.",
            id: request.id,
            normalizedRate: rate,
            userMessageCode: .appleSpeechTextMissing
        )
    }

    let utterance = AVSpeechUtterance(string: text)
    utterance.rate = utteranceRate(for: rate)
    if let language = trimToNil(request.language),
       let voice = AVSpeechSynthesisVoice(language: language)
    {
        utterance.voice = voice
    }

    let synthesizer = AVSpeechSynthesizer()
    let delegate = SpeechRunDelegate()
    synthesizer.delegate = delegate
    synthesizer.speak(utterance)

    while delegate.finished == false {
        RunLoop.current.run(
            mode: .default,
            before: Date(timeIntervalSinceNow: speechRunLoopStepSeconds)
        )
    }

    if let diagnostic = delegate.diagnostic {
        return makeResponse(
            ok: false,
            request: request,
            errorCode: "speech_failed",
            message: "Apple Text-to-Speech failed while speaking.",
            helperStatus: "failed",
            id: request.id,
            normalizedRate: rate,
            userMessageCode: .appleSpeechHelperFailed,
            diagnostic: diagnostic
        )
    }

    return makeResponse(
        ok: true,
        request: request,
        message: "Apple Text-to-Speech completed.",
        id: request.id,
        normalizedRate: rate,
        userMessageCode: .appleSpeechReady
    )
}

private func handleStop(_ request: HelperRequest) -> HelperResponse {
    makeResponse(
        ok: true,
        request: request,
        message: "No persistent speech process is active in this helper instance.",
        helperStatus: "idle",
        id: request.id,
        userMessageCode: .appleSpeechReady
    )
}

private func handle(_ request: HelperRequest) throws -> HelperResponse {
    switch request.command {
    case .preflight:
        return handlePreflight(request)
    case .voices:
        return handleVoices(request)
    case .speak:
        return handleSpeak(request)
    case .stop:
        return handleStop(request)
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
