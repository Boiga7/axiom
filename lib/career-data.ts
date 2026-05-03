export type WikiRef = {
  category: string
  slug: string
  label: string
}

export type RequirementArea = {
  id: string
  label: string
  description: string
  pages: WikiRef[]
  accent: 'cyan' | 'violet' | 'rose' | 'amber' | 'emerald' | 'sky'
}

export type Prerequisite = {
  id: string
  label: string
  detail: string
}

export type BoardCriterion = {
  id: string
  label: string
  detail: string
}

export type Certification = {
  id: string
  label: string
  code: string
  level: string
  detail: string
  studySlug?: string
}

export const PROMOTION_TARGET = {
  role: 'Senior Technical Consultant',
  grade: 2,
  company: 'Resillion',
  boardDate: '2027-01-15',
  effectiveDate: '2027-04-01',
} as const

export const REQUIREMENT_AREAS: RequirementArea[] = [
  {
    id: 'test-strategy',
    label: 'Test Strategy & Planning',
    description: 'Create Test Strategies, Test Plans; review test scripts and requirements.',
    accent: 'cyan',
    pages: [
      { category: 'qa', slug: 'test-strategy', label: 'Test Strategy' },
      { category: 'qa', slug: 'test-planning', label: 'Test Planning' },
      { category: 'qa', slug: 'test-case-design', label: 'Test Case Design' },
      { category: 'qa', slug: 'regression-testing', label: 'Regression Testing' },
      { category: 'qa', slug: 'test-data-management', label: 'Test Data Management' },
      { category: 'qa', slug: 'test-environments', label: 'Test Environments' },
      { category: 'qa', slug: 'test-estimation', label: 'Test Estimation' },
      { category: 'qa', slug: 'uat-governance', label: 'UAT Governance' },
      { category: 'qa', slug: 'release-sign-off', label: 'Release Sign-Off' },
      { category: 'qa', slug: 'uat', label: 'UAT' },
    ],
  },
  {
    id: 'performance-testing',
    label: 'Performance & Load Testing',
    description: 'Manage progress reports for Performance Testing; assess client test capability.',
    accent: 'violet',
    pages: [
      { category: 'technical-qa', slug: 'performance-testing', label: 'Performance Testing' },
      { category: 'technical-qa', slug: 'load-testing-advanced', label: 'Load Testing Advanced' },
      { category: 'technical-qa', slug: 'api-performance-testing', label: 'API Performance Testing' },
      { category: 'qa', slug: 'performance-testing-qa', label: 'Performance Testing QA' },
      { category: 'qa', slug: 'performance-test-reporting', label: 'Performance Test Reporting' },
      { category: 'technical-qa', slug: 'performance-capacity-planning', label: 'Performance Capacity Planning' },
      { category: 'technical-qa', slug: 'jmeter', label: 'JMeter' },
    ],
  },
  {
    id: 'api-contract-testing',
    label: 'API & Contract Testing',
    description: 'Expert in multiple test tool types — API and contract testing.',
    accent: 'violet',
    pages: [
      { category: 'technical-qa', slug: 'api-testing', label: 'API Testing' },
      { category: 'technical-qa', slug: 'contract-testing', label: 'Contract Testing' },
      { category: 'technical-qa', slug: 'api-testing-advanced', label: 'API Testing Advanced' },
      { category: 'technical-qa', slug: 'graphql-testing', label: 'GraphQL Testing' },
      { category: 'technical-qa', slug: 'mock-strategies', label: 'Mock Strategies' },
      { category: 'technical-qa', slug: 'websocket-testing', label: 'WebSocket Testing' },
    ],
  },
  {
    id: 'cicd-quality-gates',
    label: 'CI/CD Quality Gates',
    description: 'Influence policy and strategy on client site; integrate quality into delivery pipelines.',
    accent: 'emerald',
    pages: [
      { category: 'technical-qa', slug: 'ci-cd-quality-gates', label: 'CI/CD Quality Gates' },
      { category: 'cloud', slug: 'github-actions', label: 'GitHub Actions' },
      { category: 'cs-fundamentals', slug: 'cicd-pipelines', label: 'CI/CD Pipelines' },
      { category: 'qa', slug: 'continuous-testing', label: 'Continuous Testing' },
      { category: 'technical-qa', slug: 'test-reporting-dashboards', label: 'Test Reporting Dashboards' },
      { category: 'technical-qa', slug: 'docker-ci-testing', label: 'Docker in CI Testing' },
      { category: 'cloud', slug: 'gitops-quality-gates', label: 'GitOps Quality Gates' },
      { category: 'technical-qa', slug: 'flaky-test-management', label: 'Flaky Test Management' },
    ],
  },
  {
    id: 'qa-leadership',
    label: 'QA Leadership & Metrics',
    description: 'Manage multiple test streams; manage risk; improve metrics; own Process Improvement Model.',
    accent: 'cyan',
    pages: [
      { category: 'qa', slug: 'qa-leadership', label: 'QA Leadership' },
      { category: 'qa', slug: 'qa-metrics', label: 'QA Metrics' },
      { category: 'qa', slug: 'risk-based-testing', label: 'Risk-Based Testing' },
      { category: 'qa', slug: 'qa-in-devops', label: 'QA in DevOps' },
      { category: 'qa', slug: 'root-cause-analysis', label: 'Root Cause Analysis' },
      { category: 'qa', slug: 'qa-change-management', label: 'QA Change Management' },
      { category: 'qa', slug: 'risk-based-test-selection', label: 'Risk-Based Test Selection' },
    ],
  },
  {
    id: 'test-automation',
    label: 'Test Automation Tools',
    description: 'Expert in five or more technical test tools of different types.',
    accent: 'violet',
    pages: [
      { category: 'test-automation', slug: 'playwright', label: 'Playwright (Web UI)' },
      { category: 'test-automation', slug: 'selenium', label: 'Selenium (Web UI)' },
      { category: 'test-automation', slug: 'pytest-patterns', label: 'Pytest (Framework)' },
      { category: 'technical-qa', slug: 'postman-newman', label: 'Postman / Newman (API)' },
      { category: 'technical-qa', slug: 'wiremock', label: 'WireMock (Service Virtualisation)' },
      { category: 'technical-qa', slug: 'playwright-advanced', label: 'Playwright Advanced' },
      { category: 'technical-qa', slug: 'self-healing-tests', label: 'Self-Healing Tests' },
      { category: 'technical-qa', slug: 'visual-testing', label: 'Visual Testing' },
      { category: 'technical-qa', slug: 'accessibility-automation', label: 'Accessibility Automation' },
    ],
  },
  {
    id: 'security-testing',
    label: 'Security Testing',
    description: 'Broaden test capability scope; assess and identify security risks on client systems.',
    accent: 'rose',
    pages: [
      { category: 'qa', slug: 'security-testing-qa', label: 'Security Testing QA' },
      { category: 'technical-qa', slug: 'security-automation', label: 'Security Automation' },
      { category: 'security', slug: 'red-teaming', label: 'Red Teaming' },
      { category: 'security', slug: 'oauth-boundary-testing', label: 'OAuth Boundary Testing' },
      { category: 'security', slug: 'prompt-injection', label: 'Prompt Injection' },
      { category: 'security', slug: 'owasp-wstg', label: 'OWASP WSTG' },
      { category: 'security', slug: 'threat-modelling', label: 'Threat Modelling' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability & Monitoring',
    description: 'Ensure effective quality assurance; monitor production quality and system health.',
    accent: 'sky',
    pages: [
      { category: 'observability', slug: 'platforms', label: 'Observability Platforms' },
      { category: 'cloud', slug: 'cloud-monitoring', label: 'Cloud Monitoring' },
      { category: 'technical-qa', slug: 'test-observability', label: 'Test Observability' },
      { category: 'qa', slug: 'production-monitoring-qa', label: 'Production Monitoring QA' },
      { category: 'observability', slug: 'tracing', label: 'Tracing' },
      { category: 'qa', slug: 'slo-sla-quality', label: 'SLO / SLA Quality' },
      { category: 'observability', slug: 'datadog', label: 'Datadog' },
    ],
  },
  {
    id: 'ai-tools',
    label: 'AI in Testing',
    description: 'Identify new tools; bring AI-assisted testing as a differentiator on client sites.',
    accent: 'amber',
    pages: [
      { category: 'qa', slug: 'ai-testing', label: 'AI Testing' },
      { category: 'ai-tools', slug: 'claude-code', label: 'Claude Code' },
      { category: 'ai-tools', slug: 'cursor-copilot', label: 'Cursor / Copilot' },
      { category: 'ai-tools', slug: 'aider', label: 'Aider' },
      { category: 'test-automation', slug: 'testing-llm-apps', label: 'Testing LLM Apps' },
      { category: 'ai-tools', slug: 'ai-test-generation', label: 'AI Test Generation' },
    ],
  },
  {
    id: 'process-improvement',
    label: 'Process Improvement (PIM)',
    description: 'Build measurable, benefits-driven improvements roadmaps utilising the Process Improvement Model.',
    accent: 'emerald',
    pages: [
      { category: 'qa', slug: 'process-improvement-model', label: 'Process Improvement Model' },
      { category: 'qa', slug: 'test-automation-strategy', label: 'Test Automation Strategy' },
      { category: 'qa', slug: 'defect-prevention', label: 'Defect Prevention' },
      { category: 'qa', slug: 'shift-left-testing', label: 'Shift-Left Testing' },
      { category: 'qa', slug: 'agile-qa', label: 'Agile QA' },
      { category: 'qa', slug: 'benefits-realisation', label: 'Benefits Realisation' },
    ],
  },
]

export const PREREQUISITES: Prerequisite[] = [
  {
    id: 'technical-skills',
    label: 'Expert range of technical testing skills',
    detail: 'Deep expertise across multiple testing disciplines, not just one tool.',
  },
  {
    id: 'relationships',
    label: 'Working relationships across clients, peers, industry',
    detail: 'Established contacts; maintain and grow relationships proactively.',
  },
  {
    id: 'client-understanding',
    label: 'Thorough understanding of client challenges',
    detail: 'Identify opportunities for Resillion; follow up where appropriate.',
  },
  {
    id: 'five-tools',
    label: 'Expert in five or more test tools (different types)',
    detail: 'Playwright, Selenium, pytest, k6, Postman/Newman — minimum five, different categories.',
  },
  {
    id: 'leadership',
    label: 'Leadership, mentoring, interpersonal & decision-making skills',
    detail: 'Evidence of leading people, resolving conflicts, making client-impacting decisions.',
  },
  {
    id: 'certification',
    label: 'Achieve certification in agreed test',
    detail: 'AWS Cloud Practitioner + AWS AI Practitioner — agreed with delivery manager.',
  },
]

export const BOARD_CRITERIA: BoardCriterion[] = [
  {
    id: 'responsibilities',
    label: 'Meeting responsibilities & prerequisites',
    detail: 'Evidence you are already operating at Grade 2 level — not aiming for it.',
  },
  {
    id: 'values',
    label: 'Displaying core values',
    detail: 'How your behaviours reflect and reinforce Resillion culture.',
  },
  {
    id: 'client-value',
    label: 'Added value to a client',
    detail: 'Specific, measurable examples — what changed, what improved, what was saved.',
  },
  {
    id: 'business-initiatives',
    label: 'Supporting Resillion business initiatives',
    detail: 'Bids, marketing material, developing new service offerings or collateral.',
  },
  {
    id: 'strategic-alignment',
    label: 'Alignment to organisational strategic direction',
    detail: 'How your work and behaviours serve where Resillion is heading.',
  },
]

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'aws-cloud-practitioner',
    label: 'AWS Certified Cloud Practitioner',
    code: 'CLF-C02',
    level: 'Foundation',
    detail: 'Cloud concepts, core AWS services, security, pricing and billing. Entry point for the AWS certification path.',
    studySlug: 'aws-cloud-practitioner',
  },
  {
    id: 'aws-ai-practitioner',
    label: 'AWS Certified AI Practitioner',
    code: 'AIF-C01',
    level: 'Foundation',
    detail: 'AI/ML and generative AI concepts, AWS AI services, and responsible AI practices.',
    studySlug: 'aws-ai-practitioner',
  },
]

export function getDaysUntilBoard(): number {
  const board = new Date('2027-01-15')
  const today = new Date()
  return Math.max(0, Math.floor((board.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
}
