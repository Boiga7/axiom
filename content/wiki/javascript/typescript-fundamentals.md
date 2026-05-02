---
type: concept
category: javascript
para: resource
tags: [typescript, type-system, generics, utility-types, strict-mode, tsconfig]
sources: []
updated: 2026-05-02
tldr: TypeScript type system for AI engineers — type narrowing, interfaces vs types, generics for LLM response wrappers, utility types (Partial/Required/Pick/Omit), satisfies operator, as const, and a production-ready strict tsconfig.
---

# TypeScript Fundamentals

> **TL;DR** TypeScript is JavaScript with a static type system bolted on. The type system catches LLM response shape mismatches at compile time rather than at 3am in production. The key mental model: types exist only at compile time; the runtime is always plain JavaScript.

TypeScript is the lingua franca for production web applications. For AI engineers, it provides three concrete benefits: (1) type-safe LLM response parsing so you catch schema drift before it reaches users; (2) autocomplete on SDK types so you discover API surface without reading docs; (3) refactoring safety when changing tool schemas or message formats.

---

## The Type System Mental Model

TypeScript's type system is **structural**, not nominal. Two types are compatible if their shapes match — you do not need explicit inheritance or `implements`.

```typescript
type Message = {
  role: "user" | "assistant";
  content: string;
};

// This works — structurally compatible
function send(msg: Message) { /* ... */ }
send({ role: "user", content: "Hello" }); // fine
```

Types exist **only at compile time**. After `tsc` compiles your code, all type annotations are erased. The runtime sees plain JavaScript. This has one important consequence: you cannot do runtime type checking with TypeScript alone — you need Zod or similar for that.

---

## Primitive Types and Unions

```typescript
// Primitives
const name: string = "Alice";
const count: number = 42;
const enabled: boolean = true;
const nothing: null = null;
const missing: undefined = undefined;

// Union types — value can be any listed type
type Role = "user" | "assistant" | "system";
type ContentBlock = string | { type: "text"; text: string } | { type: "image_url"; url: string };

// Intersection types — value must satisfy all types
type WithTimestamp = { createdAt: Date };
type WithId = { id: string };
type Entity = WithTimestamp & WithId;
```

---

## Interfaces vs Type Aliases

Both define object shapes. The differences matter at the margin:

| Feature | `interface` | `type` |
|---|---|---|
| Declaration merging | Yes — open, can be extended | No — closed once defined |
| `extends` keyword | Yes | Use `&` intersection instead |
| Computed properties | No | Yes |
| Union/intersection | Not directly | Yes, first-class |
| Error messages | Often cleaner | Sometimes verbose |

**Convention:** Use `interface` for public API shapes and class contracts. Use `type` for unions, mapped types, and computed shapes.

```typescript
// interface — good for object shapes that may be extended
interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolUseMessage extends LLMMessage {
  toolUse: ToolUseBlock[];
}

// type — good for unions and computation
type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "message_start"; inputTokens: number }
  | { type: "message_stop" };

type ModelName = "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-opus-4-6";
```

---

## Type Narrowing

TypeScript tracks types through control flow. This is called **narrowing** — after a check, the type is narrowed to a more specific form.

```typescript
type ToolResult =
  | { success: true; data: string }
  | { success: false; error: Error };

function handleResult(result: ToolResult) {
  if (result.success) {
    // TypeScript knows result.data exists here
    console.log(result.data.toUpperCase());
  } else {
    // TypeScript knows result.error exists here
    console.error(result.error.message);
  }
}
```

**Discriminated unions** are the idiomatic pattern for LLM content blocks:

```typescript
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

function processBlock(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return block.text; // TypeScript knows block.text exists
    case "tool_use":
      return `Tool: ${block.name}`;
    case "tool_result":
      return `Result for ${block.tool_use_id}`;
    // No default needed — TypeScript knows all cases are covered
  }
}
```

**Type guards** narrow types with custom functions:

```typescript
function isTextBlock(
  block: ContentBlock
): block is { type: "text"; text: string } {
  return block.type === "text";
}

const blocks: ContentBlock[] = getBlocks();
const textBlocks = blocks.filter(isTextBlock);
// textBlocks is now { type: "text"; text: string }[]
```

