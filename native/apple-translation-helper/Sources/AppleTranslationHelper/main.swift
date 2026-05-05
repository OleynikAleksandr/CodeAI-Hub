import Foundation
import Translation

private func trimToNil(_ value: String?) -> String? {
    guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines),
          trimmed.isEmpty == false
    else {
        return nil
    }
    return trimmed
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
    platform: String? = "macos",
    xcodeStatus: String? = nil,
    helperStatus: String? = "ready",
    languageStatus: LanguageStatus? = nil,
    sourceLanguage: String? = nil,
    targetLanguage: String? = nil,
    translatedText: String? = nil,
    translations: [String]? = nil,
    supportedLanguages: [String]? = nil,
    userMessageCode: UserMessageCode? = nil,
    diagnostic: String? = nil
) -> HelperResponse {
    HelperResponse(
        ok: ok,
        requestId: request?.requestId,
        command: request?.command.rawValue,
        helperVersion: appleTranslationHelperVersion,
        errorCode: errorCode,
        message: message,
        platform: platform,
        macOSVersion: currentMacOSVersion(),
        xcodeStatus: xcodeStatus,
        helperStatus: helperStatus,
        languageStatus: languageStatus?.rawValue,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        translatedText: translatedText,
        translations: translations,
        supportedLanguages: supportedLanguages,
        userMessageCode: userMessageCode?.rawValue,
        diagnostic: diagnostic
    )
}

private func requirePair(_ request: HelperRequest) throws -> TranslationPair {
    guard let sourceCode = trimToNil(request.sourceLanguage) else {
        throw HelperFailure.invalidInput("Missing sourceLanguage.")
    }
    guard let targetCode = trimToNil(request.targetLanguage) else {
        throw HelperFailure.invalidInput("Missing targetLanguage.")
    }
    return TranslationPair(
        source: Locale.Language(identifier: sourceCode),
        sourceCode: sourceCode,
        target: Locale.Language(identifier: targetCode),
        targetCode: targetCode
    )
}

private func languageStatus(for pair: TranslationPair) async -> LanguageStatus {
    let availability = LanguageAvailability()
    let status = await availability.status(from: pair.source, to: pair.target)
    switch status {
    case .installed:
        return .installed
    case .supported:
        return .supportedNotInstalled
    case .unsupported:
        return .unsupported
    @unknown default:
        return .unknown
    }
}

private func userMessageCode(for status: LanguageStatus) -> UserMessageCode {
    switch status {
    case .installed:
        return .appleNativeReady
    case .supportedNotInstalled:
        return .appleNativeLanguagePackMissing
    case .unsupported:
        return .appleNativeLanguagePairUnsupported
    case .unknown:
        return .appleNativeHelperFailed
    }
}

private func resolveXcodeStatus() -> String {
    guard FileManager.default.isExecutableFile(atPath: "/usr/bin/xcodebuild") else {
        return "missing"
    }

    let process = Process()
    let output = Pipe()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/xcodebuild")
    process.arguments = ["-version"]
    process.standardOutput = output
    process.standardError = output

    do {
        try process.run()
        process.waitUntilExit()
    } catch {
        return "unknown"
    }

    guard process.terminationStatus == 0 else {
        return "unknown"
    }

    let data = output.fileHandleForReading.readDataToEndOfFile()
    let text = String(data: data, encoding: .utf8) ?? ""
    guard let firstLine = text.split(separator: "\n").first else {
        return "unknown"
    }
    let parts = firstLine.split(separator: " ")
    guard parts.count >= 2,
          let major = Int(parts[1].split(separator: ".").first ?? "")
    else {
        return "unknown"
    }

    return major >= 26 ? "ready" : "unsupported"
}

private func supportedLanguageCodes() async -> [String] {
    let availability = LanguageAvailability()
    let languages = await availability.supportedLanguages
    return languages
        .map(\.minimalIdentifier)
        .sorted()
}

private func handlePreflight(_ request: HelperRequest) async throws -> HelperResponse {
    let xcodeStatus = resolveXcodeStatus()
    guard xcodeStatus == "ready" else {
        return makeResponse(
            ok: false,
            request: request,
            errorCode: "xcode_not_ready",
            message: "Install Xcode 26 or newer and complete first launch setup.",
            xcodeStatus: xcodeStatus,
            userMessageCode: .appleNativeRequiresXcode
        )
    }

    guard let sourceLanguage = trimToNil(request.sourceLanguage),
          let targetLanguage = trimToNil(request.targetLanguage)
    else {
        return makeResponse(
            ok: true,
            request: request,
            xcodeStatus: xcodeStatus,
            supportedLanguages: await supportedLanguageCodes(),
            userMessageCode: .appleNativeReady
        )
    }

    let pair = TranslationPair(
        source: Locale.Language(identifier: sourceLanguage),
        sourceCode: sourceLanguage,
        target: Locale.Language(identifier: targetLanguage),
        targetCode: targetLanguage
    )
    let status = await languageStatus(for: pair)
    return makeResponse(
        ok: status == .installed,
        request: request,
        errorCode: status == .installed ? nil : status.rawValue,
        message: readinessMessage(for: status, pair: pair),
        xcodeStatus: xcodeStatus,
        languageStatus: status,
        sourceLanguage: pair.sourceCode,
        targetLanguage: pair.targetCode,
        supportedLanguages: await supportedLanguageCodes(),
        userMessageCode: userMessageCode(for: status)
    )
}

private func readinessMessage(for status: LanguageStatus, pair: TranslationPair) -> String {
    switch status {
    case .installed:
        return "Apple Native Translation is ready for \(pair.sourceCode) -> \(pair.targetCode)."
    case .supportedNotInstalled:
        return "Download the \(pair.sourceCode) and \(pair.targetCode) languages in System Settings -> General -> Language & Region -> Translation Languages and enable On-Device Mode."
    case .unsupported:
        return "Apple Translation does not support \(pair.sourceCode) -> \(pair.targetCode)."
    case .unknown:
        return "Apple Translation language availability could not be determined."
    }
}

