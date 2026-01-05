# Coding Convention & AI Collaboration Guide

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05

## 1. Core Principles

- **"Trust, but Verify"**: AI generates code, but User (Human) or Tests must verify logic. AI가 생성한 코드는 무조건 실행 및 검증해야 합니다.
- **Simplicity Over Cleverness**: Write code that a 50-year-old non-developer might *almost* understand. Explicit is better than implicit.
- **MVP First**: 복잡한 최적화보다 **"작동하는 단순함"**을 우선합니다.
- **Mobile First**: Always consider how a UI element looks on a 360px wide screen before calling it done.
- **Atomic Commits**: 하나의 Task(기능) 단위로 커밋합니다. "Feat: ~", "Fix: ~" 컨벤션 준수.

## 2. Tech Stack Specifics

### Markdown / Documentation
- **Code Comments & Commits**: Use English (universal standard)
- **UI Text**: Use Korean (User requirement)
- **Documentation**: Bilingual where appropriate (Korean for user-facing, English for technical)

### TypeScript
- **Strict Mode**: Always on. `any` 타입 사용 지양.
- **Type Safety**: No `any`. Define Interfaces for all Props and DB entities.
- **Interfaces**: Define strictly in `/types` folder
  - Example: `interface OrderProps { id: string; amount: number; status: OrderStatus; }`
  - Example: `interface AnalysisResult { structure: Section[]; colors: Color[]; keywords: string[]; }`

### Next.js (App Router)
- **Server Components**: 기본적으로 서버 컴포넌트 사용. 인터랙션이 필요한 말단 컴포넌트만 `'use client'` 지시어 사용.
- **Functional Components**: Always use `const Component = () => {}`
- **Data Fetching**: `fetch` API 활용 및 Server Actions 권장
- **File Naming**:
  - **Components**: PascalCase (`OrderCard.tsx`, `DashboardLayout.tsx`)
  - **Utilities/Hooks**: camelCase (`formatDate.ts`, `useAuth.ts`, `useOrderLogic.ts`)
  - **Pages/Routes**: lowercase with hyphens (`order-details/page.tsx`)

### Tailwind CSS
- **Utility First**: 별도 CSS 파일 생성 지양. Avoid arbitrary values.
- **Clsx/Merge**: 조건부 스타일링 시 `clsx`와 `tailwind-merge` 조합 사용
- **Theme Tokens**: Use theme tokens (`w-32`) instead of arbitrary values (`w-[123px]`)
  ```typescript
  import { cn } from "@/lib/utils"
  
  <div className={cn(
    "base-class",
    condition && "conditional-class"
  )} />
  ```

### Supabase & Database
- **Column Naming**: Use **Snake Case** for DB columns (`order_date`, `user_id`, `created_at`)
- **Variable Naming**: Use **Camel Case** for JS variables transformed from DB (`orderDate`, `userId`, `createdAt`)
- **Type Transformation**: Always transform DB responses to camelCase in client code
  ```typescript
  // Database response
  const { order_date, user_id } = dbResponse
  
  // Transform to camelCase
  const order = { orderDate: order_date, userId: user_id }
  ```

## 3. Architecture & Modularity

### Folder Structure
```
/app                    # Next.js App Router pages
/components             # Shared UI components
  /ui                   # Shadcn base components
  /layout               # Layout components (Header, Sidebar)
  /features             # Feature-specific components
/lib                    # Utilities, helpers
  /supabase             # Supabase clients
  /utils                # Helper functions
/types                  # TypeScript interfaces
/features               # Feature-based modules (optional)
  /orders
    /components
    /hooks
    /actions
```

### Separation of Concerns
- **UI Components (Look)**: Presentational components, no business logic
- **Hooks (Logic)**: Extract complex logic into custom hooks (`useOrderLogic.ts`)
- **Services/Lib (API, Database calls)**: Centralize API calls and data fetching

### Feature-Based Organization
- **Consideration**: 기능별로 폴더를 묶는 것을 고려 (e.g., `/features/analysis/components/...`)
- **When to use**: When a feature has 3+ components/hooks/services

## 4. Error Handling & Security

### Graceful Degradation
- **AI API Failures**: 전체 앱이 죽지 않고 "분석 실패, 다시 시도해주세요" 메시지 표시
- **Network Errors**: Show user-friendly error messages with retry options
- **User-Friendly Messages**: Technical errors translated to user-friendly Korean messages

