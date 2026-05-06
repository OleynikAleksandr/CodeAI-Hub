import XCTest

final class AppleSpeechHelperFixtureTests: XCTestCase {
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
        if let explicit = ProcessInfo.processInfo.environment["APPLE_SPEECH_HELPER_EXECUTABLE"],
           explicit.isEmpty == false
        {
            return explicit
        }

        return packageRoot
            .appendingPathComponent(".build")
            .appendingPathComponent("release")
            .appendingPathComponent("apple-speech-helper")
            .path
    }

    private var liveTestsEnabled: Bool {
        ProcessInfo.processInfo.environment["APPLE_SPEECH_HELPER_RUN_LIVE_TESTS"] == "1"
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

    func testPreflightReportsAvailableVoiceInventory() throws {
        let result = try runHelper(input: #"{"command":"preflight","requestId":"speech-preflight"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["requestId"] as? String, "speech-preflight")
        XCTAssertEqual(result.json["userMessageCode"] as? String, "apple_speech_ready")
        XCTAssertGreaterThan(result.json["voiceCount"] as? Int ?? 0, 0)
    }

    func testVoicesReturnsVoiceList() throws {
        let result = try runHelper(input: #"{"command":"voices","requestId":"speech-voices"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["requestId"] as? String, "speech-voices")
        XCTAssertGreaterThan((result.json["voices"] as? [Any])?.count ?? 0, 0)
    }

    func testSpeakRejectsMissingTextAndClampsRate() throws {
        let result = try runHelper(
            input: #"{"command":"speak","requestId":"speech-speak","id":"message-1","text":"   ","rate":9.0}"#
        )

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, false)
        XCTAssertEqual(result.json["errorCode"] as? String, "text_missing")
        XCTAssertEqual(result.json["id"] as? String, "message-1")
        XCTAssertEqual(result.json["normalizedRate"] as? Double, 2.0)
        XCTAssertEqual(result.json["userMessageCode"] as? String, "apple_speech_text_missing")
    }

    func testSpeakDryRunInfersRussianVoiceLanguageFromText() throws {
        let result = try runHelper(
            input: #"{"command":"speak","requestId":"speech-ru","id":"message-ru","text":"Сейчас проверяем русскую озвучку.","rate":1.0}"#,
            environment: ["APPLE_SPEECH_HELPER_DRY_RUN": "1"]
        )

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["id"] as? String, "message-ru")
        XCTAssertEqual(result.json["resolvedLanguage"] as? String, "ru-RU")
        XCTAssertNotNil(result.json["voiceIdentifier"] as? String)
    }

    func testStopReturnsIdleWhenNoPersistentSpeechProcessIsActive() throws {
        let result = try runHelper(input: #"{"command":"stop","requestId":"speech-stop","id":"message-1"}"#)

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["helperStatus"] as? String, "idle")
        XCTAssertEqual(result.json["id"] as? String, "message-1")
    }

    func testSpeakCompletesWhenLiveTestsAreEnabled() throws {
        try XCTSkipUnless(
            liveTestsEnabled,
            "Set APPLE_SPEECH_HELPER_RUN_LIVE_TESTS=1 to exercise audible AVSpeechSynthesizer output."
        )

        let result = try runHelper(
            input: #"{"command":"speak","requestId":"speech-live","id":"message-live","text":"CodeAI Hub speech test.","language":"en-US","rate":1.0}"#
        )

        XCTAssertEqual(result.exitCode, 0)
        XCTAssertEqual(result.json["ok"] as? Bool, true)
        XCTAssertEqual(result.json["id"] as? String, "message-live")
        XCTAssertEqual(result.json["normalizedRate"] as? Double, 1.0)
    }

    private func runHelper(
        input: String?,
        environment: [String: String] = [:]
    ) throws -> HelperRun {
        try XCTSkipUnless(
            FileManager.default.isExecutableFile(atPath: helperExecutable),
            "Set APPLE_SPEECH_HELPER_EXECUTABLE or run scripts/build-apple-speech-helper.sh before fixture tests."
        )

        let process = Process()
        let stdout = Pipe()
        let stdin = Pipe()
        process.executableURL = URL(fileURLWithPath: helperExecutable)
        process.environment = ProcessInfo.processInfo.environment.merging(environment) { _, next in next }
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