private func handleAvailability(_ request: HelperRequest) async throws -> HelperResponse {
    let pair = try requirePair(request)
    let status = await languageStatus(for: pair)
    return makeResponse(
        ok: status == .installed,
        request: request,
        errorCode: status == .installed ? nil : status.rawValue,
        message: readinessMessage(for: status, pair: pair),
        xcodeStatus: resolveXcodeStatus(),
        languageStatus: status,
        sourceLanguage: pair.sourceCode,
        targetLanguage: pair.targetCode,
        userMessageCode: userMessageCode(for: status)
    )
}

private func requireReadyPair(
    _ request: HelperRequest
) async throws -> (TranslationPair, LanguageStatus) {
    let pair = try requirePair(request)
    let status = await languageStatus(for: pair)
    return (pair, status)
}

private func makeSession(for pair: TranslationPair) -> TranslationSession {
    TranslationSession(installedSource: pair.source, target: pair.target)
}

private func handleTranslate(_ request: HelperRequest) async throws -> HelperResponse {
    let (pair, status) = try await requireReadyPair(request)
    guard status == .installed else {
        return makeResponse(
            ok: false,
            request: request,
            errorCode: status.rawValue,
            message: readinessMessage(for: status, pair: pair),
            xcodeStatus: resolveXcodeStatus(),
            languageStatus: status,
            sourceLanguage: pair.sourceCode,
            targetLanguage: pair.targetCode,
            userMessageCode: userMessageCode(for: status)
        )
    }
    guard let text = trimToNil(request.text) else {
        throw HelperFailure.invalidInput("Missing text.")
    }

    let session = makeSession(for: pair)
    try await session.prepareTranslation()
    let response = try await session.translate(text)

    return makeResponse(
        ok: true,
        request: request,
        xcodeStatus: resolveXcodeStatus(),
        languageStatus: .installed,
        sourceLanguage: response.sourceLanguage.minimalIdentifier,
        targetLanguage: response.targetLanguage.minimalIdentifier,
        translatedText: response.targetText,
        userMessageCode: .appleNativeReady
    )
}

private func handleTranslateBatch(_ request: HelperRequest) async throws -> HelperResponse {
    let (pair, status) = try await requireReadyPair(request)
    guard status == .installed else {
        return makeResponse(
            ok: false,
            request: request,
            errorCode: status.rawValue,
            message: readinessMessage(for: status, pair: pair),
            xcodeStatus: resolveXcodeStatus(),
            languageStatus: status,
            sourceLanguage: pair.sourceCode,
            targetLanguage: pair.targetCode,
            userMessageCode: userMessageCode(for: status)
        )
    }
    guard let batch = request.batch, batch.isEmpty == false else {
        throw HelperFailure.invalidInput("Missing batch.")
    }
    if batch.contains(where: { trimToNil($0) == nil }) {
        throw HelperFailure.invalidInput("Batch items must be non-empty strings.")
    }

    let session = makeSession(for: pair)
    try await session.prepareTranslation()
    let requests = batch.enumerated().map { index, text in
        TranslationSession.Request(
            sourceText: text,
            clientIdentifier: String(index)
        )
    }
    let responses = try await session.translations(from: requests)
    let responseMap = Dictionary(uniqueKeysWithValues: responses.compactMap {
        response -> (String, String)? in
        guard let clientIdentifier = response.clientIdentifier else {
            return nil
        }
        return (clientIdentifier, response.targetText)
    })
    let translations = batch.indices.map { index in
        responseMap[String(index)] ?? ""
    }

    return makeResponse(
        ok: true,
        request: request,
        xcodeStatus: resolveXcodeStatus(),
        languageStatus: .installed,
        sourceLanguage: pair.sourceCode,
        targetLanguage: pair.targetCode,
        translations: translations,
        userMessageCode: .appleNativeReady
    )
}

private func handle(_ request: HelperRequest) async throws -> HelperResponse {
    switch request.command {
    case .availability:
        return try await handleAvailability(request)
    case .preflight:
        return try await handlePreflight(request)
    case .translate:
        return try await handleTranslate(request)
    case .translateBatch:
        return try await handleTranslateBatch(request)
    }
}

private func run() async -> HelperExitCode {
    do {
        let input = try readStandardInput()
        let request = try JSONDecoder().decode(HelperRequest.self, from: input)
        try writeResponse(try await handle(request))
        return .success
    } catch let failure as HelperFailure {
        let message: String
        let exitCode: HelperExitCode
        switch failure {
        case let .invalidInput(value):
            message = value
            exitCode = .invalidInput
        case let .runtime(value):
            message = value
            exitCode = .success
        }
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: exitCode == .invalidInput ? "invalid_input" : "runtime_failure",
            message: message,
            xcodeStatus: resolveXcodeStatus(),
            userMessageCode: exitCode == .invalidInput ? nil : .appleNativeHelperFailed,
            diagnostic: message
        ))
        return exitCode
    } catch is DecodingError {
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: "invalid_json",
            message: "Request JSON does not match the Apple Native Translation helper envelope.",
            xcodeStatus: resolveXcodeStatus()
        ))
        return .invalidInput
    } catch {
        let message = error.localizedDescription
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: "runtime_failure",
            message: message,
            xcodeStatus: resolveXcodeStatus(),
            userMessageCode: .appleNativeHelperFailed,
            diagnostic: String(describing: error)
        ))
        return .runtimeFailure
    }
}

exit(await run().rawValue)
