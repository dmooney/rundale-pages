# Failed: RundaleUITests/ZZThrowawayFailUITests/testDeliberateFailure()

- Result bundle: `mobile/.verification/xcresults/simulator-combined-20261025T234211067716Z.xcresult` (open with Xcode, or `xcrun xcresulttool`)
- Device: Goblin2-QA-Expo-20260912-171339 (iOS Simulator 26.5)
- Duration: 4.6s

## Failure messages

- ZZThrowawayFailUITests.swift:9: XCTAssertTrue failed - deliberate failure

## Timeline before the failure

```
+   0.00s Start Test at 2026-10-25 19:45:31.687
+   0.01s   kXCTAttachmentScreenRecording
+   0.01s Set Up
+   0.01s Open com.rundale.mobile
+   0.01s   Launch com.rundale.mobile
+   0.22s     Setting up automation session
+   0.63s     Wait for com.rundale.mobile to idle
+   1.89s Waiting 3.0s for "status.header" Other to exist
+   2.93s   Checking `Expect predicate `existsNoRetry == 1` for object "status.header" Other`
+   2.93s     Checking existence of `"status.header" Other`
+   2.96s Waiting 1.0s for "does.not.exist" Button to exist
+   3.97s   Checking `Expect predicate `existsNoRetry == 1` for object "does.not.exist" Button`
+   3.97s     Checking existence of `"does.not.exist" Button`
+   3.98s     Debug description for `"does.not.exist" Button`
+   3.98s     Capturing element debug description
+   3.98s   Checking existence of `"does.not.exist" Button`
+   4.00s Collecting debug information to assist test failure triage
+   4.00s   Requesting snapshot of accessibility hierarchy for app with pid 24050
+   4.02s   App UI hierarchy for com.rundale.mobile
+   4.02s   kXCTAttachmentLegacySnapshot
+   4.02s XCTAssertTrue failed - deliberate failure  <-- FAILURE
            ZZThrowawayFailUITests.testDeliberateFailure()
+   4.02s Requesting snapshot of accessibility hierarchy for app with pid 24050
+   4.09s Requesting snapshot of accessibility hierarchy for app with pid 24050
+   4.11s Added attachment named 'Failure: UI hierarchy'
+   4.11s   Failure: UI hierarchy
+   4.11s Find the Target Application 'com.rundale.mobile'
+   4.18s Added attachment named 'Failure: screenshot'
+   4.18s   Failure: screenshot
+   4.40s Tear Down
```

## Attachments

- `Screen_Recording_2026-10-25_at_07.45.31_PM.mp4`
- `Debug_description_for_does.not.exist_Button.txt`
- `App_UI_hierarchy_for_com.rundale.txt`
- `UI_Snapshot_2026-10-25_at_07.45.bin`
- `Failure_UI_hierarchy.txt`
- `Failure_screenshot.png`

## Runner and crash logs

- `mobile/.verification/failures/20261025T234211067716Z/diagnostics`
