# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Language Requirements
- **All documentation, commit messages, and pull requests MUST be written in English**
- **All code comments and technical documentation should be in English**
- **Maintain consistency with English-only technical communication**

## Core Direction
- The project is being redesigned as a LEAN/QuantConnect + LLM autonomous alpha system. The core loop is data -> alpha -> LEAN backtest/insight -> portfolio target -> risk -> execution -> reconciliation.
- When choosing implementation work, prioritize the core alpha/execution loop over surrounding UI, report, or ledger polish.
- Inferring implicit requirements from the user's goal is encouraged, but inferred work must directly advance the core loop or remove a blocker.
- A dashboard or report surface is secondary if the LEAN/QuantConnect runtime, alpha model, portfolio construction, risk/execution path, broker adapter, or reconciliation loop is missing.

## Security & Quality Standards
- **Always run `npm audit fix --force` to fix vulnerabilities**
- **Execute all CI tests locally before committing**
- **Maintain 0 ESLint errors and 0 security vulnerabilities**
- **MANDATORY: Run code quality checks before any commit**
- **MANDATORY: After ANY code changes (backend or frontend), run ALL tests to ensure CI passes. Check .github/workflows/pr-quality-check.yml for the exact tests that will run in CI (build verification is not required locally)**

### Pre-Commit Quality Checklist
```bash
# REQUIRED: Run these commands before every commit
# Backend
cd backend
npm run lint            # Fix ESLint errors
npm run format    # Verify Prettier formatting
npm run test:all        # Run all tests
npm run build           # Verify build succeeds

# Frontend  
cd frontend
npm run lint            # Fix ESLint errors
npm run format    # Verify Prettier formatting (if available)
npm run test:coverage   # Run tests with coverage
npm run build           # Verify build succeeds

# Security audit
npm audit --audit-level=moderate  # Both directories
```

## Development Commands

### Backend (NestJS API)
```bash
cd backend

# Development
npm run start:dev        # Hot-reload development server
npm run start:debug      # Debug mode with watch
npm run build           # Production build
npm run start:prod      # Run production build

# Testing
npm run test            # Unit tests
npm run test:watch      # Watch mode
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report
npm run test:all        # All tests (unit + e2e)

# Code Quality
npm run lint            # ESLint check and fix
npm run format          # Prettier formatting
npm run format:check    # Prettier check only
```

### Frontend (Vite + React 19)
```bash
cd frontend

# Development
npm run dev            # Vite dev server (port 3000) - PRIMARY COMMAND
npm run build          # Production build (TypeScript + Vite)
npm run preview        # Preview production build

# Testing
npm run test           # Vitest interactive mode
npm run test:run       # Vitest single run
npm run test:coverage  # Coverage report with Vitest
npm run test:ui        # Vitest UI dashboard

# Code Quality
npm run lint           # ESLint check (strict mode)
npm run lint:fix       # ESLint check and fix
npm run format         # Prettier formatting
npm run format:check   # Prettier check only
```

## Pre-Commit Quality Check (CI Simulation)

**MANDATORY: Run these commands before every commit to ensure CI passes**

### Complete Local CI Check
```bash
# Backend quality check
cd backend
npm ci                           # Clean install
npm run lint                     # ESLint validation
npm run format:check             # Prettier validation
npm run test                     # Unit tests
npm run test:e2e                 # End-to-end tests
npm run test:cov                 # Generate coverage
npm run build                    # Production build test
npm audit --audit-level=moderate # Security check

# Frontend quality check  
cd frontend
npm ci                           # Clean install
npm run lint                     # ESLint validation (strict)
npm run format:check             # Prettier validation
npm run test:run                 # Vitest run all tests
npm run test:coverage            # Generate coverage
npm run build                    # Production build test
npm audit --audit-level=moderate # Security check

# Docker build test (optional)
cd ..
docker-compose build --no-cache  # Full stack build
```

### Quick Quality Check (Essential)
```bash
# Backend essentials
cd backend && npm run lint && npm run test:all && npm run build

# Frontend essentials  
cd frontend && npm run lint && npm run test:run && npm run build

# Security check
npm audit --audit-level=moderate
```

### Emergency Fix Commands
```bash
# Fix common issues automatically
npm run lint:fix && npm run format  # Fix code style
npm audit fix --force              # Fix security issues
rm -rf node_modules package-lock.json && npm install # Reset dependencies
```

