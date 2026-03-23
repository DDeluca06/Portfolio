# Resufolio Test Suite

Comprehensive testing suite for the Resufolio stats system and Docker integration.

## Test Structure

```
tests/
├── api/                    # Unit tests for API endpoints
│   ├── stats.test.ts      # Stats API tests
│   ├── docker.test.ts     # Docker API tests
│   └── health.test.ts     # Health check tests
├── docker/                 # Docker client unit tests
│   └── client.test.ts     # Docker client tests
├── integration/            # Integration tests
│   └── docker-api.test.ts # Full API request/response cycle tests
├── e2e/                    # End-to-end tests (Playwright)
│   └── stats-dashboard.spec.ts
├── security/               # Security/penetration tests
│   └── penetration.test.ts
├── performance/            # Load testing (k6)
│   └── load-test.js
└── utils/                  # Test utilities
    ├── mock-data.ts        # Mock data generators
    └── setup.ts            # Test environment setup
```

## Quick Start

### Install Dependencies

```bash
bun install
```

### Run All Tests

```bash
bun test
```

### Run Specific Test Suites

```bash
# Unit tests only
bun run test:unit

# Integration tests
bun run test:integration

# Security tests
bun run test:security

# E2E tests (requires build)
bun run build
bun run test:e2e

# Performance tests (requires k6)
bun run test:perf
```

### Run with Coverage

```bash
bun run test:coverage
```

## Test Configuration

### Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Test Configuration
TEST_API_URL=http://localhost:3001
TEST_STATS_API_KEY=test-api-key
TEST_BASE_URL=http://localhost:4173

# Docker Configuration
DOCKER_HOST=tcp://localhost:2375

# Test Options
SKIP_RATE_LIMIT_TEST=true  # Skip rate limit tests in CI
```

### Bun Configuration

The `bunfig.toml` file configures the test runner:

- Coverage threshold: 80%
- Test timeout: 30 seconds
- Preload: `tests/utils/setup.ts`

## CI/CD Integration

Tests run automatically on GitHub Actions for:
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`

The CI pipeline includes:
1. Unit tests
2. Integration tests
3. Security tests
4. E2E tests with Playwright
5. Performance tests with k6 (main branch only)
6. Coverage reporting

## Writing Tests

### Unit Test Example

```typescript
import { describe, test, expect } from 'bun:test';

describe('My Feature', () => {
  test('does something correctly', async () => {
    const result = await myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Resufolio/);
});
```

## Coverage Requirements

- Unit tests: 80%+ code coverage
- Integration tests: All critical paths covered
- E2E tests: All user flows covered

## Troubleshooting

### Tests Fail Due to Port Already in Use

```bash
# Kill processes on port 3001
lsof -ti:3001 | xargs kill -9
```

### Docker Tests Fail

Ensure Docker is running and accessible:

```bash
# Check Docker connection
curl http://localhost:2375/version
```

### Playwright Tests Fail

Install Playwright browsers:

```bash
bunx playwright install
```

## Performance Test Results

Performance tests run with k6 and check:
- p95 response time < 500ms
- Error rate < 1%
- Request rate > 100/s

Results are uploaded as artifacts in CI.
