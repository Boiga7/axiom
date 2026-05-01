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

Gradle also supports remote build caching — repeated CI builds share task output caches. Configure in `settings.gradle.kts`:

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

## Connections

- [[java/spring-ai]] — Spring AI BOM manages all spring-ai-* dependency versions
- [[java/langchain4j]] — LangChain4j BOM (`langchain4j-bom`) same pattern
- [[java/grpc]] — Protobuf plugin in Gradle generates Java stubs from `.proto` files
- [[java/anthropic-java-sdk]] — `com.anthropic:anthropic-java` Maven Central artifact
- [[infra/deployment]] — GitHub Actions CI/CD with Maven/Gradle caching