### Docker Deployment
```bash
# Full stack deployment
docker-compose up --build    # Build and start all services
docker-compose up -d         # Run in background
docker-compose down          # Stop services
docker-compose logs -f       # View logs
```

## Core Architecture

### Backend System (NestJS)
- **Reports Module**: Central orchestrator for investment report generation
- **News Module**: RSS feed collection and news aggregation from multiple sources
- **LLM Module**: AI-powered analysis using Gemini 2.5 Flash (primary) and GPT-4.1-nano (fallback)
- **Scheduler Service**: Automated cron jobs for report generation (8 AM, 6 PM KST)

### Frontend System (React 19)
- **Single Page Application** with React Router
- **Tailwind CSS** with glassmorphism effects
- **TypeScript** for type safety
- **Axios** for API communication

### Data Flow Architecture
1. **News Collection**: RSS feeds → NewsService → SQLite database
2. **Report Generation**: Scheduler triggers → ReportsService → NewsService (fetch) → LLMService (analyze) → Database storage
3. **Frontend Display**: API requests → Reports list/detail views → User interface

## Key Configuration Files

### Backend Configuration
- **Environment Setup**: `backend/.env` (requires GEMINI_API_KEY)
- **Database**: SQLite at `backend/data/investment.db`
- **TypeScript**: `backend/tsconfig.json`
- **Scheduling**: Cron expressions in `backend/src/modules/reports/scheduler.service.ts`
- **News Sources**: RSS feeds configured in `backend/src/modules/news/news.service.ts`
- **AI Models**: Model selection and fallback logic in `backend/src/modules/llm/llm.service.ts`

### Frontend Configuration (Vite)
- **Build Config**: `frontend/vite.config.ts` (Vite + Vitest settings)
- **TypeScript**: `frontend/tsconfig.app.json` (app), `frontend/tsconfig.node.json` (build tools)
- **Styling**: `frontend/tailwind.config.js` (TailwindCSS + plugins)
- **PostCSS**: `frontend/postcss.config.js` (CSS processing)
- **ESLint**: `frontend/eslint.config.js` (flat config format)
- **Entry Point**: `frontend/index.html` → `frontend/src/main.tsx`
- **Types**: `frontend/src/types/index.ts` (shared type definitions)

## Investment Report Generation

### Automated Scheduling
- **Morning Reports**: Daily 8:00 AM KST (`0 8 * * *`)
- **Evening Reports**: Daily 6:00 PM KST (`0 18 * * *`)
- **Optional Midday**: 12:00 PM KST (env: `ENABLE_MIDDAY_REPORT=true`)
- **Weekly Outlook**: Sundays 7:00 PM KST (env: `ENABLE_WEEKLY_REPORT=true`)

### Batch Processing Only
- Reports are generated automatically by scheduled cron jobs
- Manual generation endpoints available for testing/development
- System maintains cost control through automated scheduling

### News Sources Integration
- **Korean**: 연합뉴스 경제, 매일경제
- **International**: BBC Business, Federal Reserve feeds
- **Processing**: RSS parsing → content cleaning → database storage → AI analysis

## API Endpoints

### Reports (Read-Only)
- `GET /reports` - Paginated reports list
- `GET /reports/:id` - Specific report details

### System & Monitoring
- `GET /news/stats` - Collection statistics
- `GET /scheduler/status` - Batch job status
- `GET /health` - Service health check

### Testing & Development Endpoints
- `POST /reports/test/generate/:type` - Manual report generation (morning/evening)
- `POST /reports/test/news/collect` - Manual news collection
- `POST /reports/test/flow/full` - Complete pipeline test
- `GET /reports/test/flow/status` - System status overview
- `GET /test/health` - Comprehensive system health check
- `POST /test/suites/:name/run` - Execute specific test suite
- `POST /test/data/mock-news` - Create mock news for testing
- `DELETE /test/data/cleanup` - Clean up test data

## Testing Strategy

This project implements a comprehensive testing strategy specifically designed for batch processing systems. See [TESTING.md](TESTING.md) for complete documentation.

### Testing Challenges for Batch Systems
- **Scheduled Operations**: Cannot wait for cron jobs during testing
- **External Dependencies**: RSS feeds, LLM APIs, and network services
- **Data Flow Validation**: End-to-end pipeline testing
- **Performance Testing**: Resource usage and timing validation