**`in` operator narrowing:**

```typescript
function processContent(content: string | { text: string }) {
  if (typeof content === "string") {
    return content.trim();
  }
  // TypeScript knows content is { text: string } here
  return content.text.trim();
}
```

---

## Generics

Generics let you write functions and types that work over many types while preserving type information.

```typescript
// Generic function — T is inferred from the argument
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([1, 2, 3]);    // TypeScript infers T = number
const s = first(["a", "b"]);   // TypeScript infers T = string
```

**Generic constraints** — limit T to types that have certain properties:

```typescript
// T must have an 'id' property
function findById<T extends { id: string }>(
  items: T[],
  id: string
): T | undefined {
  return items.find((item) => item.id === id);
}
```

**Generic interfaces** — essential for typed LLM response wrappers:

```typescript
interface ApiResponse<T> {
  data: T;
  cached: boolean;
  latencyMs: number;
}

interface ParsedLLMOutput<T> {
  raw: string;
  parsed: T;
  confidence: number;
}

// Use with a specific shape
type ClassificationResult = ParsedLLMOutput<{
  category: string;
  subcategory: string;
  score: number;
}>;
```

**Generic classes** for typed message history:

```typescript
class TypedHistory<M extends LLMMessage> {
  private messages: M[] = [];

  add(message: M): void {
    this.messages.push(message);
  }

  getLast(n: number): M[] {
    return this.messages.slice(-n);
  }

  getByRole(role: M["role"]): M[] {
    return this.messages.filter((m) => m.role === role);
  }
}
```

---

## Utility Types

TypeScript ships with utility types that transform existing types. These are the ones you will use constantly.

```typescript
interface UserPreferences {
  model: ModelName;
  maxTokens: number;
  systemPrompt: string;
  temperature: number;
}

// Partial<T> — all properties optional
function updatePreferences(
  current: UserPreferences,
  updates: Partial<UserPreferences>
): UserPreferences {
  return { ...current, ...updates };
}

// Required<T> — all properties required (reverse of Partial)
type StrictPreferences = Required<UserPreferences>;

// Pick<T, Keys> — select a subset of properties
type ModelConfig = Pick<UserPreferences, "model" | "maxTokens">;

// Omit<T, Keys> — exclude properties
type PreferencesWithoutModel = Omit<UserPreferences, "model">;

// Readonly<T> — all properties become readonly
const defaultPrefs: Readonly<UserPreferences> = {
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
  systemPrompt: "You are a helpful assistant.",
  temperature: 0.7,
};
// defaultPrefs.model = "claude-haiku-4-5"; // Error at compile time

// Record<Keys, Value> — map type
type ModelPricing = Record<ModelName, { inputPer1M: number; outputPer1M: number }>;

const pricing: ModelPricing = {
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5": { inputPer1M: 0.25, outputPer1M: 1.25 },
  "claude-opus-4-6": { inputPer1M: 15.0, outputPer1M: 75.0 },
};

// ReturnType<T> — extract return type of a function
function buildMessage(role: Role, content: string) {
  return { role, content, createdAt: new Date() };
}
type MessageShape = ReturnType<typeof buildMessage>;
// { role: Role; content: string; createdAt: Date }

// Parameters<T> — extract parameter types
type BuildMessageParams = Parameters<typeof buildMessage>;
// [role: Role, content: string]

// Awaited<T> — unwrap Promise type
async function fetchCompletion(): Promise<string> { return ""; }
type CompletionResult = Awaited<ReturnType<typeof fetchCompletion>>; // string
```

---

## The `satisfies` Operator

Introduced in TypeScript 4.9. Validates that a value conforms to a type without widening the inferred type to that type. This is the right tool for configuration objects.

```typescript
type ModelConfig = {
  model: ModelName;
  maxTokens: number;
  temperature?: number;
};

// Without satisfies — TypeScript widens to ModelConfig, losing literal types
const config1: ModelConfig = {
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
};
// config1.model is inferred as ModelName (wide), not "claude-sonnet-4-6" (narrow)

// With satisfies — TypeScript checks the shape but keeps narrow inference
const config2 = {
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
} satisfies ModelConfig;
// config2.model is inferred as "claude-sonnet-4-6" (narrow literal)

// Practical: catches typos in config without losing precision
const toolConfig = {
  name: "read_file",
  description: "Read a file from the filesystem",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path" },
    },
    required: ["path"],
  },
} satisfies Anthropic.Tool;
// Error if any required field is missing; literal types preserved
```

