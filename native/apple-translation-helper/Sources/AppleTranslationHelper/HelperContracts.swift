import Foundation

let appleTranslationHelperVersion = "0.2.0"

enum HelperCommand: String, Codable {
    case availability
    case preflight
    case translate
    case translateBatch
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

enum LanguageStatus: String, Encodable {
    case installed
    case supportedNotInstalled = "supported_not_installed"
    case unknown
    case unsupported
}

enum UserMessageCode: String, Encodable {
    case appleNativeHelperFailed = "apple_native_helper_failed"
    case appleNativeLanguagePackMissing = "apple_native_language_pack_missing"
    case appleNativeLanguagePairUnsupported = "apple_native_language_pair_unsupported"
    case appleNativeReady = "apple_native_ready"
    case appleNativeRequiresMacOS = "apple_native_requires_macos"
    case appleNativeRequiresMacOS26 = "apple_native_requires_macos_26"
    case appleNativeRequiresXcode = "apple_native_requires_xcode"
}

struct HelperRequest: Decodable {
    let batch: [String]?
    let command: HelperCommand
    let requestId: String?
    let sourceLanguage: String?
    let targetLanguage: String?
    let text: String?
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
    let xcodeStatus: String?
    let helperStatus: String?
    let languageStatus: String?
    let sourceLanguage: String?
    let targetLanguage: String?
    let translatedText: String?
    let translations: [String]?
    let supportedLanguages: [String]?
    let userMessageCode: String?
    let diagnostic: String?
}

struct TranslationPair {
    let source: Locale.Language
    let sourceCode: String
    let target: Locale.Language
    let targetCode: String
}