### Manual Trigger System
Since the system is primarily batch-driven, manual trigger endpoints enable immediate testing:

```bash
# Test complete data flow
curl -X POST http://localhost:3001/reports/test/flow/full

# Generate specific report type
curl -X POST http://localhost:3001/reports/test/generate/morning

# Test news collection only
curl -X POST http://localhost:3001/reports/test/news/collect
```

### Test Suites Available
1. **news-collection**: RSS feed parsing, data storage, error handling
2. **report-generation**: LLM integration, content validation, performance
3. **integration**: End-to-end pipeline testing with mock data

### Mock Data Strategy
- **Predictable Testing**: Uses controlled mock news data
- **Isolated Tests**: No dependency on external RSS feeds
- **Performance Validation**: Consistent data volume for timing tests
- **Cleanup**: Automatic test data removal

### Testing Service Architecture
```typescript
// Example usage
const testingService = new TestingService();

// Create controlled test environment
await testingService.createMockNews(5);

// Run comprehensive test suite
const results = await testingService.runTestSuite('integration');

// Validate system health
const health = await testingService.getSystemHealth();

// Clean up after testing
await testingService.cleanupTestData();
```

### Backend Testing (Jest)
- **Unit Tests**: `*.spec.ts` files alongside source code
- **E2E Tests**: `test/*.e2e-spec.ts` for full API workflows
- **Integration Tests**: `test/integration/*.e2e-spec.ts` for data flow validation
- **Coverage**: Comprehensive coverage reports available

### Frontend Testing (Vitest)
- **Component Tests**: React Testing Library with Vitest
- **API Tests**: Service layer testing with mocked responses
- **Integration**: User interaction testing with Vitest

### Performance Testing
- **Time Limits**: News collection < 30s, Report generation < 60s
- **Resource Monitoring**: Memory usage, CPU utilization tracking
- **Concurrent Processing**: Multiple report generation validation
- **LLM Response Time**: Timeout and fallback mechanism testing

### Test Data Management
```bash
# Create mock news for testing
POST /test/data/mock-news
{
  "count": 5
}

# Clean up all test data
DELETE /test/data/cleanup
```

### Continuous Integration
```bash
# Backend tests
npm run test:all        # All tests (unit + e2e)
npm run test           # Unit tests only
npm run test:e2e       # E2E tests only
npm run test:cov       # Coverage report

# Frontend tests  
npm run test:run       # Run all tests once
npm run test:coverage  # Coverage report
npm run test           # Watch mode (development)
```

### CI Simulation Commands
```bash
# Simulate complete CI pipeline locally
cd backend && npm ci && npm run lint && npm run test:all && npm run build
cd frontend && npm ci && npm run lint && npm run test:coverage && npm run build

# Security audit simulation
cd backend && npm audit --audit-level=moderate
cd frontend && npm audit --audit-level=moderate

# Quick smoke test
cd backend && npm run start:dev &
sleep 5 && curl http://localhost:3001/health
cd frontend && npm run build && npx serve -s dist -p 3000 &
sleep 5 && curl http://localhost:3000

# Emergency CI debug
cd backend && npm run lint 2>&1 | head -20
cd frontend && npm run build 2>&1 | grep -i error
```

## Development Patterns

### Error Handling
- **LLM Fallback**: Gemini failure → OpenAI fallback → Default analysis message
- **Rate Limiting**: Exponential backoff for API rate limits
- **News Collection**: Individual source failures don't break entire collection

### Data Management
- **TypeORM Entities**: `news-source.entity.ts`, `report.entity.ts`
- **TypeScript Types**: Shared interfaces in `frontend/src/types/`
- **Database Migrations**: Handled by TypeORM auto-sync in development

### Code Quality Standards
- **ESLint + Prettier** configured for both frontend and backend
- **TypeScript Strict Mode** enabled
- **Import Path Aliases**: `@/` for backend source root

## AI Integration Details

### Model Configuration
- **Primary**: Gemini 2.5 Flash Pro (cost-effective, fast)
- **Fallback**: GPT-4.1-nano (reliability backup)
- **Timeout**: 30 seconds per request
- **Temperature**: 0.7 for balanced creativity/consistency

