# QUICK_REFERENCE.md - AI Cheat Sheet

## INSTANT COMMANDS

### Development
```bash
# Start both services
cd backend && npm run start:dev &
cd frontend && npm run dev

# Build production
npm run build  # in frontend/
npm run build  # in backend/

# Fix code quality
npm run lint:fix && npm run format

# Full test suite
npm run test:all  # backend
npm run test:run  # frontend
```

### Troubleshooting
```bash
# Common fixes
rm -rf node_modules package-lock.json && npm install
npm audit fix --force
npx tsc --noEmit  # type check only

# Database reset
rm backend/data/investment.db
npm run start:dev  # auto-recreates

# Port conflicts
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## FILE LOCATIONS

### Config Files
```
frontend/vite.config.ts     # Build + test config
frontend/tailwind.config.js # CSS framework
frontend/tsconfig.app.json  # TypeScript rules
backend/src/main.ts         # Server entry
.github/workflows/pr-quality-check.yml # CI
```

### Key Source Files
```
frontend/src/main.tsx       # React entry
frontend/src/App.tsx        # Main component
frontend/src/types/index.ts # Type definitions
backend/src/modules/reports/ # Core business logic
backend/src/modules/news/   # RSS collection
backend/src/modules/llm/    # AI integration
```

## PACKAGE MANAGEMENT

### Update Strategy
```bash
# Check outdated
npm outdated

# Update specific package
npm install package@latest

# Update all (careful!)
npx npm-check-updates -u && npm install

# Verify compatibility
npm run build && npm run test:run
```

### Dependency Types
```json
{
  "dependencies": {
    "react": "^19.1.0"        // Runtime required
  },
  "devDependencies": {
    "vite": "^7.0.0"          // Build time only
  },
  "overrides": {
    "vulnerable": "^safe.ver"  // Force safe version
  }
}
```

## COMMON PATTERNS

### API Call
```typescript
// Frontend
const { data } = await reportsApi.getReports(page, limit)

// Backend  
@Get('reports')
async getReports(@Query() query: PaginationDto) {
  return this.reportsService.findPaginated(query)
}
```

### State Management
```typescript
const [data, setData] = useState<Type[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetchData().then(setData).catch(setError).finally(() => setLoading(false))
}, [dependency])
```

### Styling
```typescript
// Tailwind utility classes
className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow"

// Conditional styles
className={`base-class ${condition ? 'active-class' : 'inactive-class'}`}
```

## TYPE DEFINITIONS

### Common Types
```typescript
interface Report {
  id: number
  title: string
  content: string
  reportType: 'morning' | 'evening'
  createdAt: string
}

interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  limit?: number
}

type Status = 'loading' | 'success' | 'error'
```

### React Component
```typescript
interface Props {
  title: string
  onClick?: () => void
  children?: ReactNode
}

const Component: React.FC<Props> = ({ title, onClick, children }) => {
  return <div onClick={onClick}>{title}{children}</div>
}
```

## ENVIRONMENT

### Development
```bash
PORT=3000  # Frontend dev server
PORT=3001  # Backend API server
```

### Required ENV
```bash
# Backend only
GEMINI_API_KEY=required
OPENAI_API_KEY=optional
DATABASE_PATH=data/investment.db
```

## CI/CD COMPATIBILITY
```yaml
# These commands MUST work in CI
npm ci                    # Install
npm run lint             # Code quality
npm run build            # Production build  
npm run test:coverage    # Test with coverage
npm audit --audit-level=moderate # Security
```

## PERFORMANCE BENCHMARKS
```
Build Time: ~1s (Vite) vs ~2min (CRA)
Dev Start: ~1s vs ~10s  
HMR: instant vs ~3s
Bundle Size: optimized tree-shaking
```

## EMERGENCY COMMANDS
```bash
# Complete reset
git clean -fdx && git reset --hard origin/main
npm install && npm run build

# Fix lockfile corruption  
rm package-lock.json && npm install

# Fix port in use
killall node && npm run dev

# Fix permissions
sudo chown -R $(whoami) node_modules/
```