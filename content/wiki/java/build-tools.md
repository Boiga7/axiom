---
type: concept
category: java
tags: [java, maven, gradle, build, dependency-management, kotlin-dsl, ai-engineering]
sources: []
updated: 2026-05-01
para: resource
tldr: Maven is the safe default for enterprise Java AI projects; Gradle with Kotlin DSL is faster and more expressive for greenfield. Both handle the multi-module layouts typical of LLM service projects.
---

# Maven and Gradle for Java AI Projects

> **TL;DR** Maven is the safe default for enterprise Java AI projects; Gradle with Kotlin DSL is faster and more expressive for greenfield. Both handle the multi-module layouts typical of LLM service projects.

Build tooling for Java AI projects. The key considerations for AI workloads: managing AI framework BOMs (Spring AI, LangChain4j), native image compilation for fast cold starts, and multi-module setups separating the inference client from the web layer.

---

## Maven

### Spring AI BOM

The Spring AI Bill of Materials pins all Spring AI dependency versions consistently:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>1.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>3.3.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <!-- After BOM import, no version needed -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-anthropic-spring-boot-starter</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
  </dependency>
</dependencies>
```

### LangChain4j Dependencies

```xml
<properties>
  <langchain4j.version>0.36.0</langchain4j.version>
</properties>