### Investment Analysis Focus
- **Target Audience**: 27-year-old value investor
- **Investment Philosophy**: Long-term value investing, inflation hedge, portfolio diversification
- **Analysis Style**: Conservative, data-driven, practical recommendations

## Environment Variables

### Required
- `GEMINI_API_KEY` - Primary AI model access
- `OPENAI_API_KEY` - Fallback model (optional but recommended)

### Optional
- `ENABLE_MIDDAY_REPORT=true` - Additional daily report at noon
- `ENABLE_WEEKLY_REPORT=true` - Sunday evening market outlook
- `ENABLE_PERIODIC_NEWS_COLLECTION=true` - Every 2 hours news collection
- `NOTIFICATION_WEBHOOK_URL` - External notification system integration

## Project Structure

### Backend (NestJS) Structure
```
src/
├── core/                    # Global NestJS artifacts
│   ├── filters/            # Exception filters
│   ├── guards/             # Authentication/authorization
│   ├── interceptors/       # Request/response transformation
│   └── middleware/         # Request processing
├── shared/                 # Shared utilities and services
│   ├── utils/             # Pure utility functions
│   └── services/          # Cross-module business logic
└── modules/               # Feature modules
    └── reports/           # One module per domain
        ├── controllers/   # HTTP layer
        ├── services/      # Business logic
        ├── entities/      # Database entities
        ├── models/        # DTOs and types
        └── reports.module.ts
```

### Frontend (Vite + React 19) Structure
```
frontend/
├── index.html              # Entry HTML (Vite style)
├── vite.config.ts          # Vite build + Vitest config
├── tailwind.config.js      # TailwindCSS configuration
├── tsconfig.app.json       # TypeScript app config
├── tsconfig.node.json      # TypeScript build tools config
├── eslint.config.js        # ESLint flat config
├── public/                 # Static assets
│   ├── favicon.ico
│   └── manifest.json
└── src/
    ├── main.tsx            # React entry point (Vite style)
    ├── App.tsx             # Main app component
    ├── components/         # Shared UI components
    │   ├── ui/            # Base UI components (Button, Card, etc.)
    │   ├── Header.tsx
    │   ├── ReportsList.tsx
    │   ├── ReportDetail.tsx
    │   └── TestingDashboard.tsx
    ├── services/           # API layer
    │   └── api.ts         # Axios-based API client
    ├── types/              # TypeScript definitions
    │   └── index.ts       # Shared interfaces
    ├── setupTests.ts       # Vitest + testing-library setup
    └── index.css          # Global styles + Tailwind imports
```

## Development Workflow

### MANDATORY: Code Quality Gates
Every code implementation MUST follow this workflow:

#### 1. Before Implementation
```bash
# Check current code quality
cd backend && npm run lint && npm run format:check
cd frontend && npm run lint && npm run format:check
```

#### 2. During Implementation  
- Write code following project patterns
- Add/update tests for new functionality
- Run tests frequently: `npm run test:watch` (backend) / `npm run test` (frontend)

#### 3. After Implementation (REQUIRED)
```bash
# Backend quality check
cd backend
npm run lint            # Must pass with 0 errors
npm run format:check    # Must pass - no formatting issues
npm run test:all        # Must pass - all tests green
npm run build           # Must succeed - no TypeScript errors

# Frontend quality check  
cd frontend
npm run lint            # Must pass with 0 errors
npm run format:check    # Must pass (if available)
npm run test:coverage   # Must pass - maintain coverage
npm run build           # Must succeed - no build errors

# Security check (both)
npm audit --audit-level=moderate  # Must show 0 vulnerabilities
```

#### 4. Pre-Commit Verification
```bash
# Final check - simulate CI locally
cd backend && npm ci && npm run lint && npm run test:all && npm run build
cd frontend && npm ci && npm run lint && npm run test:coverage && npm run build
```

**❌ DO NOT COMMIT if any of these steps fail**  
**✅ Only proceed to git commit when ALL checks pass**

### Implementation Rules
- **Fix ALL ESLint errors before committing**  
- **Maintain or improve test coverage**
- **Ensure builds succeed on both backend and frontend**
- **Resolve ALL security vulnerabilities**
- **Follow consistent formatting (Prettier)**

## Development Guidelines

This project follows strict coding standards defined in `.cursor/rules/` for both NestJS backend and React frontend development.

