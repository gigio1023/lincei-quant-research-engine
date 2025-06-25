# Backend Testing Guide

This document provides comprehensive guidance for testing the Auto Investment Helper backend system.

## Test Structure Overview

```
backend/test/
├── README.md                    # This file
├── app.e2e-spec.ts             # Basic application E2E tests
├── jest-e2e.json               # E2E test configuration
├── jest-e2e.setup.ts           # E2E test setup
├── jest-manual.json            # Manual test configuration
├── integration/                # Integration tests
│   └── data-flow.e2e-spec.ts   # Data flow integration tests
└── manual/                     # Manual tests (excluded from regular runs)
    └── api-integration.manual.spec.ts  # Real API integration tests
```

## Test Categories

### 1. Unit Tests (`*.spec.ts` in src/)
- **Location**: `src/**/*.spec.ts`
- **Purpose**: Test individual components, services, and modules in isolation
- **Command**: `npm test`
- **Characteristics**:
  - Fast execution (< 1 second per test)
  - No external dependencies
  - Mocked services and data
  - High test coverage

**Example**:
```bash
cd backend
npm test                    # Run all unit tests
npm test -- --watch        # Watch mode for development
npm test -- --coverage     # Generate coverage report
```

### 2. Integration Tests (`*.e2e-spec.ts` in test/)
- **Location**: `test/**/*.e2e-spec.ts`
- **Purpose**: Test complete workflows and data flow between modules
- **Command**: `npm run test:e2e`
- **Characteristics**:
  - Medium execution time (5-30 seconds per test)
  - Uses test database
  - Mocked external APIs
  - End-to-end functionality testing

**Example**:
```bash
cd backend
npm run test:e2e           # Run integration tests
npm run test:integration   # Alternative command
```

### 3. Manual Tests (`*.manual.spec.ts` in test/manual/)
- **Location**: `test/manual/**/*.manual.spec.ts`
- **Purpose**: Test real API integrations with external services
- **Command**: `npm run test:manual`
- **Characteristics**:
  - **⚠️ EXCLUDED from regular test runs**
  - Long execution time (30 seconds - 5 minutes per test)
  - Makes real API calls to Gemini, OpenAI
  - Consumes API quotas
  - Network-dependent

**Example**:
```bash
cd backend
npm run test:manual        # Run manual tests only
```

## Test Commands Reference

### Regular Development Testing
```bash
# Unit tests only
npm test

# All automated tests (unit + integration)
npm run test:all

# Watch mode for development
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Manual Testing (Run When Needed)
```bash
# ⚠️ Makes real API calls - use sparingly
npm run test:manual

# Specific manual test
npm run test:manual -- --testNamePattern="morning report"
```

### CI/CD Testing
```bash
# Standard CI pipeline (excludes manual tests)
npm ci
npm run lint
npm run test:all
npm run build
npm audit --audit-level=moderate
```

## Manual Test Guidelines

### ⚠️ Important Notes for Manual Tests

1. **API Quotas**: Manual tests consume real API quotas from Gemini and OpenAI
2. **Network Dependencies**: Tests may fail due to network issues or API rate limits
3. **Cost Implications**: Each test run may incur small API costs
4. **Execution Time**: Manual tests take 30 seconds to 5 minutes per test
5. **Environment**: Requires valid `GEMINI_API_KEY` and `OPENAI_API_KEY` in `.env`

### When to Run Manual Tests

**✅ Good Times to Run Manual Tests**:
- Before major releases
- After significant LLM integration changes
- When testing new API integrations
- Performance benchmarking
- Debugging production issues

**❌ Avoid Running Manual Tests**:
- During regular development
- In CI/CD pipelines (unless explicitly required)
- When testing unrelated features
- Multiple times in quick succession

### Manual Test Coverage

The manual test suite covers:

1. **Real Report Generation**:
   - Morning report with actual API calls
   - Evening report with actual API calls
   - Content quality validation
   - Performance benchmarking

2. **API Integration Testing**:
   - LLM service with real API calls
   - News collection from actual RSS feeds
   - Error handling and fallback mechanisms
   - Rate limit handling

3. **Performance Benchmarking**:
   - Report generation timing
   - API response times
   - Memory usage patterns

## Test Environment Setup

### Required Environment Variables
```bash
# Required for manual tests
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # Optional but recommended

# Database (auto-created for tests)
DATABASE_PATH=data/test.db
```

### Database Setup
Tests automatically create and clean up test databases. No manual setup required.

## Debugging Tests

### Common Issues and Solutions

1. **Tests timing out**:
   ```bash
   # Increase timeout for specific tests
   npm run test:manual -- --testTimeout=300000
   ```

2. **API rate limits**:
   ```bash
   # Add delays between manual test runs
   # Check API quota usage in provider dashboards
   ```

3. **Database connection issues**:
   ```bash
   # Clean up test databases
   rm -f data/test*.db
   npm run test:e2e
   ```

4. **Port conflicts**:
   ```bash
   # Kill processes using test ports
   lsof -ti:3001 | xargs kill -9
   ```

### Debugging Commands
```bash
# Run specific test with debug output
npm run test:debug -- --testNamePattern="specific test"

# Run tests with verbose output
npm test -- --verbose

# Run single test file
npm test -- src/modules/reports/reports.service.spec.ts
```

## Test Data Management

### Mock Data Strategy
- **Unit Tests**: Use Jest mocks and test doubles
- **Integration Tests**: Use mock news data and test database
- **Manual Tests**: Use real data from external APIs

### Test Database
- Automatically created and destroyed for each test run
- Separate from development database
- No manual cleanup required

## Best Practices

### Writing Tests
1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: `should_generate_report_when_news_available`
3. **One Assertion Per Test**: Focus on single behavior
4. **Clean Setup/Teardown**: Avoid test interdependencies

### Running Tests
1. **Run unit tests frequently** during development
2. **Run integration tests** before commits
3. **Run manual tests sparingly** and with purpose
4. **Never run manual tests in CI/CD** unless explicitly required

### Performance Considerations
- Unit tests: < 1 second per test
- Integration tests: < 30 seconds per test
- Manual tests: < 5 minutes per test

## Troubleshooting

### Common Error Messages

1. **"API key not found"**:
   - Check `.env` file has `GEMINI_API_KEY`
   - Verify API key is valid and active

2. **"Test timeout"**:
   - API call took too long
   - Check network connectivity
   - Verify API service status

3. **"Database connection failed"**:
   - Ensure SQLite permissions
   - Check disk space
   - Verify database path

4. **"Rate limit exceeded"**:
   - Wait before running manual tests again
   - Check API quota usage
   - Consider using fallback APIs

### Getting Help

For testing issues:
1. Check this README for common solutions
2. Review test logs for specific error messages
3. Verify environment variables and API keys
4. Check external service status (Gemini, OpenAI)

## Test Metrics

### Expected Performance
- Unit tests: ~50-100ms per test
- Integration tests: ~5-30 seconds per test
- Manual tests: ~30 seconds - 5 minutes per test

### Coverage Goals
- Unit test coverage: > 80%
- Integration test coverage: > 60%
- Manual test coverage: Critical paths only

## Continuous Integration

### Automated Testing (CI)
```yaml
# These tests run automatically in CI/CD
- Unit tests (npm test)
- Integration tests (npm run test:e2e)
- Lint checks (npm run lint)
- Build verification (npm run build)
- Security audit (npm audit)
```

### Manual Testing (Local Only)
```bash
# These tests are NOT run in CI/CD
npm run test:manual
```

## Summary

- **Unit Tests**: Run frequently, fast, no external dependencies
- **Integration Tests**: Run before commits, moderate speed, mocked externals
- **Manual Tests**: Run sparingly, slow, real API calls, excluded from CI/CD

Use the appropriate test type for your needs and always consider the cost and time implications of manual testing.