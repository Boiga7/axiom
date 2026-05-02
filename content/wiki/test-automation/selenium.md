---
type: concept
category: test-automation
tags: [selenium, webdriver, automation, testing, page-object, python, java]
sources: []
updated: 2026-04-29
para: resource
tldr: Selenium is the W3C WebDriver standard for browser automation — prefer Playwright for new projects; use Selenium when maintaining legacy suites or requiring IE/Safari; explicit waits are mandatory, implicit waits interact badly with them.
---

# Selenium

> **TL;DR** Selenium is the W3C WebDriver standard for browser automation — prefer Playwright for new projects; use Selenium when maintaining legacy suites or requiring IE/Safari; explicit waits are mandatory, implicit waits interact badly with them.

The original browser automation framework. W3C WebDriver protocol, supports all major browsers, available in Python, Java, C#, JavaScript. Widely used in enterprise and legacy test suites. For new projects, prefer [[test-automation/playwright]]. It's faster, more reliable, and has better async support. Use Selenium when you're maintaining existing suites or need IE/Safari compatibility.

---

## Setup

```bash
# Python
pip install selenium webdriver-manager

# Java (Gradle)
# testImplementation 'org.seleniumhq.selenium:selenium-java:4.18.1'
```

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.python import ChromeDriverManager

# Auto-download and configure ChromeDriver
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
driver.implicitly_wait(10)  # seconds — applies globally
driver.get("https://example.com")

# Always quit to release resources
driver.quit()
```

---

## Locator Strategies

Prefer in order: ID > name > CSS > XPath. XPath is powerful but fragile and slow.

```python
from selenium.webdriver.common.by import By

# ID (fastest, most stable)
element = driver.find_element(By.ID, "submit-button")

# Name attribute
element = driver.find_element(By.NAME, "email")

# CSS selector
element = driver.find_element(By.CSS_SELECTOR, "button.primary-btn")
element = driver.find_element(By.CSS_SELECTOR, "#form input[type='text']")

# XPath (use sparingly)
element = driver.find_element(By.XPATH, "//button[contains(text(), 'Submit')]")

# Multiple elements
buttons = driver.find_elements(By.CSS_SELECTOR, "button")
```

---

## Explicit Waits (Required Pattern)

Never use `time.sleep()`. Always use explicit waits.

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

wait = WebDriverWait(driver, timeout=10)

# Wait for element to be visible
element = wait.until(EC.visibility_of_element_located((By.ID, "result")))

# Wait for element to be clickable
button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.submit")))
button.click()

# Wait for text to appear
wait.until(EC.text_to_be_present_in_element((By.ID, "status"), "Success"))

# Wait for URL to change
wait.until(EC.url_contains("/dashboard"))

# Custom condition
wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, ".result-item")) >= 3)
```

`implicitly_wait` applies globally but interacts badly with explicit waits — use one or the other, not both.

---

## Interactions

```python
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

# Click
driver.find_element(By.ID, "button").click()

# Type
input_el = driver.find_element(By.NAME, "search")
input_el.clear()
input_el.send_keys("machine learning")
input_el.send_keys(Keys.RETURN)

# Select dropdown
from selenium.webdriver.support.ui import Select
select = Select(driver.find_element(By.ID, "country"))
select.select_by_visible_text("United Kingdom")
select.select_by_value("UK")

# Hover
actions = ActionChains(driver)
actions.move_to_element(driver.find_element(By.ID, "menu")).perform()

# Drag and drop
source = driver.find_element(By.ID, "draggable")
target = driver.find_element(By.ID, "droppable")
actions.drag_and_drop(source, target).perform()

# File upload
file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
file_input.send_keys("/absolute/path/to/file.pdf")

# JavaScript execution (fallback for tricky elements)
driver.execute_script("arguments[0].click();", element)
driver.execute_script("arguments[0].scrollIntoView();", element)
```

---

## Page Object Pattern

Encapsulate page structure so test logic is separate from selector details.

```python
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginPage:
    URL = "https://app.example.com/login"

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def open(self):
        self.driver.get(self.URL)
        return self

    def login(self, email: str, password: str):
        self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        self.driver.find_element(By.ID, "email").send_keys(email)
        self.driver.find_element(By.ID, "password").send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        return DashboardPage(self.driver)

class DashboardPage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.visibility_of_element_located((By.ID, "dashboard")))
            return True
        except Exception:
            return False

# Test
def test_login(driver):
    dashboard = LoginPage(driver).open().login("user@test.com", "password")
    assert dashboard.is_loaded()
```

---

## pytest Integration

```python
# conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture(scope="session")
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")

    d = webdriver.Chrome(options=options)
    d.implicitly_wait(5)
    yield d
    d.quit()

@pytest.fixture
def login(driver):
    """Fixture that logs in before each test."""
    LoginPage(driver).open().login("test@example.com", "testpass")
    yield driver
    # teardown: navigate away to reset state

# Test
def test_dashboard_shows_user_name(login):
    wait = WebDriverWait(login, 10)
    name = wait.until(EC.visibility_of_element_located((By.ID, "user-name")))
    assert "Test User" in name.text
```

---

## Selenium Grid

Run tests in parallel across multiple browsers/OS combinations:

