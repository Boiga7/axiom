---
type: concept
category: technical-qa
para: resource
tags: [browser-automation, playwright, selectors, network-interception, authentication, downloads]
sources: []
updated: 2026-05-01
tldr: Advanced Playwright patterns for real-world automation challenges.
---

# Browser Automation Patterns

Advanced Playwright patterns for real-world automation challenges.

---

## Authentication Patterns

```python
# Pattern 1: API login + cookie injection (fastest, most reliable)
@pytest.fixture(scope="session")
def auth_state(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Create auth state once per session; save to file for reuse."""
    state_path = tmp_path_factory.mktemp("auth") / "state.json"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # API login — never go through the UI login page in tests
        response = requests.post("http://localhost:8000/auth/token",
                                 json={"email": "test@example.com", "password": "Pass!"})
        token = response.json()["access_token"]

        # Set token as cookie (or localStorage — depends on your app)
        context.add_cookies([{
            "name": "auth_token", "value": token,
            "domain": "localhost", "path": "/",
            "httpOnly": True, "secure": False,
        }])

        context.storage_state(path=state_path)   # saves cookies + localStorage
        browser.close()

    return state_path

@pytest.fixture
def auth_page(browser: Browser, auth_state: Path) -> Page:
    """Page with pre-loaded auth state — no login needed."""
    context = browser.new_context(storage_state=auth_state)
    page = context.new_page()
    yield page
    page.close()
    context.close()
```

---

## Network Interception

```python
from playwright.sync_api import Page, Route, Request

# Mock an API endpoint
def test_shows_error_when_api_fails(page: Page) -> None:
    def handle_order_api(route: Route) -> None:
        if route.request.url.endswith("/api/orders"):
            route.fulfill(
                status=503,
                content_type="application/json",
                body='{"error": "Service unavailable"}',
            )
        else:
            route.continue_()

    page.route("**/api/**", handle_order_api)
    page.goto("http://localhost:3000/orders")

    expect(page.get_by_role("alert")).to_contain_text("Service unavailable")

# Record all API calls made during a test
def test_checkout_makes_expected_api_calls(page: Page) -> None:
    api_calls: list[str] = []

    def record_request(request: Request) -> None:
        if "/api/" in request.url:
            api_calls.append(f"{request.method} {request.url}")

    page.on("request", record_request)

    # Run the flow
    complete_checkout(page)

    assert "POST http://localhost:8000/api/orders" in api_calls
    assert "POST http://localhost:8000/api/payments" in api_calls
```

---

## Waiting Strategies

```python
# Never use page.wait_for_timeout() — use event-based waiting

# Wait for network idle (page fully loaded)
page.goto(url, wait_until="networkidle")

# Wait for a specific response
with page.expect_response("**/api/orders/**") as response_info:
    page.get_by_role("button", name="Place order").click()
response = response_info.value
assert response.ok

# Wait for a request to be made (e.g., verify analytics event fired)
with page.expect_request("**/analytics/event") as request_info:
    page.get_by_role("button", name="Sign up").click()
request = request_info.value
payload = request.post_data_json
assert payload["event"] == "signup_initiated"

# Wait for URL change after navigation
page.get_by_role("button", name="Place order").click()
page.wait_for_url("**/orders/**/confirmation", timeout=10_000)

# Wait for element to contain specific text (auto-retries for up to 5s)
expect(page.get_by_test_id("order-status")).to_have_text("Confirmed")
```

---

## Handling Dynamic Content

```python
# Infinite scroll — load more content
def load_all_items(page: Page, item_selector: str, max_items: int = 200) -> int:
    loaded = 0
    while True:
        items = page.query_selector_all(item_selector)
        if len(items) >= max_items or len(items) == loaded:
            break
        loaded = len(items)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(500)   # brief pause for content to load
    return len(page.query_selector_all(item_selector))

# Drag and drop (kanban boards, file upload areas)
def test_drag_card_to_column(page: Page) -> None:
    card = page.get_by_test_id("card-1")
    target_column = page.get_by_test_id("column-done")

    card.drag_to(target_column)

    expect(target_column.get_by_test_id("card-1")).to_be_visible()

# File download
def test_report_download(page: Page, tmp_path: Path) -> None:
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Download report").click()
    download = download_info.value
    download.save_as(tmp_path / download.suggested_filename)
    assert (tmp_path / download.suggested_filename).stat().st_size > 0

# File upload
def test_avatar_upload(page: Page, tmp_path: Path) -> None:
    test_image = tmp_path / "avatar.png"
    test_image.write_bytes(generate_test_image())   # tiny valid PNG

    page.get_by_label("Upload avatar").set_input_files(str(test_image))
    expect(page.get_by_test_id("avatar-preview")).to_be_visible()
```

---

## Iframe Handling

```python
# Access content inside an iframe (e.g., embedded payment forms)
def test_stripe_payment_form(page: Page) -> None:
    # Wait for iframe to load
    page.goto("http://localhost:3000/checkout")

    # Get frame by URL pattern
    stripe_frame = page.frame_locator("iframe[src*='stripe.com']")

    # Interact with elements inside the frame
    stripe_frame.get_by_placeholder("Card number").fill("4242424242424242")
    stripe_frame.get_by_placeholder("MM / YY").fill("12/28")
    stripe_frame.get_by_placeholder("CVC").fill("123")

    page.get_by_role("button", name="Pay").click()
    expect(page).to_have_url(re.compile(r"/confirmation"))
```

---

## Multi-Tab Handling

```python
def test_opens_order_in_new_tab(page: Page, context: BrowserContext) -> None:
    # Expect a new page to open when link is clicked
    with context.expect_page() as new_page_info:
        page.get_by_role("link", name="View order details").click()

    new_page = new_page_info.value
    new_page.wait_for_load_state()

    expect(new_page).to_have_url(re.compile(r"/orders/\w+"))
    expect(new_page.get_by_role("heading", name="Order Details")).to_be_visible()
```

---

## Accessibility Assertions

```python
from axe_playwright_python.sync_playwright import Axe

def test_checkout_page_accessible(page: Page) -> None:
    page.goto("http://localhost:3000/checkout")

    axe = Axe()
    results = axe.run(page)

    # Fail on critical and serious violations only
    critical_violations = [
        v for v in results.violations
        if v["impact"] in ("critical", "serious")
    ]
    assert not critical_violations, (
        f"Accessibility violations: "
        + "\n".join(f"[{v['impact']}] {v['id']}: {v['help']}" for v in critical_violations)
    )
```

---

## Connections

[[tqa-hub]] · [[technical-qa/playwright-advanced]] · [[technical-qa/e2e-framework-design]] · [[technical-qa/accessibility-automation]] · [[qa/end-to-end-testing]]