### Environment Variables
- **API Keys**: 절대 클라이언트 번들에 포함되지 않도록 `NEXT_PUBLIC_` 접두사 주의
- **Server-Side Only**: OpenAI API Key 등 민감 정보는 서버 사이드 환경 변수로만 관리
- **Never Commit**: Never commit `.env` files. Use `.env.example` for template

### Security Checklist
- [ ] Ensure RLS (Row Level Security) is enabled on all Supabase tables
- [ ] Validate all inputs on both Client and Server side
- [ ] Never expose API keys to client
- [ ] Sanitize user inputs to prevent XSS
- [ ] Use parameterized queries to prevent SQL injection

## 5. Git & Version Control

### Commit Messages (Conventional Commits)
- **feat**: Add new feature
  - Example: `feat: Add order filtering by status`
- **fix**: Bug fixes
  - Example: `fix: Resolve mobile table overflow`
- **docs**: Documentation updates
  - Example: `docs: Update PRD with new features`
- **style**: Code style changes (formatting, no logic change)
  - Example: `style: Adjust button padding`
- **refactor**: Code refactoring
  - Example: `refactor: Extract order logic to custom hook`
- **test**: Add or update tests
  - Example: `test: Add unit tests for order validation`
- **chore**: Maintenance tasks
  - Example: `chore: Update dependencies`

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch
- **feature/**: Feature branches (e.g., `feature/order-management`)
- **fix/**: Bug fix branches (e.g., `fix/mobile-nav`)

## 6. AI Prompting Strategy (for User)

### Effective Prompting
- **Reference Documents**: When asking for code, reference the **Document Filenames**
  - ❌ Bad: "Make the login page."
  - ✅ Good: "Implement the Login Page following the design in `5_Design_System.md` and using the auth flow in `2_TRD.md`."

### Context-Aware Requests
- **Current File Context**: 항상 현재 수정하려는 파일의 맥락(주변 코드)을 먼저 읽고 시작
- **Folder Structure**: If AI gets stuck, ask it to "Check the folder structure and verify file paths"

### Step-by-Step Approach
- **Incremental Development**: 한 번에 전체 기능을 짜지 말고:
  1. **뼈대 만들기** (Create skeleton/structure)
  2. **기능 붙이기** (Add functionality)
  3. **스타일링** (Apply styling)
- **Verification**: Test each step before moving to the next

## 7. Code Quality & Testing

### Code Review Checklist
- [ ] TypeScript strict mode passes (no `any`)
- [ ] No console.log in production code
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsive tested
- [ ] Accessibility considered (ARIA labels, keyboard nav)

### Testing Strategy
- **Unit Tests**: Critical business logic (validation, calculations)
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Critical user flows (Playwright)
- **Manual Testing**: Mobile responsiveness, UI/UX

### Performance Considerations
- **Image Optimization**: Use Next.js `<Image>` component
- **Code Splitting**: Lazy load heavy components
- **Bundle Size**: Monitor and optimize bundle size
- **Database Queries**: Use indexes, avoid N+1 queries

## 8. Accessibility & Internationalization

### Accessibility (a11y)
- **Semantic HTML**: Use proper HTML elements (`<button>`, `<nav>`, etc.)
- **ARIA Labels**: Add where semantic HTML isn't enough
- **Keyboard Navigation**: Test all features with keyboard only
- **Color Contrast**: Ensure WCAG 2.1 AA compliance (4.5:1 minimum)

### Internationalization (i18n) - Future
- **Preparation**: Structure code to support i18n
- **Strings**: Avoid hardcoded strings in components (prepare for extraction)
- **Priority**: Low for MVP (Korean only)

## 9. Common Patterns

### Data Fetching Pattern
```typescript
// Server Component (Preferred)
async function OrderList() {
  const orders = await fetchOrders()
  return <OrderTable data={orders} />
}

// Client Component (When needed)
'use client'
function OrderList() {
  const { data, error, isLoading } = useOrders()
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  
  return <OrderTable data={data} />
}
```

### Form Handling Pattern
```typescript
'use client'
function OrderForm() {
  const [loading, setLoading] = useState(false)
  
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await createOrder(formData)
      // Success handling
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false)
    }
  }
  
  return <form action={handleSubmit}>...</form>
}
```

## 10. Resources & References

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Shadcn/UI**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs
