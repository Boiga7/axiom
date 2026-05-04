---
type: concept
category: qa
para: resource
tags: [mobile-testing, appium, xcuitest, espresso, browserstack]
sources: []
updated: 2026-05-01
tldr: "Testing native iOS/Android apps and mobile web. Different from web testing: platform APIs, gestures, device fragmentation, permissions, network conditions, and battery state all affect behaviour."
---

# Mobile Testing

Testing native iOS/Android apps and mobile web. Different from web testing: platform APIs, gestures, device fragmentation, permissions, network conditions, and battery state all affect behaviour.

---

## Mobile Testing Types

| Type | Tool | When |
|---|---|---|
| Unit (component) | XCTest, JUnit, Robolectric | Logic, view model, data layer |
| Integration | XCUITest (iOS), Espresso (Android) | UI flows on device/simulator |
| Cross-platform | Appium, Detox | Both platforms from one test suite |
| Cloud device lab | BrowserStack, AWS Device Farm, Firebase Test Lab | Real device coverage |
| Exploratory | Manual on physical devices | Touch feel, biometrics, real-world conditions |

---

## Appium

WebDriver-protocol automation for iOS and Android from one codebase. Supports Python, JS, Java.

```python
# Python + Appium — login flow on Android
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = UiAutomator2Options()
options.platform_name = "Android"
options.device_name = "emulator-5554"
options.app = "/path/to/myapp.apk"
options.automation_name = "UiAutomator2"
options.no_reset = False

driver = webdriver.Remote("http://localhost:4723", options=options)
wait = WebDriverWait(driver, 10)

try:
    wait.until(EC.presence_of_element_located((AppiumBy.ID, "com.myapp:id/email")))
    driver.find_element(AppiumBy.ID, "com.myapp:id/email").send_keys("user@example.com")
    driver.find_element(AppiumBy.ID, "com.myapp:id/password").send_keys("password123")
    driver.find_element(AppiumBy.ID, "com.myapp:id/login_button").click()

    wait.until(EC.presence_of_element_located((AppiumBy.ID, "com.myapp:id/home_screen")))
    assert driver.find_element(AppiumBy.ID, "com.myapp:id/welcome_text").is_displayed()
finally:
    driver.quit()
```

---

## XCUITest (iOS Native)

Apple's built-in framework. Runs in the same process as the app on simulator/device.

```swift
// LoginTests.swift
import XCTest

class LoginTests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    func testSuccessfulLogin() throws {
        let emailField = app.textFields["email-field"]
        XCTAssert(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText("user@example.com")

        app.secureTextFields["password-field"].tap()
        app.secureTextFields["password-field"].typeText("password123")

        app.buttons["Login"].tap()

        XCTAssert(app.staticTexts["Welcome"].waitForExistence(timeout: 5))
    }

    func testBiometricLogin() throws {
        app.buttons["Use Face ID"].tap()
        // Simulate biometric match in simulator
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        springboard.buttons["Matching Face"].tap()
        XCTAssert(app.staticTexts["Welcome"].waitForExistence(timeout: 5))
    }
}
```

---

## Espresso (Android Native)

Google's UI testing framework for Android. Synchronises with main thread automatically. No explicit waits needed.

```kotlin
// LoginTest.kt
@RunWith(AndroidJUnit4::class)
class LoginTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(LoginActivity::class.java)

    @Test
    fun successfulLogin() {
        onView(withId(R.id.email)).perform(typeText("user@example.com"), closeSoftKeyboard())
        onView(withId(R.id.password)).perform(typeText("password123"), closeSoftKeyboard())
        onView(withId(R.id.login_button)).perform(click())

        onView(withId(R.id.home_screen)).check(matches(isDisplayed()))
    }

    @Test
    fun showsErrorForInvalidCredentials() {
        onView(withId(R.id.email)).perform(typeText("wrong@example.com"))
        onView(withId(R.id.password)).perform(typeText("wrongpassword"))
        onView(withId(R.id.login_button)).perform(click())

        onView(withText("Invalid credentials")).check(matches(isDisplayed()))
    }
}
```

