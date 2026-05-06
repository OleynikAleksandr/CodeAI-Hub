import Foundation

let appleSpeechHelperVersion = "0.1.0"

enum HelperCommand: String, Codable {
    case preflight
    case speak
    case stop
    case voices
}

enum HelperExitCode: Int32 {
    case success = 0
    case invalidInput = 64
    case runtimeFailure = 70
}

enum HelperFailure: Error {
    case invalidInput(String)
    case runtime(String)
}

enum SpeechUserMessageCode: String, Encodable {
    case appleSpeechHelperFailed = "apple_speech_helper_failed"
    case appleSpeechReady = "apple_speech_ready"
    case appleSpeechTextMissing = "apple_speech_text_missing"
}

struct HelperRequest: Decodable {
    let command: HelperCommand
    let id: String?
    let language: String?
    let rate: Double?
    let requestId: String?
    let text: String?
}

struct SpeechVoice: Encodable {
    let identifier: String
    let language: String
    let name: String
    let quality: Int
}

struct HelperResponse: Encodable {
    let ok: Bool
    let requestId: String?
    let command: String?
    let helperVersion: String
    let errorCode: String?
    let message: String?
    let platform: String?
    let macOSVersion: String?
    let helperStatus: String?
    let voiceCount: Int?
    let voices: [SpeechVoice]?
    let id: String?
    let normalizedRate: Double?
    let resolvedLanguage: String?
    let userMessageCode: String?
    let voiceIdentifier: String?
    let diagnostic: String?
}
