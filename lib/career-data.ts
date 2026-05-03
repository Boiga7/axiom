export type CoverageLevel = 'high' | 'medium' | 'low'

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
    pages: [
      { category: 'qa', slug: 'test-strategy', label: 'Test Strategy' },
      { category: 'qa', slug: 'test-planning', label: 'Test Planning' },
      { category: 'qa', slug: 'test-case-design', label: 'Test Case Design' },
      { category: 'qa', slug: 'regression-testing', label: 'Regression Testing' },
    ],
  },
  {
    id: 'performance-testing',
    label: 'Performance & Load Testing',
    description: 'Manage progress reports for Performance Testing; assess client test capability.',
    pages: [
      { category: 'technical-qa', slug: 'performance-testing', label: 'Performance Testing' },
      { category: 'technical-qa', slug: 'load-testing-advanced', label: 'Load Testing Advanced' },
      { category: 'technical-qa', slug: 'api-performance-testing', label: 'API Performance Testing' },
    ],
  },
  {
    id: 'api-contract-testing',
    label: 'API & Contract Testing',
    description: 'Expert in multiple test tool types — API and contract testing.',
    pages: [
      { category: 'technical-qa', slug: 'api-testing', label: 'API Testing' },
      { category: 'technical-qa', slug: 'contract-testing', label: 'Contract Testing' },
      { category: 'technical-qa', slug: 'api-testing-advanced', label: 'API Testing Advanced' },
      { category: 'technical-qa', slug: 'api-contract-testing', label: 'API Contract Testing' },
    ],
  },
  {
    id: 'cicd-quality-gates',
    label: 'CI/CD Quality Gates',
    description: 'Influence policy and strategy on client site; integrate quality into delivery pipelines.',
    pages: [
      { category: 'technical-qa', slug: 'ci-cd-quality-gates', label: 'CI/CD Quality Gates' },
      { category: 'cloud', slug: 'github-actions', label: 'GitHub Actions' },
      { category: 'cs-fundamentals', slug: 'cicd-pipelines', label: 'CI/CD Pipelines' },
    ],
  },
  {
    id: 'qa-leadership',
    label: 'QA Leadership & Metrics',
    description: 'Manage multiple test streams; manage risk; improve metrics; own Process Improvement Model.',
    pages: [
      { category: 'qa', slug: 'qa-leadership', label: 'QA Leadership' },
      { category: 'qa', slug: 'qa-metrics', label: 'QA Metrics' },
      { category: 'qa', slug: 'risk-based-testing', label: 'Risk-Based Testing' },
      { category: 'qa', slug: 'qa-in-devops', label: 'QA in DevOps' },
    ],
  },
  {
    id: 'test-automation',
    label: 'Test Automation Tools',
    description: 'Expert in five or more technical test tools of different types.',
    pages: [
      { category: 'test-automation', slug: 'playwright', label: 'Playwright' },
      { category: 'test-automation', slug: 'selenium', label: 'Selenium' },
      { category: 'test-automation', slug: 'pytest-patterns', label: 'Pytest Patterns' },
      { category: 'technical-qa', slug: 'playwright-advanced', label: 'Playwright Advanced' },
    ],
  },
  {
    id: 'security-testing',
    label: 'Security Testing',
    description: 'Broaden test capability scope; assess and identify security risks on client systems.',
    pages: [
      { category: 'security', slug: 'red-teaming', label: 'Red Teaming' },
      { category: 'security', slug: 'owasp-llm-top10', label: 'OWASP LLM Top 10' },
      { category: 'technical-qa', slug: 'security-automation', label: 'Security Automation' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability & Monitoring',
    description: 'Ensure effective quality assurance; monitor production quality and system health.',
    pages: [
      { category: 'observability', slug: 'platforms', label: 'Observability Platforms' },
      { category: 'observability', slug: 'langfuse', label: 'Langfuse' },
      { category: 'cloud', slug: 'cloud-monitoring', label: 'Cloud Monitoring' },
    ],
  },
  {
    id: 'ai-tools',
    label: 'AI in Testing',
    description: 'Identify new tools; bring AI-assisted testing as a differentiator on client sites.',
    pages: [
      { category: 'qa', slug: 'ai-testing', label: 'AI Testing' },
      { category: 'ai-tools', slug: 'claude-code', label: 'Claude Code' },
      { category: 'ai-tools', slug: 'cursor-copilot', label: 'Cursor / Copilot' },
    ],
  },
  {
    id: 'process-improvement',
    label: 'Process Improvement (PIM)',
    description: 'Build measurable, benefits-driven improvements roadmaps utilising the Process Improvement Model.',
    pages: [
      { category: 'qa', slug: 'continuous-testing', label: 'Continuous Testing' },
      { category: 'qa', slug: 'test-automation-strategy', label: 'Test Automation Strategy' },
      { category: 'qa', slug: 'defect-prevention', label: 'Defect Prevention' },
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
    detail: 'ISTQB or equivalent — agree target with delivery manager.',
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

export function getCoverageLevel(pageCount: number): CoverageLevel {
  if (pageCount >= 4) return 'high'
  if (pageCount >= 2) return 'medium'
  return 'low'
}

export function getDaysUntilBoard(): number {
  const board = new Date('2027-01-15')
  const today = new Date()
  return Math.max(0, Math.floor((board.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
}