```yaml
# docker-compose.yml for local Grid
services:
  selenium-hub:
    image: selenium/hub:4.18
    ports: ["4442:4442", "4443:4443", "4444:4444"]

  chrome:
    image: selenium/node-chrome:4.18
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
    deploy:
      replicas: 3  # 3 parallel Chrome instances

  firefox:
    image: selenium/node-firefox:4.18
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
```

```python
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

driver = webdriver.Remote(
    command_executor="http://localhost:4444",
    options=webdriver.ChromeOptions(),
)
```

---

## Java (Selenium 4)

```java
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class LoginTest {
    WebDriver driver;
    WebDriverWait wait;

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().maximize();
    }

    @Test
    void testLogin() {
        driver.get("https://app.example.com/login");

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")));
        driver.findElement(By.id("email")).sendKeys("user@test.com");
        driver.findElement(By.id("password")).sendKeys("password");
        driver.findElement(By.cssSelector("button[type='submit']")).click();

        wait.until(ExpectedConditions.urlContains("/dashboard"));
        assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) driver.quit();
    }
}
```

---

## Selenium vs Playwright

| Feature | Selenium | Playwright |
|---|---|---|
| Protocol | W3C WebDriver (slower) | CDP/WebSocket (faster) |
| Auto-wait | No (manual explicit waits) | Yes (built-in) |
| Async Python | Poor | First-class |
| Network mocking | Limited | Full |
| Trace/debugging | Limited | Trace viewer |
| Browser support | All + IE | Chromium/Firefox/Safari |
| Self-healing selectors | No | Healer agent v1.56 |
| Best for | Legacy suites, Java enterprise | New projects |

---

## Key Facts

- Protocol: W3C WebDriver (slower than Playwright's CDP/WebSocket)
- Locator priority: ID > name > CSS > XPath — XPath is powerful but fragile and slow
- Never use `time.sleep()` — always use `WebDriverWait` with `expected_conditions`
- `implicitly_wait` interacts badly with explicit waits — use one or the other, never both
- Python install: `pip install selenium webdriver-manager`; Java Gradle: `selenium-java:4.18.1`
- Page Object pattern: encapsulates selectors so test logic is separate from DOM structure
- Selenium Grid: parallel execution across browsers via Docker Hub images (selenium/hub, selenium/node-chrome)
- Selenium 4 uses W3C WebDriver natively — drop DesiredCapabilities for Options in new code

## Common Failure Cases

**Both `implicitly_wait` and `WebDriverWait` are set, causing flaky timeouts that are longer than expected**  
Why: Selenium's implicit wait applies globally to every `find_element` call; when an explicit wait polls the DOM and each poll also triggers the implicit wait, the effective timeout per poll cycle multiplies, making timeouts unpredictable and test runs slow.  
Detect: tests take 2–3x longer than expected; a 10-second explicit wait actually waits up to 10s × implicit_wait seconds in the worst case; removing one wait strategy makes timing consistent.  
Fix: pick one strategy and stick with it; use `WebDriverWait` + `expected_conditions` exclusively; set `driver.implicitly_wait(0)` explicitly to disable implicit waits.

**`driver.find_element(By.XPATH, "//button[contains(text(), 'Submit')]")` breaks when the button text changes or is translated**  
Why: XPath expressions that match on visible text are brittle; a copy change, whitespace difference, or i18n translation changes the string, silently breaking the selector without any code change.  
Detect: the test fails only after a UI copy update or in a locale-specific test run; the XPath targets a string that no longer matches the rendered DOM.  
Fix: locate by ID, `name` attribute, or a dedicated `data-testid`; reserve XPath for cases where no other locator is available, and prefer `@id` or `@data-testid` attributes over text content.

**`driver.quit()` is not called in the teardown, leaving Chrome processes running in CI**  
Why: if a test raises an unhandled exception before `driver.quit()` in a `finally` block, or the pytest `@pytest.fixture` teardown is omitted, the ChromeDriver process stays alive; on CI, accumulated zombie processes consume memory and eventually crash the runner.  
Detect: CI memory usage grows across test runs; `ps aux | grep chrome` shows multiple zombie processes; the build eventually fails with OOM or too many open files.  
Fix: always call `driver.quit()` after `yield` in the pytest fixture with a `try/finally` block; never rely on garbage collection to close the browser.

**`WebDriverWait` with `EC.text_to_be_present_in_element` matches stale text that is replaced by a loading spinner**  
Why: if the DOM temporarily contains the expected text during a loading transition before replacing it with a spinner, the wait condition returns immediately on the stale match; the subsequent assertion then fails because the spinner replaced the text.  
Detect: the test passes for the wait step but fails on the next assertion; the failure is timing-dependent and reproduces more reliably on slower machines.  
Fix: wait for a more specific condition — wait for the loading indicator to disappear first (`EC.invisibility_of_element_located`), then wait for the final text; or wait for a DOM attribute that only appears on the settled state.

## Connections

- [[test-automation/playwright]] — modern replacement for new projects; comparison table on this page
- [[test-automation/pytest-patterns]] — pytest conftest fixtures applicable to Selenium Python suites
- [[java/spring-ai]] — Java enterprise testing context where Selenium is most common

## Open Questions

- At what point does maintaining a Selenium suite become more expensive than migrating to Playwright?
- Does Selenium Grid still offer meaningful advantages over Playwright's built-in parallelism for cross-browser matrix testing?
- Is WebDriver BiDi (the successor to CDP bridging) going to close the gap between Selenium and Playwright's protocol performance?
