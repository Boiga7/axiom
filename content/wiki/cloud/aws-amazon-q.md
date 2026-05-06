---
type: concept
category: cloud
para: resource
tags: [aws, amazon-q, amazon-q-business, amazon-q-developer, kendra, bedrock, aif-c01, clf-c02]
tldr: "Amazon Q is AWS's GenAI assistant family — Q Business (enterprise GenAI over company data, permission-aware) and Q Developer (AI coding assistant). AIF-C01 tests Q Business vs Kendra: Q Business returns synthesised answers; Kendra returns document passages."
sources: []
updated: 2026-05-06
---

# Amazon Q (Business and Developer)

> **TL;DR** Amazon Q is AWS's GenAI assistant family — Q Business (enterprise GenAI over company data, permission-aware) and Q Developer (AI coding assistant). AIF-C01 tests Q Business vs Kendra: Q Business returns synthesised answers; Kendra returns document passages.

Amazon Q was announced at re:Invent 2023 as AWS's answer to Microsoft Copilot and Google Duet. It comes in two distinct products that the AIF-C01 exam treats as separate services.

---

## The Two Products

| Product | What it does | Who uses it |
|---|---|---|
| **Amazon Q Business** | GenAI assistant that answers questions using company data | Employees, knowledge workers |
| **Amazon Q Developer** | AI coding assistant for writing, debugging, and explaining code | Developers, DevOps |

---

## Amazon Q Business

A fully managed GenAI assistant that connects to enterprise data sources and answers natural language questions — with citations, permission enforcement, and audit trails.

### How it works

1. Connect data sources (S3, SharePoint, Confluence, Salesforce, ServiceNow, Jira, RDS, and 40+ connectors)
2. Q Business indexes and chunks the content using Bedrock embeddings
3. Users ask questions in natural language via the Q Business web UI or embedded widget
4. Q Business retrieves relevant chunks, synthesises an answer using a foundation model, and provides source citations
5. Answers are permission-aware: users only see content from sources they have access to

### Key capabilities

- **Synthesised answers with citations** — not just document links; generates a coherent response from multiple sources
- **Permission-aware retrieval** — ACL enforcement means users cannot see content from systems they lack access to (enforced at query time, not just at index time)
- **Admin controls** — topic blocklist, response guardrails, audit logging to CloudTrail
- **Plugins** — take actions in third-party systems (create Jira tickets, update Salesforce records) from within Q Business
- **Customisation** — custom system prompts, response styles, blocked topics

### Amazon Q Business vs Amazon Kendra

This is the primary AIF-C01 exam trap:

| Dimension | Amazon Q Business | Amazon Kendra |
|---|---|---|
| Output type | Synthesised GenAI answer with citations | Ranked list of relevant document passages |
| Technology | RAG over FM (Bedrock-powered) | ML-powered semantic search (no FM generation) |
| Permission enforcement | Native — ACL-aware retrieval | Native — ACL-aware retrieval |
| Use case | "What is our PTO policy?" → paragraph answer | "Find documents about PTO policy" → document list |
| Customisation | System prompts, topic blocklist, plugins | Custom document attributes, facets, query tuning |
| Underlying model | Amazon Bedrock FM (selectable) | ML ranking models (not generative) |

**Exam trigger for Q Business:** "GenAI assistant over company data", "answer questions from SharePoint/Confluence", "synthesise answers from internal docs", "employee self-service AI"

**Exam trigger for Kendra:** "intelligent document search", "return relevant passages", "enterprise search across multiple repositories", "employees search company policies" (returns passages, does not synthesise)

---

## Amazon Q Developer

An AI coding assistant integrated into IDEs and the AWS Console.

### Capabilities

- **Code generation** — generate code from natural language descriptions
- **Code completion** — inline suggestions as you type (like GitHub Copilot)
- **Code explanation** — explain what a block of code does
- **Code transformation** — modernise Java 8/11 → Java 17/21 (Java upgrade feature)
- **Security scanning** — detect vulnerabilities in code (SAST-like)
- **Unit test generation** — generate test cases for selected code
- **CLI companion** — `/dev` command in AWS CloudShell; Q explains AWS CLI commands
- **Console integration** — asks Q about services in the AWS Management Console

### Integrations

- **IDE plugins:** VS Code, JetBrains IDEs (IntelliJ, PyCharm, etc.), Visual Studio
- **AWS Console:** Q button in every service page
- **AWS CloudShell:** `/dev` natural language to AWS CLI translation
- **Amazon CodeCatalyst:** integrated throughout the dev workflow

### Amazon Q Developer vs GitHub Copilot

| Dimension | Q Developer | GitHub Copilot |
|---|---|---|
| AWS-awareness | Deep — understands AWS services, IAM, CDK | Generic |
| Security scanning | Built-in SAST | Via third-party extensions |
| Java modernisation | Automated Java 8→17 upgrade | Manual |
| Pricing | Free tier (50 inline/month); Pro $19/user/month | $10/user/month |
| IDE support | VS Code, JetBrains, Visual Studio | VS Code, JetBrains, Neovim, etc. |

**Exam trigger for Q Developer:** "AI coding assistant in the IDE", "generate code for AWS services", "explain code in VS Code", "detect security vulnerabilities in code", "Java modernisation"

---

## Exam Scenario Drill

| Scenario | Service |
|---|---|
| Employees ask HR questions and get paragraph answers from Confluence | Q Business |
| Employees search for documents about a policy and see a list of matching passages | Kendra |
| Developer asks for code completion while writing a Lambda function | Q Developer |
| Company wants a GenAI assistant with SharePoint ACL enforcement | Q Business |
| Developer wants security vulnerability scanning inside VS Code | Q Developer |
| Company wants ML-ranked search results from 10 internal data sources | Kendra |

---

## Key Facts

- Amazon Q Business = GenAI assistant over company data; synthesises answers with citations; permission-aware via ACL enforcement
- Amazon Kendra = enterprise ML search; returns ranked document passages; does not generate answers
- Amazon Q Developer = AI coding assistant; IDE plugins (VS Code, JetBrains); inline completion + security scanning + Java modernisation
- Q Business uses Bedrock FMs under the hood; Kendra uses ML ranking models (not generative)
- Q Business plugins allow actions in third-party systems (Jira, Salesforce) from within the assistant
- Q Developer free tier: 50 inline suggestions/month; Pro tier: $19/user/month

## Connections

- [[cloud/aws-ai-recognition-services]] — Kendra is in the pre-built AI services family; Q Business is the GenAI successor/complement
- [[apis/aws-bedrock]] — Q Business is powered by Bedrock FMs under the hood
- [[landscape/aws-ai-practitioner]] — AIF-C01 Domain 3 tests Q Business vs Kendra; Domain 1 covers the RAG concepts Q Business implements
- [[landscape/aws-cloud-practitioner]] — CLF-C02 mentions Amazon Q as part of the AI services catalogue
- [[rag/pipeline]] — Q Business is a fully managed RAG implementation over enterprise data
- [[ai-tools/cursor-copilot]] — Q Developer is AWS's answer to GitHub Copilot; similar positioning

## Open Questions

- Is Amazon Q Business converging with Bedrock Agents, or are they on separate roadmaps?
- Does Q Business's ACL enforcement work at query time (re-checks permissions on every query) or at index time only?