<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>dev.langchain4j</groupId>
      <artifactId>langchain4j-bom</artifactId>
      <version>${langchain4j.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-anthropic</artifactId>
  </dependency>
  <dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-embeddings-all-minilm-l6-v2-q</artifactId>
  </dependency>
</dependencies>
```

### Anthropic Java SDK

```xml
<dependency>
  <groupId>com.anthropic</groupId>
  <artifactId>anthropic-java</artifactId>
  <version>0.8.0</version>
</dependency>
```

### Useful Maven Plugins

```xml
<build>
  <plugins>
    <!-- Compile to Java 21 with preview features -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.13.0</version>
      <configuration>
        <release>21</release>
        <compilerArgs>--enable-preview</compilerArgs>
      </configuration>
    </plugin>

    <!-- Run tests with virtual thread support -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.2.5</version>
      <configuration>
        <argLine>--enable-preview -Djunit.jupiter.execution.parallel.enabled=true</argLine>
      </configuration>
    </plugin>

    <!-- Spring Boot executable JAR -->
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>
  </plugins>
</build>
```

---

## Gradle with Kotlin DSL

Kotlin DSL (`.gradle.kts`) is the recommended Gradle approach: IDE autocompletion, type checking, and no Groovy quirkiness.

### Root `build.gradle.kts`

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.0" apply false
    id("io.spring.dependency-management") version "1.1.5" apply false
    id("com.google.protobuf") version "0.9.4" apply false
    kotlin("jvm") version "2.0.0" apply false
}

allprojects {
    group = "com.example.ai"
    version = "1.0.0-SNAPSHOT"
}

subprojects {
    repositories {
        mavenCentral()
    }
}
```

### Module `build.gradle.kts`

```kotlin
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    java
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.ai:spring-ai-bom:1.0.0")
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.ai:spring-ai-anthropic-spring-boot-starter")
    implementation("dev.langchain4j:langchain4j-anthropic:0.36.0")
    implementation("com.anthropic:anthropic-java:0.8.0")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.testcontainers:postgresql:1.19.8")
}

tasks.withType<Test> {
    useJUnitPlatform()
    jvmArgs("--enable-preview")
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("--enable-preview")
}
```

### Multi-Module Layout for LLM Services

```
ai-project/
├── build.gradle.kts          # root config
├── settings.gradle.kts       # includes submodules
├── api/                      # shared Protobuf + model types
│   ├── build.gradle.kts
│   └── src/main/proto/       # .proto files
├── inference-client/         # Java gRPC client for Python inference
│   └── build.gradle.kts
├── web/                      # Spring Boot REST API
│   └── build.gradle.kts
└── batch/                    # Batch job runner
    └── build.gradle.kts
```

```kotlin
// settings.gradle.kts
rootProject.name = "ai-project"
include("api", "inference-client", "web", "batch")
```

The `api` module generates Protobuf stubs; `web` and `batch` depend on it. This prevents accidental circular dependencies.

---

## Dependency Caching in CI

```yaml
# .github/workflows/build.yml — Maven
- name: Cache Maven packages
  uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}

# Gradle — built-in caching
- name: Cache Gradle
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle.kts') }}
```

Gradle also supports remote build caching. Repeated CI builds share task output caches. Configure in `settings.gradle.kts`:

```kotlin
buildCache {
    remote<HttpBuildCache> {
        url = uri("https://your-build-cache-server/cache/")
        push = System.getenv("CI") == "true"
    }
}
```

---

## Native Image with GraalVM

For fast cold starts in serverless/container environments:

```xml
<!-- pom.xml — Spring Boot Native -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aot</artifactId>
</dependency>
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <version>0.10.2</version>
</plugin>
```

```bash
mvn -Pnative native:compile
# Produces a native binary — starts in <50ms vs JVM's 3-5s
```

Native image limitation: reflection-heavy libraries (some LLM SDKs) need explicit hints in `reflect-config.json`. Spring Boot 3.x generates these automatically for Spring beans.

---

## Key Facts

- Spring AI BOM: import `spring-ai-bom` in `dependencyManagement` to avoid version conflicts between AI modules
- LangChain4j also ships a BOM: `dev.langchain4j:langchain4j-bom` — same pattern
- Gradle Kotlin DSL: `.gradle.kts` files, use `implementation()` not `compile()` (deprecated)
- Java 21 preview features: add `--enable-preview` to both compiler and test runner JVM args
- GraalVM native: cold start drops from ~5s to <50ms; worth the complexity for Lambda/Cloud Run
- Multi-module: keep Protobuf stubs in a shared `:api` module so both client and server compile against the same types

## Common Failure Cases

**Spring AI BOM and Spring Boot BOM define conflicting versions for a shared transitive dependency, causing `NoSuchMethodError` at runtime**  
Why: `spring-ai-bom` pins specific versions of `jackson-databind`, `reactor-core`, and other libraries; if the Spring Boot BOM version is newer and resolves a higher version for the same artifact, Maven's nearest-definition rule picks one version — which may be incompatible with the other BOM's expectations.  
Detect: the application starts but throws `NoSuchMethodError` or `ClassNotFoundException` on the first request involving AI components; `mvn dependency:tree` shows two different versions of the conflicting artifact.  
Fix: import the Spring Boot BOM first in `dependencyManagement`, then Spring AI BOM so the AI BOM's pins take precedence; or explicitly lock the conflicting artifact to a version that satisfies both.

**Gradle `--enable-preview` flag is added to `compilerArgs` but not to the Surefire/test runner JVM args, causing tests to fail with `UnsupportedClassVersionError`**  
Why: Java preview features require `--enable-preview` at both compile time and runtime; if the test runner JVM does not have the flag, it refuses to load preview-enabled classes.  
Detect: `mvn test` fails with `UnsupportedClassVersionError: Preview features are not enabled for ...`; the application JAR runs fine when launched with `--enable-preview` manually.  
Fix: add `--enable-preview` to the Surefire plugin's `<argLine>` configuration and to Gradle's `tasks.withType<Test> { jvmArgs("--enable-preview") }`.

**GraalVM native image build fails for LangChain4j because reflection metadata is missing for dynamically loaded model classes**  
Why: native image does a static analysis that cannot see classes loaded via reflection at runtime; LangChain4j and the Anthropic SDK use reflection for JSON serialisation and model class instantiation, which native image removes unless explicit `reflect-config.json` hints are provided.  
Detect: `native:compile` succeeds but the native binary crashes at runtime with `ClassNotFoundError` or `NullPointerException` in JSON deserialisation code paths.  
Fix: run `mvn -Pagent spring-boot:run` to generate `reflect-config.json` via the GraalVM agent; commit the generated configs under `src/main/resources/META-INF/native-image/`; verify with a smoke test before deploying the native binary.

**Gradle Kotlin DSL build file fails to resolve `implementation()` for a dependency that uses Groovy DSL string syntax**  
Why: in Groovy DSL, `implementation 'group:artifact:version'` (space-separated, no parentheses) is valid; in Kotlin DSL, the equivalent requires `implementation("group:artifact:version")` with parentheses and quotes; mixing styles causes a compile error in the `.gradle.kts` file.  
Detect: Gradle reports `Unresolved reference: implementation` or a type mismatch during build script compilation when copying dependency declarations from documentation that uses Groovy DSL.  
Fix: always use quoted parenthetical syntax in `.gradle.kts`; use the IDE Kotlin DSL autocompletion (IntelliJ IDEA) to convert Groovy snippets; keep a reference `build.gradle.kts` with correct syntax to copy from.

## Connections

- [[java/spring-ai]] — Spring AI BOM manages all spring-ai-* dependency versions
- [[java/langchain4j]] — LangChain4j BOM (`langchain4j-bom`) same pattern
- [[java/grpc]] — Protobuf plugin in Gradle generates Java stubs from `.proto` files
- [[java/anthropic-java-sdk]] — `com.anthropic:anthropic-java` Maven Central artifact
- [[infra/deployment]] — GitHub Actions CI/CD with Maven/Gradle caching
## Open Questions

- How does this integrate with the broader JVM ecosystem in practice?
- What performance characteristics are not obvious from the API surface?