### Core Principles
- **Clarity First**: Code should be immediately understandable without explanations
- **Consistency**: Use the same patterns throughout the entire codebase
- **Type Safety**: Leverage TypeScript to prevent runtime errors
- **Single Responsibility**: Each component/function should do one thing well

### Naming Conventions
- **PascalCase**: Classes, interfaces, enums (`UserService`, `CreateUserDto`)
- **camelCase**: Variables, functions, methods (`getUserById`, `isActive`)
- **kebab-case**: Files and directories (`user-service.ts`, `auth-module/`)
- **UPPERCASE**: Constants and environment variables (`MAX_RETRIES`, `DATABASE_URL`)
- **Functions**: Start with verbs (`createUser`, `validateInput`, `isValid`)
- **Booleans**: Use descriptive names (`isLoading`, `hasPermission`, `canDelete`)

### Code Structure Rules
- **Functions under 20 lines** (backend) / **Components under 150 lines** (frontend)
- **Classes under 200 lines, max 10 public methods**
- **No blank lines within functions**
- **One export per file**
- **Single responsibility per function/class**

## NestJS Backend Standards

### Controller Guidelines
```typescript
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Generates a new investment report
   */
  @Post('generate/:type')
  async generateReport(@Param('type') type: string): Promise<ReportResponseDto> {
    return this.reportsService.generateReport({ type });
  }

  @Get('admin/test')
  healthCheck(): string {
    return 'Reports controller is working';
  }
}
```

**Controller Rules:**
- **Keep controllers thin** - delegate to services
- **Use DTOs for input validation**
- **Always add JSDoc for public methods**
- **Include test endpoint**: `@Get('admin/test')` for smoke testing
- **One controller per main route**

### Service Guidelines
```typescript
@Injectable()
export class ReportsService {
  constructor(private readonly newsService: NewsService) {}

  async generateReport(params: GenerateReportParams): Promise<GenerateReportResult> {
    const news = await this.newsService.getLatestNews();
    
    if (!news.length) {
      throw new BadRequestException('No news data available for report generation');
    }

    return this.processReport({ news, type: params.type });
  }
}
```

**Service Rules:**
- **One service per entity**
- **Handle business logic only**
- **Use dependency injection**
- **Return typed results**
- **Use early returns** instead of nested if-else

### Error Handling
```typescript
// ✅ Good: Specific exception with context
if (!report) {
  throw new NotFoundException(`Report with id ${id} not found`);
}

// ✅ Good: Adding context before re-throwing
try {
  return await this.llmService.analyzeNews(news);
} catch (error) {
  throw new ServiceUnavailableException('AI analysis service is down', error.message);
}
```

**Error Handling Rules:**
- **Use NestJS built-in exceptions** (`BadRequestException`, `NotFoundException`)
- **Add context to errors** before re-throwing
- **Use global exception filters** for consistent error responses
- **Create custom exceptions** only when needed

### Testing Patterns
```typescript
describe('ReportsService', () => {
  describe('generateReport', () => {
    it('should_create_report_successfully_with_valid_data', async () => {
      // Arrange
      const inputData = { type: 'morning' };
      const expectedResult = { id: '1', type: 'morning', content: 'Report content' };
      mockNewsService.getLatestNews.mockResolvedValue([mockNews]);

      // Act
      const actualResult = await reportsService.generateReport(inputData);

      // Assert
      expect(actualResult).toEqual(expectedResult);
      expect(mockNewsService.getLatestNews).toHaveBeenCalled();
    });
  });
});
```

**Testing Rules:**
- **Follow AAA pattern**: Arrange, Act, Assert
- **Use descriptive test names**: `should_throw_exception_when_user_not_found`
- **Clear variable naming**: `inputData`, `mockService`, `actualResult`, `expectedResult`
- **Test all public methods**
- **Unit tests**: Every public method in services and controllers
- **E2E tests**: Every API module

## React Frontend Standards

### Component Guidelines
```typescript
// ✅ Good: Functional component with explicit props
interface ReportCardProps {
  report: Report;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export const ReportCard = ({ report, onSelect, isSelected = false }: ReportCardProps) => {
  const handleClick = useCallback(() => {
    onSelect(report.id);
  }, [report.id, onSelect]);

  return (
    <div className={`report-card ${isSelected ? 'selected' : ''}`} onClick={handleClick}>
      <h3>{report.title}</h3>
      <p>{report.summary}</p>
    </div>
  );
};
```