---

## `as const` Assertions

Tells TypeScript to infer the narrowest possible type — no widening. Essential for tool schemas and configuration.

```typescript
// Without as const — TypeScript widens to string[]
const roles = ["user", "assistant", "system"];
// roles: string[]

// With as const — TypeScript infers readonly tuple of literals
const ROLES = ["user", "assistant", "system"] as const;
// ROLES: readonly ["user", "assistant", "system"]

type Role = (typeof ROLES)[number];
// Role = "user" | "assistant" | "system"

// Object as const
const MODELS = {
  FAST: "claude-haiku-4-5",
  BALANCED: "claude-sonnet-4-6",
  POWERFUL: "claude-opus-4-6",
} as const;

type ModelKey = keyof typeof MODELS;          // "FAST" | "BALANCED" | "POWERFUL"
type ModelValue = (typeof MODELS)[ModelKey];  // "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-6"
```

---

## Mapped Types and Template Literal Types

```typescript
// Mapped type — transform every property
type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Conditional mapped type — transform based on value type
type StringifyValues<T> = {
  [K in keyof T]: T[K] extends number ? string : T[K];
};

// Template literal types — string manipulation in the type system
type EventName = "message" | "error" | "close";
type EventHandler = `on${Capitalize<EventName>}`;
// "onMessage" | "onError" | "onClose"

type CamelToSnake<S extends string> =
  S extends `${infer Head}${infer Tail}`
    ? Head extends Lowercase<Head>
      ? `${Head}${CamelToSnake<Tail>}`
      : `_${Lowercase<Head>}${CamelToSnake<Tail>}`
    : S;
```

---

## Strict TypeScript Configuration

The recommended `tsconfig.json` for AI application projects:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,

    /* Strict type checking — ALL of these should be true */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    /* Additional safety */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "app", "lib", "components", "types"],
  "exclude": ["node_modules"]
}
```

For Next.js 15, use the preset:

```json
{
  "extends": "next/core-web-vitals",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler"
  }
}
```

**Key settings explained:**
- `strict: true` — enables `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitAny`, `noImplicitThis`
- `noUncheckedIndexedAccess` — `arr[0]` returns `T | undefined`, not `T` — catches off-by-one bugs
- `exactOptionalPropertyTypes` — `{ foo?: string }` means "foo is string or not present", not "foo is string or undefined" — matters for API payloads
- `moduleResolution: "bundler"` — required for Next.js and Vite; handles ESM/CJS interop correctly

---

## Typing Async Functions and Promises

```typescript
// Always type the return value of async functions explicitly
async function fetchMessages(
  threadId: string
): Promise<LLMMessage[]> {
  const response = await fetch(`/api/threads/${threadId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  // response.json() returns Promise<unknown> — need to cast or validate
  return response.json() as Promise<LLMMessage[]>;
}

// Better: validate with Zod
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const MessagesSchema = z.array(MessageSchema);

async function fetchMessagesTypeSafe(
  threadId: string
): Promise<z.infer<typeof MessagesSchema>> {
  const response = await fetch(`/api/threads/${threadId}`);
  const raw = await response.json();
  return MessagesSchema.parse(raw); // throws ZodError if shape is wrong
}
```

---

## Zod Integration

Zod is the standard for runtime validation. It both validates and infers TypeScript types.

```typescript
import { z } from "zod";

// Define schema once — validation + type inference
const ToolInputSchema = z.object({
  path: z.string().min(1),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  maxBytes: z.number().int().positive().optional(),
});

type ToolInput = z.infer<typeof ToolInputSchema>;
// { path: string; encoding: "utf8" | "base64"; maxBytes?: number }

// Parse (throws on invalid) vs safeParse (returns result object)
function processToolInput(raw: unknown): ToolInput {
  return ToolInputSchema.parse(raw); // throws ZodError with path and message
}

function tryProcessToolInput(
  raw: unknown
): { success: true; data: ToolInput } | { success: false; error: z.ZodError } {
  return ToolInputSchema.safeParse(raw);
}

// Zod for LLM structured output
const ClassificationSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// Used with generateObject in Vercel AI SDK
// const result = await generateObject({ schema: ClassificationSchema, ... });
// result.object is fully typed
```

---

## Key Facts

- TypeScript compiles to JavaScript; the type system is erased at runtime — Zod handles runtime validation
- `strict: true` is a meta-flag that enables 8 sub-flags; always use it in production
- `satisfies` (TS 4.9+) validates shape without widening; prefer it over `: Type` annotation for config objects
- `noUncheckedIndexedAccess` adds `undefined` to all array/object index access — catches the most common runtime errors
- Discriminated unions (the `type` field pattern) are the correct way to model LLM content block variants
- `as const` is the correct way to define readonly enum-like objects in TypeScript without `enum` (avoid `enum`)
- `moduleResolution: "bundler"` is required for modern Next.js/Vite projects; `"node16"` is for plain Node.js scripts
- Generic constraints (`T extends { id: string }`) let you require structure without knowing the full type
- `ReturnType<typeof fn>` and `Parameters<typeof fn>` are essential for typing wrappers around third-party functions

## Common Failure Cases

**Using `any` to silence type errors**
Why: Type errors during refactoring or from untyped third-party responses feel blocking.
Detect: `grep -r ": any" src/` returning many hits; or `noImplicitAny: false` in tsconfig.
Fix: Replace `any` with `unknown` (which forces you to narrow before use) or write a proper Zod schema. Use `// @ts-expect-error` with a comment if you genuinely need to bypass for one line — it causes a compile error if the bypass is no longer needed.

**Forgetting that `response.json()` returns `Promise<any>`**
Why: The Fetch API predates TypeScript and cannot know the response shape.
Detect: You access properties of a fetched object without any schema check.
Fix: Always pass fetched JSON through a Zod schema. `const data = MySchema.parse(await response.json())` — one line, compile-time types, runtime validation.

**Index signature returning non-optional type**
Why: `const val = obj[key]` with a string key infers `ValueType`, not `ValueType | undefined`, unless `noUncheckedIndexedAccess` is enabled.
Detect: Runtime `TypeError: Cannot read properties of undefined` on object property access that TypeScript said was safe.
Fix: Enable `"noUncheckedIndexedAccess": true` in tsconfig. All index accesses then return `T | undefined`, forcing you to handle the missing case.

**`exactOptionalPropertyTypes` breaking third-party types**
Why: Enabling `exactOptionalPropertyTypes` is stricter than most npm packages expect. `{ foo?: string }` in strict mode means the key must be absent, not `undefined`.
Detect: Type errors from library types when assigning `undefined` to optional properties.
Fix: Use `{ foo?: string | undefined }` for properties where you need to explicitly pass `undefined`. Or scope the strict config to your source only, not `node_modules`.

**Enum instead of const assertion**
Why: TypeScript `enum` compiles to JavaScript runtime code (an IIFE), adds bundle weight, and has surprising type behavior.
Detect: `enum Foo { A, B }` in the codebase.
Fix: Replace with `const ROLES = ["a", "b"] as const` and `type Role = (typeof ROLES)[number]`. Zero runtime cost, cleaner types.

## Connections

- [[javascript/javascript-hub]] — ecosystem overview and language selection guide
- [[javascript/ai-sdk-patterns]] — applying these types to @anthropic-ai/sdk and Vercel AI SDK
- [[web-frameworks/nextjs]] — TypeScript in App Router server components and server actions
- [[web-frameworks/vercel-ai-sdk]] — `generateObject` uses Zod schemas for structured output
- [[python/ecosystem]] — Python parallel: Pydantic v2 plays the same role as Zod

## Open Questions

- Will TypeScript ever add Zod-style runtime validation as a first-class language feature?
- Is `exactOptionalPropertyTypes` practical to enable in projects that use many third-party libraries?
- When does TypeScript's new `--isolatedDeclarations` flag become the standard for library authors?
