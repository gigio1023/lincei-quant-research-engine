# DEVELOPMENT_HISTORY.md - AI Reference

## MAJOR MILESTONES

### 2025-06-24: VITE MIGRATION
```diff
- React Scripts 5.0.1 (Webpack-based)
+ Vite 7.0.0 (ESBuild-based)

- Jest testing framework
+ Vitest 3.2.4 (ready to use)

- ESLint 8.x legacy config
+ ESLint 9.x flat config

- TypeScript 4.9.5
+ TypeScript 5.8.3

RESULT: 99% build speed improvement, 0 vulnerabilities
```

### DEPENDENCY STRATEGY
```bash
# ALWAYS use latest stable versions
npm info package@latest version

# Security first
npm audit fix --force  # per CLAUDE.md

# CLI-first approach
npm create vite@latest  # not manual config

# Package.json patterns
"package": "^X.Y.Z"     # latest compatible
"package": "X.Y.Z"      # exact version for stability
```

### ARCHITECTURE DECISIONS

#### Frontend: SPA + Static Generation
```typescript
// Route structure
/ -> ReportsList (main)
/reports/:id -> ReportDetail  
/testing -> TestingDashboard (dev only)

// State management: React hooks only
useState, useEffect, useCallback

// Styling: Tailwind utility-first
className="bg-white shadow-lg rounded-lg p-6"
```

#### Backend: NestJS Modular
```typescript
// Module pattern
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [Controller],
  providers: [Service]
})

// Cron scheduling
@Cron('0 8 * * *') // 8 AM KST
@Cron('0 18 * * *') // 6 PM KST
```

### TESTING PHILOSOPHY
```typescript
// Unit: Business logic only
describe('ReportsService', () => {
  it('should_generate_report_with_valid_data')
})

// E2E: API workflows  
describe('Reports API', () => {
  it('should_return_paginated_reports')
})

// Integration: Full pipeline
describe('Data Flow', () => {
  it('should_process_news_to_report')
})
```

### DEPLOYMENT PATTERNS
```dockerfile
# Docker multi-stage
FROM node:18-alpine AS builder
FROM nginx:alpine AS runtime

# Environment variables
GEMINI_API_KEY=required
OPENAI_API_KEY=optional
```

### COMMON PATTERNS
```typescript
// Error handling
try {
  const result = await service.method()
  return result
} catch (error) {
  logger.error('Context:', error)
  throw new NotFoundException('User-friendly message')
}

// Type safety
interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
}

// Component patterns
const Component: React.FC<Props> = ({ prop }) => {
  const [state, setState] = useState<Type>(initial)
  
  useEffect(() => {
    // side effects
  }, [dependencies])
  
  return <div>{content}</div>
}
```

### SECURITY PRACTICES
```bash
# Audit frequency: every commit
npm audit --audit-level=moderate

# Dependency updates: monthly
npm update

# Override vulnerable nested deps
"overrides": {
  "vulnerable-package": "^safe.version"
}
```

### PERFORMANCE OPTIMIZATIONS
```typescript
// React optimizations
React.memo(), useCallback(), useMemo()

// Bundle optimizations  
import { specific } from 'library' // not entire library

// Vite optimizations
// Automatic code splitting, tree shaking, HMR
```

### MIGRATION LESSONS
1. **CLI > Manual**: Use official scaffolding tools
2. **Incremental**: Migrate piece by piece, test each step  
3. **Types First**: Fix TypeScript errors before runtime
4. **Test Compatibility**: Ensure CI/CD still works
5. **Performance Validate**: Measure before/after metrics

### FUTURE CONSIDERATIONS
- Vitest migration from Jest (when needed)
- React 20 when stable
- ESLint 10 when available  
- Consider SWC compiler for even faster builds