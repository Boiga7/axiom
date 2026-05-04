---
type: concept
category: technical-qa
para: resource
tags: [hub, technical-qa, brain]
sources: []
updated: 2026-05-04
tldr: Central hub for all test automation and technical quality engineering knowledge. Every page in the Technical QA brain connects here.
---

# Technical QA Brain

Central hub for all test automation and technical quality engineering knowledge. Every page in the Technical QA brain connects here.

---

## Test Architecture and Design
[[technical-qa/test-architecture]] · [[technical-qa/contract-testing]] · [[technical-qa/flaky-test-management]] · [[technical-qa/mutation-testing]]

## Automation Frameworks
[[technical-qa/playwright-advanced]] · [[technical-qa/cypress]] · [[test-automation/playwright]] · [[test-automation/selenium]] · [[test-automation/pytest-patterns]] · [[test-automation/testing-llm-apps]] · [[technical-qa/pytest-advanced]] · [[technical-qa/parallel-test-execution]] · [[technical-qa/e2e-framework-design]]

## Non-Functional Testing
[[technical-qa/performance-testing]] · [[technical-qa/api-testing]] · [[technical-qa/visual-testing]]

## Service Virtualisation and Containers
[[technical-qa/wiremock]] · [[technical-qa/testcontainers]] · [[technical-qa/database-testing]] · [[technical-qa/docker-ci-testing]]

## Security and Advanced
[[technical-qa/security-automation]] · [[technical-qa/chaos-engineering]] · [[technical-qa/infrastructure-testing]]

## Load and Performance
[[technical-qa/load-testing-advanced]] · [[technical-qa/performance-testing]] · [[technical-qa/api-performance-testing]] · [[technical-qa/jmeter]] · [[technical-qa/performance-capacity-planning]]

## Mocking and Specialised
[[technical-qa/mock-strategies]] · [[technical-qa/graphql-testing]] · [[technical-qa/ci-cd-quality-gates]] · [[technical-qa/browser-automation-patterns]] · [[technical-qa/test-reporting-dashboards]] · [[technical-qa/postman-newman]] · [[technical-qa/api-testing-advanced]] · [[technical-qa/test-observability]] · [[technical-qa/selenium-grid]] · [[technical-qa/websocket-testing]] · [[technical-qa/self-healing-tests]]

## Contract and Accessibility
[[technical-qa/api-contract-testing]] · [[technical-qa/accessibility-automation]]

## Data Generation
[[technical-qa/test-data-generation]]
## Connections

- [[technical-qa/test-architecture]] — foundational design decisions that all other pages build on
- [[technical-qa/ci-cd-quality-gates]] — the integration point where test results become deployment decisions
- [[technical-qa/flaky-test-management]] — cross-cutting concern that affects every automation framework in this brain
- [[technical-qa/self-healing-tests]] — maintenance strategy for long-lived Selenium and Playwright suites
- [[technical-qa/performance-capacity-planning]] — bridges load testing results to infrastructure procurement

## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?
