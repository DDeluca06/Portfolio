# Resufolio Developer Guide

A comprehensive guide for developers working on the Resufolio portfolio application.

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Project Structure](#2-project-structure)
3. [Development Workflow](#3-development-workflow)
4. [Coding Standards](#4-coding-standards)
5. [Adding New Features](#5-adding-new-features)
6. [Testing](#6-testing)
7. [Debugging](#7-debugging)
8. [Environment Configuration](#8-environment-configuration)
9. [Docker Development](#9-docker-development)
10. [Troubleshooting](#10-troubleshooting)
11. [Contributing Guidelines](#11-contributing-guidelines)
12. [Useful Commands](#12-useful-commands)

---

## 1. Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool                                               | Version | Purpose                                |
| -------------------------------------------------- | ------- | -------------------------------------- |
| [Bun](https://bun.sh/)                             | 1.0.0+  | Runtime and package manager            |
| [Node.js](https://nodejs.org/)                     | 18.0+   | Compatibility (Bun uses Node APIs)     |
| [Docker](https://docs.docker.com/get-docker/)      | 20.10+  | Containerization and local development |
| [Docker Compose](https://docs.docker.com/compose/) | 2.0+    | Multi-container orchestration          |
| [Git](https://git-scm.com/)                        | 2.30+   | Version control                        |

Optional but recommended:

| Tool                                  | Purpose                      |
| ------------------------------------- | ---------------------------- |
| [k6](https://k6.io/)                  | Performance/load testing     |
| [Playwright](https://playwright.dev/) | E2E testing (auto-installed) |

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd resufolio
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**

   ```bash
   bun run dev
   ```

   The application will be available at `http://localhost:5173`

### Development Environment Setup

#### IDE Recommendations

**VS Code (Recommended)**

Extensions:

- [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) - Syntax highlighting and language features
- [TypeScript Importer](https://marketplace.visualstudio.com/items?itemName=pmneo.tsimporter) - Auto-import TypeScript symbols
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) - Autocomplete for Tailwind classes
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) - Linting
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) - Code formatting

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[svelte]": {
    "editor.defaultFormatter": "svelte.svelte-vscode"
  },
  "svelte.enable-ts-plugin": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

**WebStorm/IntelliJ IDEA**

- Built-in TypeScript and Svelte support
- Configure ESLint and Prettier in Settings → Languages & Frameworks

### Development Server Options

```bash
# Standard development (with hot reload)
bun run dev

# Development with network access
bun run dev --host

# Preview production build
bun run build && bun run preview
```

---

## 2. Project Structure

### Directory Layout

```
resufolio/
├── .beads/                    # Issue tracking configuration
├── .github/
│   └── workflows/             # CI/CD pipelines
├── docs/                      # Documentation
│   ├── adr/                   # Architecture Decision Records
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── SECURITY.md            # Security documentation
│   └── SWARM-DEPLOYMENT.md    # Docker Swarm deployment
├── services/
│   └── stats-api/             # Standalone stats API service
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── scripts/                   # Utility scripts
│   └── monitor.ts             # System monitoring script
├── src/
│   ├── lib/
│   │   ├── api/              # API client utilities
│   │   ├── components/       # Svelte components
│   │   │   ├── docker/       # Docker-related components
│   │   │   └── stats/        # Stats display components
│   │   ├── data/             # Static data (resume, homelab)
│   │   ├── db/               # Database clients (InfluxDB)
│   │   ├── docker/           # Docker API integration
│   │   ├── errors/           # Error classes and handling
│   │   ├── logger/           # Logging utilities
│   │   ├── stores/           # Svelte stores
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── validation/       # Input validation schemas
│   ├── routes/               # SvelteKit routes
│   │   ├── api/              # API endpoints
│   │   │   ├── docker/       # Docker API routes
│   │   │   ├── history/      # Historical data routes
│   │   │   └── stats/        # Stats API routes
│   │   └── ws/               # WebSocket endpoints
│   ├── app.css               # Global styles
│   ├── app.d.ts              # TypeScript declarations
│   └── app.html              # HTML template
├── tests/
│   ├── api/                  # API unit tests
│   ├── docker/               # Docker client tests
│   ├── e2e/                  # Playwright E2E tests
│   ├── integration/          # Integration tests
│   ├── performance/          # k6 load tests
│   ├── security/             # Security tests
│   └── utils/                # Test utilities
├── docker-compose.yml        # Docker Compose configuration
├── docker-stack.yml          # Docker Swarm stack
├── Dockerfile                # Main application Dockerfile
├── package.json              # Project dependencies
├── svelte.config.js          # SvelteKit configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite configuration
```

### File Naming Conventions

| Pattern             | Usage              | Example                     |
| ------------------- | ------------------ | --------------------------- |
| `PascalCase.svelte` | Svelte components  | `RealTimeStats.svelte`      |
| `camelCase.ts`      | TypeScript modules | `statsClient.ts`            |
| `kebab-case.ts`     | API routes         | `+server.ts`                |
| `index.ts`          | Barrel exports     | `components/stats/index.ts` |
| `types.ts`          | Type definitions   | `docker/types.ts`           |
| `*.test.ts`         | Test files         | `docker.test.ts`            |
| `*.spec.ts`         | E2E test files     | `stats-dashboard.spec.ts`   |

### Module Organization

#### Component Structure

Components are organized by domain:

```
components/
├── docker/           # Docker management UI
│   ├── ContainerList.svelte
│   ├── DockerDashboard.svelte
│   ├── ServiceDetails.svelte
│   ├── SwarmOverview.svelte
│   └── index.ts      # Barrel export
├── stats/            # Statistics and metrics
│   ├── ConnectionStatus.svelte
│   ├── MetricCard.svelte
│   ├── RealTimeStats.svelte
│   ├── ResourceUsageChart.svelte
│   ├── ServerStatusGrid.svelte
│   └── index.ts
├── ErrorBoundary.svelte
├── Footer.svelte
├── Hero.svelte
├── Navigation.svelte
└── ...
```

#### Docker Library Structure

```
docker/
├── client.ts         # Dockerode client initialization
├── containers.ts     # Container operations
├── events.ts         # Docker event streaming
├── index.ts          # Barrel export
├── networks.ts       # Network operations
├── nodes.ts          # Swarm node operations
├── services.ts       # Service operations
├── system.ts         # System information
└── types.ts          # Docker type definitions
```

### Where to Find Things

| Task                 | Location                                      |
| -------------------- | --------------------------------------------- |
| Add new page         | `src/routes/[page-name]/+page.svelte`         |
| Add API endpoint     | `src/routes/api/[endpoint]/+server.ts`        |
| Add component        | `src/lib/components/[category]/[Name].svelte` |
| Add Docker operation | `src/lib/docker/[operation].ts`               |
| Update resume data   | `src/lib/data/resumeData.ts`                  |
| Update homelab data  | `src/lib/data/homelabData.ts`                 |
| Add type definition  | `src/lib/types/index.ts`                      |
| Write tests          | `tests/[type]/[name].test.ts`                 |
| Configure build      | `vite.config.ts`, `svelte.config.js`          |
| Update styles        | `tailwind.config.js`, `src/app.css`           |

---

## 3. Development Workflow

### Git Workflow

We follow a feature-branch workflow:

1. Create a feature branch from `main`
2. Make your changes with focused commits
3. Push the branch and create a Pull Request
4. Ensure CI passes and get code review
5. Squash and merge to `main`

```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/my-feature
```

### Branch Naming

| Prefix      | Purpose          | Example                  |
| ----------- | ---------------- | ------------------------ |
| `feature/`  | New features     | `feature/docker-events`  |
| `fix/`      | Bug fixes        | `fix/memory-leak`        |
| `docs/`     | Documentation    | `docs/api-guide`         |
| `refactor/` | Code refactoring | `refactor/docker-client` |
| `test/`     | Test additions   | `test/integration`       |
| `chore/`    | Maintenance      | `chore/update-deps`      |
| `security/` | Security fixes   | `security/auth-headers`  |

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation only                  |
| `style`    | Code style (formatting, semicolons) |
| `refactor` | Code refactoring                    |
| `perf`     | Performance improvements            |
| `test`     | Adding or updating tests            |
| `chore`    | Build process, dependencies         |
| `ci`       | CI/CD changes                       |
| `security` | Security improvements               |

**Examples:**

```bash
feat(docker): add real-time container events

fix(api): handle null response from Docker proxy

refactor(stats): optimize memory usage in charts

docs(readme): update installation instructions

test(docker): add unit tests for container operations
```

### Pull Request Process

1. **Before creating PR:**
   - Ensure all tests pass: `bun test`
   - Update documentation if needed
   - Add/update tests for new code
   - Run type checking: `bun run check`

2. **PR Description Template:**

   ```markdown
   ## Summary

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Unit tests added/updated
   - [ ] Integration tests pass
   - [ ] E2E tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No console errors
   ```

3. **Review Requirements:**
   - At least one approval required
   - All CI checks must pass
   - No merge conflicts
   - Branch is up to date with `main`

---

## 4. Coding Standards

### TypeScript Best Practices

#### Type Safety

```typescript
// ✅ Good: Explicit return types
async function fetchContainers(): Promise<Container[]> {
  // Implementation
}

// ✅ Good: Use interfaces for object shapes
interface ContainerStats {
  id: string;
  name: string;
  cpu: number;
  memory: number;
}

// ❌ Bad: Implicit any
function processData(data) {
  return data.value;
}
```

#### Error Handling

```typescript
// ✅ Good: Use custom error classes
import { DockerError, ValidationError } from "$lib/errors";

try {
  const container = await docker.getContainer(id).inspect();
} catch (error) {
  if (error instanceof DockerError) {
    logger.error({ error: error.message }, "Docker operation failed");
    throw error;
  }
  logger.error({ error }, "Unexpected error");
  throw new DockerError("Failed to fetch container", { cause: error });
}
```

#### Async/Await Patterns

```typescript
// ✅ Good: Parallel execution with Promise.all
const [containers, services, nodes] = await Promise.all([
  fetchContainers(),
  fetchServices(),
  fetchNodes(),
]);

// ✅ Good: Sequential execution when needed
async function initializeService(): Promise<void> {
  await connectToDatabase();
  await setupMiddleware();
  await startServer();
}
```

### Svelte Component Patterns

#### Component Structure

```svelte
<script lang="ts">
  // Imports
  import { onMount, onDestroy } from 'svelte';
  import type { Container } from '$lib/docker/types';

  // Props with types
  interface Props {
    container: Container;
    showDetails?: boolean;
  }

  let { container, showDetails = false }: Props = $props();

  // State
  let isLoading = $state(false);
  let stats = $state<ContainerStats | null>(null);

  // Effects
  $effect(() => {
    if (showDetails) {
      loadStats();
    }
  });

  // Functions
  async function loadStats(): Promise<void> {
    isLoading = true;
    try {
      stats = await fetchContainerStats(container.id);
    } finally {
      isLoading = false;
    }
  }

  // Lifecycle
  onMount(() => {
    logger.debug('ContainerCard mounted');
  });
</script>

<template>
  <!-- Component template -->
</template>

<style>
  /* Component-scoped styles if needed */
</style>
```

#### Runes Usage (Svelte 5)

```typescript
// ✅ Good: Use runes for reactivity
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log(`Count changed to ${count}`);
});

// ✅ Good: Props with destructuring
let { data, onSelect }: Props = $props();

// ✅ Good: Bindings
let inputValue = $state("");
```

### Error Handling Patterns

#### Custom Error Classes

```typescript
// src/lib/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export class DockerError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "DOCKER_ERROR", 500, options);
    this.name = "DockerError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "VALIDATION_ERROR", 400, options);
    this.name = "ValidationError";
  }
}
```

#### API Error Handling

```typescript
// src/routes/api/docker/containers/+server.ts
export async function GET({ request }): Promise<Response> {
  try {
    const containers = await listContainers();
    return json(containers);
  } catch (error) {
    logger.error({ error }, "Failed to list containers");

    if (error instanceof DockerError) {
      return json({ error: error.message }, { status: 500 });
    }

    return json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Testing Requirements

- **Unit tests**: Required for all new utility functions
- **Component tests**: Required for complex components
- **API tests**: Required for all endpoints
- **Integration tests**: Required for feature workflows
- **Coverage**: Minimum 80% code coverage

---

## 5. Adding New Features

### How to Add a New API Endpoint

1. **Create the route file:**

   ```typescript
   // src/routes/api/my-feature/+server.ts
   import { json } from "@sveltejs/kit";
   import { logger } from "$lib/logger";
   import { validateRequest } from "$lib/validation";
   import type { RequestHandler } from "./$types";

   export const GET: RequestHandler = async ({ request }) => {
     try {
       const data = await fetchMyFeature();
       return json(data);
     } catch (error) {
       logger.error({ error }, "MyFeature GET failed");
       return json({ error: "Failed to fetch" }, { status: 500 });
     }
   };

   export const POST: RequestHandler = async ({ request }) => {
     try {
       const body = await request.json();
       const validated = validateRequest(body, myFeatureSchema);
       const result = await createMyFeature(validated);
       return json(result, { status: 201 });
     } catch (error) {
       logger.error({ error }, "MyFeature POST failed");
       return json({ error: "Failed to create" }, { status: 500 });
     }
   };
   ```

2. **Add validation schema:**

   ```typescript
   // src/lib/validation/index.ts
   export const myFeatureSchema = z.object({
     name: z.string().min(1),
     value: z.number().optional(),
   });
   ```

3. **Create tests:**

   ```typescript
   // tests/api/my-feature.test.ts
   import { describe, test, expect } from "bun:test";

   describe("My Feature API", () => {
     test("GET returns feature data", async () => {
       const response = await fetch(`${TEST_API_URL}/api/my-feature`);
       expect(response.status).toBe(200);
       // ... assertions
     });
   });
   ```

### How to Add a New Component

1. **Create component file:**

   ```svelte
   <!-- src/lib/components/my-category/MyComponent.svelte -->
   <script lang="ts">
     interface Props {
       title: string;
       items: Item[];
       onSelect?: (item: Item) => void;
     }

     let { title, items, onSelect }: Props = $props();
   </script>

   <div class="my-component">
     <h2>{title}</h2>
     <!-- Template -->
   </div>
   ```

2. **Export from barrel file:**

   ```typescript
   // src/lib/components/my-category/index.ts
   export { default as MyComponent } from "./MyComponent.svelte";
   ```

3. **Use in pages:**

   ```svelte
   <script>
     import { MyComponent } from '$lib/components/my-category';
   </script>

   <MyComponent title="My Feature" {items} />
   ```

### How to Add Docker Operations

1. **Add to Docker library:**

   ```typescript
   // src/lib/docker/my-operation.ts
   import { docker } from "./client";
   import { logger } from "$lib/logger";
   import { DockerError } from "$lib/errors";

   export async function myDockerOperation(id: string): Promise<Result> {
     try {
       const result = await docker.getContainer(id).myMethod();
       return result;
     } catch (error) {
       logger.error({ error, containerId: id }, "Docker operation failed");
       throw new DockerError(`Failed to perform operation on ${id}`, {
         cause: error,
       });
     }
   }
   ```

2. **Export from index:**

   ```typescript
   // src/lib/docker/index.ts
   export { myDockerOperation } from "./my-operation";
   ```

3. **Create API route:**

   ```typescript
   // src/routes/api/docker/my-operation/+server.ts
   import { myDockerOperation } from "$lib/docker";

   export const POST = async ({ request }) => {
     const { id } = await request.json();
     const result = await myDockerOperation(id);
     return json(result);
   };
   ```

### How to Add Database Queries

1. **Add query function:**

   ```typescript
   // src/lib/db/influx.ts
   export async function queryMyMetrics(
     start: Date,
     end: Date,
   ): Promise<Metric[]> {
     const query = influxClient.query;

     const fluxQuery = `
       from(bucket: "${INFLUX_BUCKET}")
         |> range(start: ${start.toISOString()}, stop: ${end.toISOString()})
         |> filter(fn: (r) => r._measurement == "my_metric")
     `;

     const result = await query.collectRows<Metric>(fluxQuery);
     return result;
   }
   ```

2. **Add API endpoint:**

   ```typescript
   // src/routes/api/metrics/my-metric/+server.ts
   import { queryMyMetrics } from "$lib/db/influx";

   export const GET = async ({ url }) => {
     const start = new Date(
       url.searchParams.get("start") || Date.now() - 86400000,
     );
     const end = new Date(url.searchParams.get("end") || Date.now());

     const metrics = await queryMyMetrics(start, end);
     return json(metrics);
   };
   ```

---

## 6. Testing

### Test Structure

```
tests/
├── api/              # API endpoint unit tests
│   ├── docker.test.ts
│   ├── health.test.ts
│   └── stats.test.ts
├── docker/           # Docker client tests
│   └── client.test.ts
├── e2e/              # Playwright E2E tests
│   └── stats-dashboard.spec.ts
├── integration/      # Integration tests
│   └── docker-api.test.ts
├── performance/      # k6 load tests
│   └── load-test.js
├── security/         # Security tests
│   └── penetration.test.ts
└── utils/            # Test utilities
    ├── mock-data.ts
    └── setup.ts
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/api/docker.test.ts

# Run with coverage
bun test --coverage

# Run unit tests only
bun run test:unit

# Run integration tests
bun run test:integration

# Run E2E tests (requires build)
bun run build
bun run test:e2e

# Run performance tests
bun run test:perf
```

### Writing Tests

#### Unit Test Example

```typescript
// tests/api/docker.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { listContainers } from "../../src/lib/docker/containers";

describe("Docker API", () => {
  test("listContainers returns container array", async () => {
    const containers = await listContainers();

    expect(Array.isArray(containers)).toBe(true);
    containers.forEach((container) => {
      expect(container).toHaveProperty("Id");
      expect(container).toHaveProperty("Names");
      expect(container).toHaveProperty("State");
    });
  });

  test("listContainers handles errors", async () => {
    // Test error handling
    await expect(listContainers({ invalid: true })).rejects.toThrow();
  });
});
```

#### E2E Test Example

```typescript
// tests/e2e/stats-dashboard.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Stats Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays server stats", async ({ page }) => {
    await expect(page.getByText("Server Status")).toBeVisible();
    await expect(page.getByTestId("cpu-usage")).toBeVisible();
    await expect(page.getByTestId("memory-usage")).toBeVisible();
  });

  test("updates stats in real-time", async ({ page }) => {
    const initialValue = await page.getByTestId("cpu-usage").textContent();

    // Wait for update
    await page.waitForTimeout(6000);

    const updatedValue = await page.getByTestId("cpu-usage").textContent();
    expect(updatedValue).not.toBe(initialValue);
  });
});
```

### Mock Data

```typescript
// tests/utils/mock-data.ts
import type { Container } from "../../src/lib/docker/types";

export const mockContainer: Container = {
  Id: "abc123",
  Names: ["/test-container"],
  Image: "nginx:latest",
  State: "running",
  Status: "Up 2 hours",
  Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: "tcp" }],
};

export function createMockContainers(count: number): Container[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockContainer,
    Id: `container-${i}`,
    Names: [`/container-${i}`],
  }));
}
```

---

## 7. Debugging

### Common Debugging Scenarios

#### Docker API Issues

```bash
# Check Docker proxy connectivity
curl http://localhost:2375/version

# List containers via API
curl http://localhost:2375/containers/json

# Check Docker proxy logs
docker logs resufolio-docker-proxy
```

#### API Endpoint Issues

```typescript
// Add detailed logging
import { logger } from "$lib/logger";

export const GET = async ({ request }) => {
  logger.debug({ url: request.url }, "Incoming request");

  try {
    const data = await fetchData();
    logger.debug({ data }, "Fetched data");
    return json(data);
  } catch (error) {
    logger.error({ error, stack: error.stack }, "Request failed");
    throw error;
  }
};
```

#### Component Issues

```svelte
<script>
  // Add reactive debugging
  $effect(() => {
    console.log('State changed:', { isLoading, data, error });
  });

  // Or use $inspect in Svelte 5
  let state = $state({ count: 0 });
  $inspect(state); // Logs on every change
</script>
```

### Log Locations

| Service      | Log Location   | Command                              |
| ------------ | -------------- | ------------------------------------ |
| Development  | Console        | `bun run dev`                        |
| Docker       | Container logs | `docker logs resufolio`              |
| Docker Proxy | Container logs | `docker logs resufolio-docker-proxy` |
| Stats API    | Container logs | `docker logs resufolio-stats-api`    |
| InfluxDB     | Container logs | `docker logs resufolio-influxdb`     |

### Error Tracking

Logs are structured JSON using Pino:

```typescript
import { logger } from "$lib/logger";

// Different log levels
logger.debug({ containerId }, "Processing container");
logger.info("Server started on port 3000");
logger.warn({ containerId }, "Container health check failed");
logger.error({ error }, "Failed to fetch container stats");

// With additional context
logger.child({ component: "DockerClient" }).info("Connected to Docker");
```

### Performance Profiling

```bash
# Build with source maps for profiling
bun run build --sourcemap

# Run performance tests
k6 run tests/performance/load-test.js

# Analyze bundle size
bun run build && ls -la build/
```

---

## 8. Environment Configuration

### All Environment Variables

#### Application Configuration

| Variable   | Description      | Default       | Required |
| ---------- | ---------------- | ------------- | -------- |
| `NODE_ENV` | Environment mode | `development` | No       |
| `PORT`     | Server port      | `3000`        | No       |
| `HOST`     | Server host      | `0.0.0.0`     | No       |

#### Security

| Variable                       | Description            | Default    | Required |
| ------------------------------ | ---------------------- | ---------- | -------- |
| `STATS_API_KEY`                | API authentication key | -          | Yes      |
| `ALLOWED_ORIGINS`              | CORS allowed origins   | -          | No       |
| `RATE_LIMIT_READS_PER_MINUTE`  | Read rate limit        | `100`      | No       |
| `RATE_LIMIT_WRITES_PER_MINUTE` | Write rate limit       | `20`       | No       |
| `ENABLE_HSTS`                  | Enable HSTS header     | `true`     | No       |
| `HSTS_MAX_AGE`                 | HSTS max age (seconds) | `31536000` | No       |

#### InfluxDB

| Variable        | Description           | Default   | Required |
| --------------- | --------------------- | --------- | -------- |
| `INFLUX_URL`    | InfluxDB URL          | -         | Yes      |
| `INFLUX_TOKEN`  | InfluxDB token        | -         | Yes      |
| `INFLUX_ORG`    | InfluxDB organization | `homelab` | No       |
| `INFLUX_BUCKET` | InfluxDB bucket       | `metrics` | No       |

#### Docker

| Variable      | Description        | Default                   | Required |
| ------------- | ------------------ | ------------------------- | -------- |
| `DOCKER_HOST` | Docker daemon host | `tcp://docker-proxy:2375` | No       |

#### Server Info

| Variable      | Description             | Default          | Required |
| ------------- | ----------------------- | ---------------- | -------- |
| `SERVER_NAME` | Display name for server | `Homelab Server` | No       |

### Development vs Production

#### Development Environment

```bash
# .env
NODE_ENV=development
PORT=5173

# Security (relaxed for dev)
STATS_API_KEY=dev-key-do-not-use-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
ENABLE_HSTS=false

# InfluxDB (local)
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=dev-token

# Docker (direct socket or proxy)
DOCKER_HOST=tcp://localhost:2375
```

#### Production Environment

```bash
# .env
NODE_ENV=production
PORT=3000

# Security (strict)
STATS_API_KEY=<strong-random-key>
ALLOWED_ORIGINS=https://your-domain.com
ENABLE_HSTS=true
RATE_LIMIT_READS_PER_MINUTE=100
RATE_LIMIT_WRITES_PER_MINUTE=20

# InfluxDB (internal network)
INFLUX_URL=http://influxdb:8086
INFLUX_TOKEN=<secure-token>

# Docker (via proxy)
DOCKER_HOST=tcp://docker-proxy:2375
```

### Secrets Management

1. **Never commit secrets:**
   - `.env` is in `.gitignore`
   - Use `.env.example` as template
   - Rotate secrets regularly

2. **Generate secure keys:**

   ```bash
   # Generate API key
   openssl rand -hex 32

   # Generate InfluxDB admin token
   openssl rand -hex 32
   ```

3. **Docker Secrets (Swarm mode):**

   ```yaml
   # docker-stack.yml
   secrets:
     - source: stats_api_key
       target: STATS_API_KEY

   secrets:
     stats_api_key:
       external: true
   ```

### Local Testing

```bash
# Copy example environment
cp .env.example .env

# Edit with your values
nano .env

# Verify configuration
bun run check

# Run tests
bun test
```

---

## 9. Docker Development

### Local Docker Setup

1. **Build and run:**

   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode:**

   ```bash
   docker-compose up -d
   ```

3. **View logs:**

   ```bash
   docker-compose logs -f portfolio
   ```

4. **Stop services:**

   ```bash
   docker-compose down
   ```

### Testing Docker Integration

```bash
# 1. Start Docker proxy
docker run -d \
  --name docker-proxy \
  -p 2375:2375 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e CONTAINERS=1 \
  -e SERVICES=1 \
  -e NODES=1 \
  tecnativa/docker-socket-proxy

# 2. Set environment
export DOCKER_HOST=tcp://localhost:2375

# 3. Test Docker client
bun test tests/docker/client.test.ts

# 4. Cleanup
docker rm -f docker-proxy
```

### Docker Debugging

```bash
# Enter running container
docker exec -it resufolio sh

# Check container health
docker ps

# View container stats
docker stats resufolio

# Inspect container
docker inspect resufolio

# Check network connectivity
docker network ls
docker network inspect resufolio_backend
```

---

## 10. Troubleshooting

### Common Development Issues

#### Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)

# Or use different port
PORT=3002 bun run dev
```

#### Bun Installation Issues

```bash
# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install

# Clear Bun cache
bun pm cache rm
```

#### Module Resolution Errors

```bash
# Regenerate SvelteKit types
bun run check

# Restart TypeScript server (VS Code)
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Build Problems

#### TypeScript Errors

```bash
# Check types
bun run check

# With verbose output
bun run check -- --verbose
```

#### Svelte Check Failures

```bash
# Run Svelte check
bunx svelte-check

# Watch mode
bunx svelte-check --watch
```

#### Build Failures

```bash
# Clean build
rm -rf build .svelte-kit
bun run build

# Debug build
bun run build --debug
```

### TypeScript Errors

#### Type Import Errors

```typescript
// Use 'import type' for types
import type { Container } from "$lib/docker/types";

// Not
import { Container } from "$lib/docker/types";
```

#### Strict Mode Violations

```typescript
// Handle null/undefined explicitly
const value = maybeNull ?? defaultValue;

// Use type guards
if (value !== null && value !== undefined) {
  // value is non-null here
}
```

### Docker Issues

#### Docker Proxy Connection Refused

```bash
# Check proxy is running
docker ps | grep docker-proxy

# Restart proxy
docker-compose restart docker-proxy

# Check logs
docker-compose logs docker-proxy
```

#### InfluxDB Connection Issues

```bash
# Check InfluxDB is healthy
docker-compose ps influxdb

# Check InfluxDB logs
docker-compose logs influxdb

# Reset InfluxDB (WARNING: data loss)
docker-compose down -v
docker-compose up -d influxdb
```

#### Container Permission Issues

```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Add user to docker group
sudo usermod -aG docker $USER
```

---

## 11. Contributing Guidelines

### Code Style

We use the following style guidelines:

- **TypeScript**: Strict mode enabled, explicit return types on exported functions
- **Svelte**: Svelte 5 runes syntax, TypeScript for all components
- **CSS**: Tailwind utility classes preferred, scoped styles when needed
- **Formatting**: Prettier with default configuration

### Documentation Requirements

All new features must include:

1. **Code documentation:**
   - JSDoc comments for public functions
   - Type annotations
   - Inline comments for complex logic

2. **README updates:**
   - New environment variables
   - New API endpoints
   - Feature usage instructions

3. **Developer guide updates:**
   - New workflow sections
   - Updated troubleshooting

### Issue Reporting

When reporting issues, include:

```markdown
**Description:**
Clear description of the issue

**Steps to Reproduce:**

1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**

- OS: [e.g., Ubuntu 22.04]
- Bun version: [e.g., 1.0.0]
- Docker version: [e.g., 24.0.0]
- Browser: [e.g., Chrome 120]

**Logs:**
```

Relevant log output

```

```

### Feature Requests

For feature requests, include:

```markdown
**Feature Description:**
Clear description of the proposed feature

**Use Case:**
Why is this feature needed?

**Proposed Solution:**
How should it work?

**Alternatives:**
Other approaches considered

**Additional Context:**
Any other relevant information
```

---

## 12. Useful Commands

### Build Commands

```bash
# Development build with hot reload
bun run dev

# Production build
bun run build

# Preview production build
bun run preview

# Type check only
bun run check

# Check and build
bun run check && bun run build
```

### Test Commands

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test tests/api/docker.test.ts

# Run tests matching pattern
bun test --grep "container"

# Run unit tests
bun run test:unit

# Run integration tests
bun run test:integration

# Run E2E tests
bun run test:e2e

# Run security tests
bun run test:security

# Run performance tests
bun run test:perf
```

### Lint Commands

```bash
# Check types
bun run check

# Svelte check
bunx svelte-check

# Check and watch
bunx svelte-check --watch
```

### Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f portfolio

# Restart service
docker-compose restart portfolio

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild specific service
docker-compose up -d --build portfolio

# Scale service
docker-compose up -d --scale portfolio=3
```

### Utility Commands

```bash
# Clean dependencies
rm -rf node_modules bun.lockb

# Reinstall
bun install

# Update dependencies
bun update

# Run monitoring script
bun run scripts/monitor.ts

# Check Docker connection
curl http://localhost:2375/version

# Test API health
curl http://localhost:3000/api/health
```

---

## Quick Reference Card

```bash
# Setup
cp .env.example .env
bun install

# Development
bun run dev                    # Start dev server
bun run build                  # Build for production
bun run preview                # Preview production build

# Testing
bun test                       # Run all tests
bun test --coverage           # Run with coverage
bun run test:e2e              # Run E2E tests

# Docker
docker-compose up -d          # Start services
docker-compose logs -f        # View logs
docker-compose down           # Stop services

# Troubleshooting
bun run check                 # Type check
bunx svelte-check            # Svelte check
lsof -ti:3001 | xargs kill   # Kill process on port
```

---

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [Bun Documentation](https://bun.sh/docs)
- [Docker API Reference](https://docs.docker.com/engine/api/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Support

For questions or issues:

1. Check this guide first
2. Search existing issues
3. Create a new issue with the appropriate template
4. Reach out to the maintainers

---

_Last updated: March 2026_