**Component Rules:**
- **Always use functional components** with explicit prop interfaces
- **Never use React.FC** (it's deprecated)
- **Keep components under 150 lines** - extract when larger
- **Use TypeScript strict mode**
- **Don't mix default and named exports** in the same file

### Component Organization
```typescript
// 1. External imports
import { useState, useEffect } from 'react';

// 2. External libraries
import axios from 'axios';

// 3. Internal absolute imports
import { Button } from '@/components/Button';

// 4. Relative imports
import { formatDate } from './utils';

// 5. Types
import type { Report } from '@/types';

// Component definition...
```

### State Management
```typescript
// ✅ Good: Custom hook for complex logic
const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchReports().then(setReports).finally(() => setIsLoading(false));
  }, []);
  
  return { reports, isLoading };
};
```

**State Management Rules:**
- **useState for local state**
- **Extract complex logic to custom hooks**
- **Use type inference** where possible
- **Don't put business logic in components**

### Performance Optimization
```typescript
// ✅ Use React.memo for expensive components
export const ExpensiveReportList = React.memo(({ reports }: Props) => {
  return (
    <div>
      {reports.map(report => <ReportCard key={report.id} report={report} />)}
    </div>
  );
});

// ✅ Use useCallback for stable references
const handleReportSelect = useCallback((reportId: string) => {
  setSelectedReport(reportId);
}, []);

// ✅ Code splitting
const ReportDetails = lazy(() => import('./ReportDetails'));
```

### File Naming Conventions
- **Components**: `PascalCase.tsx` (e.g., `ReportCard.tsx`)
- **Hooks**: `camelCase.ts` starting with 'use' (e.g., `useReports.ts`)
- **Utils**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `camelCase.ts` or `PascalCase.ts` (e.g., `types.ts`, `Report.ts`)

## Advanced TypeScript Patterns

### Type Safety Rules
```typescript
// ✅ Good: Avoid primitive obsession
interface ReportConfig {
  type: 'morning' | 'evening';
  sources: string[];
  aiModel: 'gemini' | 'openai';
}

// ✅ Good: Use readonly for immutable data
interface ReadonlyReport {
  readonly id: string;
  readonly createdAt: Date;
  readonly content: string;
}

// ✅ Good: Use as const for literal values
const REPORT_TYPES = ['morning', 'evening'] as const;
type ReportType = typeof REPORT_TYPES[number];

// ✅ Good: Use unknown instead of any
const processApiResponse = (data: unknown) => {
  if (isReportData(data)) {
    // Type is now narrowed
    return data;
  }
  throw new Error('Invalid data format');
};
```

### Key Development Rules
1. **Never use `any` type** - Use `unknown` and type guards instead
2. **Always declare types** for variables, parameters, and return values
3. **Create interfaces** for object structures
4. **Use enums** for fixed sets of values
5. **Prefer higher-order functions** (map, filter, reduce) over loops
6. **Use default parameters** instead of null/undefined checks
7. **Use RO-RO pattern** for complex parameters
8. **Write self-documenting code** - Clear names over comments
9. **Follow single responsibility** - One purpose per function/component
10. **Maintain consistent code style** - ESLint and Prettier configurations

## Common Pitfalls to Avoid

### Backend (NestJS)
- ❌ Using `any` type
- ❌ Large functions (>20 lines)
- ❌ Business logic in controllers
- ❌ Missing error handling
- ❌ Unclear variable names
- ❌ Multiple responsibilities in one class
- ❌ Missing input validation
- ❌ Inconsistent naming conventions
- ❌ No tests for public methods
- ❌ Missing JSDoc documentation

### Frontend (React)
- ❌ Using `React.FC` (it's deprecated)
- ❌ Mixing default and named exports in the same file
- ❌ Putting business logic in components
- ❌ Ignoring TypeScript errors
- ❌ Creating deeply nested folder structures
- ❌ Using index.tsx for component files (makes debugging harder)
- ❌ Not using path aliases (@/) for imports
- ❌ Missing prop interfaces
- ❌ Not extracting custom hooks for complex logic
- ❌ Ignoring performance optimization opportunities
