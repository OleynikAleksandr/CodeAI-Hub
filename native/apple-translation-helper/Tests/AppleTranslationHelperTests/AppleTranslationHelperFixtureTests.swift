import XCTest

final class AppleTranslationHelperFixtureTests: XCTestCase {
    private struct HelperRun {
        let exitCode: Int32
        let json: [String: Any]
    }

    private var packageRoot: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
    }

    private var helperExecutable: String {
        if let explicit = ProcessInfo.processInfo.environment["APPLE_TRANSLATION_HELPER_EXECUTABLE"],
           explicit.isEmpty == false
        {
            return explicit
        }

        return packageRoot
            .appendingPathComponent(".build")
            .appendingPathComponent("release")
            .appendingPathComponent("apple-translation-helper")
            .path
    }

    private var liveTestsEnabled: Bool {
        ProcessInfo.processInfo.environment["APPLE_TRANSLATION_HELPER_RUN_LIVE_TESTS"] == "1"
    }

    func testRejectsEmptyStdinWithJsonError() throws {
        let result = try runHelper(input: nil)

        XCTAssertEqual(result.exitCode, 64)
        XCTAssertEqual(result.json["ok"] as? Bool, false)
        XCTAssertEqual(result.json["errorCode"] as? String, "invalid_input")
    }

    func testRejectsMalformedEnvelopeWithJsonError() throws {
        let result = try runHelper(input: #"{"command":"unknown"}"#)

        XCTAssertEqual(result.exitCode, 64)
        XCTAssertEqual(result.json["ok"] as? Bool, false)
        XCTAssertEqual(result.json["errorCode"] as? String, "invalid_json")
    }

    func testInstalledPairPreflightWhenLivePacksAreAvailable() throws {
        try skipUnlessLiveTestsEnabled()

        let result = try runHelper(input: #"{"command":"preflight","requestId":"test-installed","sourceLanguage":"en","targetLanguage":"ru"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["requestId"] as? String, "test-installed")
        XCTAssertEqual(result.json["languageStatus"] as? String, "installed")
        XCTAssertEqual(result.json["userMessageCode"] as? String, "apple_native_ready")
    }

    func testSupportedButMissingPackReturnsGuidanceWhenLiveTestsAreEnabled() throws {
        try skipUnlessLiveTestsEnabled()

        let result = try runHelper(input: #"{"command":"translate","requestId":"test-missing","sourceLanguage":"en","targetLanguage":"hi","text":"Hello"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, false)
        XCTAssertEqual(result.json["requestId"] as? String, "test-missing")
        XCTAssertEqual(result.json["languageStatus"] as? String, "supported_not_installed")
        XCTAssertEqual(result.json["userMessageCode"] as? String, "apple_native_language_pack_missing")
    }

    func testUnsupportedPairReturnsUnsupportedWhenLiveTestsAreEnabled() throws {
        try skipUnlessLiveTestsEnabled()

        let result = try runHelper(input: #"{"command":"availability","requestId":"test-unsupported","sourceLanguage":"en","targetLanguage":"zz"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, false)
        XCTAssertEqual(result.json["requestId"] as? String, "test-unsupported")
        XCTAssertEqual(result.json["languageStatus"] as? String, "unsupported")
        XCTAssertEqual(result.json["userMessageCode"] as? String, "apple_native_language_pair_unsupported")
    }

    func testTranslateAndBatchTranslateWhenLivePacksAreAvailable() throws {
        try skipUnlessLiveTestsEnabled()

        let single = try runHelper(input: #"{"command":"translate","requestId":"test-translate","sourceLanguage":"en","targetLanguage":"ru","text":"Hello world."}"#)
        XCTAssertEqual(single.exitCode, 0)
        XCTAssertEqual(single.json["ok"] as? Bool, true)
        XCTAssertEqual(single.json["languageStatus"] as? String, "installed")
        XCTAssertNotNil(single.json["translatedText"] as? String)

        let batch = try runHelper(input: #"{"command":"translateBatch","requestId":"test-batch","sourceLanguage":"en","targetLanguage":"uk","batch":["Hello world.","This is a batch test."]}"#)
        XCTAssertEqual(batch.exitCode, 0)
        XCTAssertEqual(batch.json["ok"] as? Bool, true)
        XCTAssertEqual(batch.json["languageStatus"] as? String, "installed")
        XCTAssertEqual((batch.json["translations"] as? [String])?.count, 2)
    }

    private func skipUnlessLiveTestsEnabled() throws {
        try XCTSkipUnless(
            liveTestsEnabled,
            "Set APPLE_TRANSLATION_HELPER_RUN_LIVE_TESTS=1 after building the helper and installing Apple Translation language packs."
        )
        try XCTSkipUnless(
            FileManager.default.isExecutableFile(atPath: helperExecutable),
            "Set APPLE_TRANSLATION_HELPER_EXECUTABLE or run scripts/build-apple-translation-helper.sh before live tests."
        )
    }

    private func runHelper(input: String?) throws -> HelperRun {
        let process = Process()
        let stdout = Pipe()
        let stdin = Pipe()
        process.executableURL = URL(fileURLWithPath: helperExecutable)
        process.standardOutput = stdout
        process.standardError = stdout
        process.standardInput = stdin

        try process.run()
        if let input {
            stdin.fileHandleForWriting.write(Data(input.utf8))
        }
        try stdin.fileHandleForWriting.close()
        process.waitUntilExit()

        let data = stdout.fileHandleForReading.readDataToEndOfFile()
        let object = try JSONSerialization.jsonObject(with: data)
        guard let json = object as? [String: Any] else {
            XCTFail("Helper output is not a JSON object: \(String(data: data, encoding: .utf8) ?? "")")
            return HelperRun(exitCode: process.terminationStatus, json: [:])
        }

        return HelperRun(exitCode: process.terminationStatus, json: json)
    }
}
