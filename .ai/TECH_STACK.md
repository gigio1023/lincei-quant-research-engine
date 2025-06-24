# TECH_STACK.md - AI Reference

## CURRENT STATE (2025-06-24)

### Frontend: Vite + React 19
```json
{
  "build": "vite@7.0.0",
  "framework": "react@19.1.0",
  "typescript": "5.8.3",
  "lint": "eslint@9.29.0",
  "test": "vitest@3.2.4",
  "css": "tailwindcss@3.4.17"
}
```

### Backend: NestJS
```json
{
  "framework": "nestjs@11.1.3", 
  "database": "sqlite3@5.1.7 + typeorm@0.3.24",
  "typescript": "5.8.3",
  "test": "jest@30.0.0"
}
```

## CRITICAL COMMANDS

### Frontend
```bash
npm run dev       # dev server :3000
npm run build     # production build
npm run lint      # eslint check
npm run test:run  # vitest run
```

### Backend  
```bash
npm run start:dev # dev server :3001
npm run build     # nest build
npm run lint      # eslint + fix
npm run test:all  # jest + e2e
```

## FILE STRUCTURE
```
frontend/
├── vite.config.ts        # vite + vitest config
├── index.html           # entry point
├── src/main.tsx         # react entry
├── tailwind.config.js   # css config
└── tsconfig.app.json    # TS config

backend/
├── src/modules/         # feature modules
│   ├── reports/        # core business logic
│   ├── news/          # RSS collection
│   └── llm/           # AI integration
└── test/               # e2e tests
```

## MIGRATION NOTES
- ✅ React Scripts → Vite (완료 2025-06-24)
- ✅ Jest → Vitest setup (ready)
- ✅ ESLint 9 flat config
- ✅ TypeScript 5.8 strict mode
- ✅ 0 vulnerabilities maintained

## PACKAGE PATTERNS
```bash
# Add dependency
npm install package@latest

# Dev dependency  
npm install --save-dev package@latest

# Security audit
npm audit --audit-level=moderate

# Clean install
npm ci
```

## TYPE DEFINITIONS
```typescript
// Frontend types
interface Report {
  id: number;
  title: string;
  content: string;
  reportType: 'morning' | 'evening';
  marketData?: Record<string, unknown>;
}

// Backend entities
@Entity() class Report {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column('text') content: string;
}
```

## CI/CD COMPATIBILITY
```yaml
# Works with current .github/workflows/
- npm ci
- npm run lint  
- npm run build
- npm run test:coverage
- npm audit --audit-level=moderate
```

## PERFORMANCE METRICS
- Build: ~1s (was ~2min with CRA)
- Dev start: ~1s (was ~10s)
- HMR: instant
- Bundle: optimized tree-shaking

## COMMON ISSUES & SOLUTIONS
```bash
# ESLint errors
npm run lint:fix

# Type errors  
npx tsc --noEmit

# Cache issues
rm -rf node_modules package-lock.json && npm install

# Vite build fails
npm run build 2>&1 | grep error
```