---

## BrowserStack / AWS Device Farm

Real device cloud testing. Run Appium scripts across 3,000+ real device/OS combinations without owning hardware.

```python
# BrowserStack Appium
options = UiAutomator2Options()
options.platform_name = "Android"
options.set_capability("bstack:options", {
    "deviceName": "Samsung Galaxy S23",
    "osVersion": "13.0",
    "projectName": "MyApp",
    "buildName": "CI Build #123",
    "sessionName": "Login Flow",
    "userName": os.environ["BROWSERSTACK_USERNAME"],
    "accessKey": os.environ["BROWSERSTACK_ACCESS_KEY"],
    "networkLogs": True,
    "video": True,
})

driver = webdriver.Remote(
    "https://hub-cloud.browserstack.com/wd/hub",
    options=options,
)
```

```yaml
# GitHub Actions with BrowserStack
- name: Run mobile tests on BrowserStack
  env:
    BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
    BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
  run: pytest tests/mobile/ --html=report.html
```

---

## Mobile-Specific Test Scenarios

- **Network conditions** — test on 3G, 4G, offline (Charles Proxy, Network Link Conditioner)
- **Interruptions** — incoming call, notification, low battery while completing a transaction
- **Permissions** — deny camera/location permission mid-flow
- **Orientation** — rotate during a multi-step form
- **Deep links** — app opens from push notification or external URL
- **App backgrounding** — background mid-flow, foreground, verify state preserved
- **OTA updates** — what happens if app updates while user is on a screen

---

## Common Failure Cases

**Appium tests pass on emulator but fail on real devices due to element ID differences**
Why: resource IDs on emulators can differ from those on physical devices, especially across manufacturer skins (Samsung One UI, MIUI).
Detect: tests green in CI against emulator-5554 but fail when run via BrowserStack on Samsung Galaxy devices.
Fix: use accessibility IDs or content descriptions as locators instead of resource IDs; validate the locator strategy against at least two real-device OEMs before adding to the suite.

**XCUITest simulator tests miss biometric and permission dialogs**
Why: the simulator handles Face ID and permission dialogs differently than physical devices; tests that tap through dialogs on simulator silently skip the system alert on device.
Detect: `testBiometricLogin` passes on simulator but hangs or fails on a physical iPhone in BrowserStack.
Fix: add explicit handling for system alerts (`addUIInterruptionMonitor`) and use `XCUIApplication(bundleIdentifier: "com.apple.springboard")` only for simulator; gate biometric tests to run on physical device farms only.

**Network condition tests not representative — always run on fast Wi-Fi**
Why: CI and local emulators default to full-speed networking; mobile-specific failure modes (3G latency, offline mid-transaction) are never exercised.
Detect: app receives production crash reports for `SocketTimeoutException` under LTE conditions not seen in testing.
Fix: add at least one test run using Network Link Conditioner or BrowserStack's network profiles set to "3G - Good" and verify the app shows a graceful loading or retry state.

**App state not reset between tests — bleed-over causes flaky order**
Why: `no_reset: False` is only set in some configurations; prior test data (login session, partially filled forms) leaks into the next test.
Detect: tests pass individually but fail in batch runs; failure order changes between runs.
Fix: set `no_reset: False` and `full_reset: True` in the Appium options fixture, or implement a `clear_app_data()` helper called in `tearDown`; confirm each test starts from a clean install state.

**Orientation change during multi-step form loses state silently**
Why: Android activity restarts on rotation by default; if the fragment doesn't save and restore `ViewModel` state, form data is lost without an error message.
Detect: rotate the device on step 2 of checkout; verify step 2 data is still populated after rotation.
Fix: write a dedicated rotation test using `driver.rotate(ScreenOrientation.LANDSCAPE)` mid-form; fix the ViewModel to use `SavedStateHandle` if state is lost.

## Connections
[[qa-hub]] · [[qa/cross-browser-testing]] · [[qa/test-environments]] · [[technical-qa/browser-automation-patterns]] · [[technical-qa/test-architecture]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?
