# Technical Requirements Document (TRD) - SmartStore Comprehensive Solution

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05
> **Status:** Active

## 1. System Architecture (시스템 아키텍처)

### Unified Architecture Diagram
```mermaid
graph TD
    User[User (PC/Mobile)] -->|HTTPS| CDN[Vercel Edge Network]
    CDN -->|SSR/Static| NextJS[Next.js App Router]

    subgraph "Frontend Layer"
        NextJS -->|Auth/Data| SupabaseSDK
        NextJS -->|API Routes| BackendLogic
    end

    subgraph "Backend Services (Serverless)"
        BackendLogic -->|AI Analysis| OpenAI[OpenAI/Gemini API]
        BackendLogic -->|Crawling/Scraping| Naver[Naver Smart Store]
        BackendLogic -->|Notifications| CoolSMS[CoolSMS/Kakao Biz]
        BackendLogic -->|Logistics| HanjinAPI[Hanjin Courier API]
        BackendLogic -->|Payments| Toss[Toss Payments]
    end

    subgraph "Data Layer (Supabase)"
        SupabaseSDK -->|Auth| Auth[Supabase Auth]
        SupabaseSDK -->|Queries| Postgres[PostgreSQL DB]
        SupabaseSDK -->|Files| Storage[Supabase Storage]
        Postgres -->|Triggers| EdgeFunctions
    end
```

### Architecture Principles
- **Serverless Monorepo**: Facilitated by Next.js and Supabase
- **Zero Server Maintenance**: All infrastructure managed via Vercel and Supabase
- **Edge-First**: Leverage CDN and edge functions for performance

## 2. Technology Stack (기술 스택)

### Frontend & Backend (Fullstack)
- **Framework:** **Next.js 14+ (App Router)**
  - *Rationale:* Best-in-class React framework, excellent SEO, easy deployment to Vercel, robust routing, Server/Client component pattern, 반응형 웹과 서버리스 API를 동시에 구축하기 최적
  - *Alternatives Considered:* React (SPA) - rejected due to SEO needs and routing complexity
- **Language:** **TypeScript**
  - *Rationale:* 안정성 및 유지보수 용이, Type safety across stack
- **Styling:** **Tailwind CSS** + **Shadcn/UI**
  - *Rationale:* 빠른 UI 개발 및 반응형 적용, Highly customizable, "Admin" aesthetic out-of-the-box
- **State Management:** **Zustand** or **React Query** (TanStack Query)
  - *Rationale:* Efficient server state management and simple client state

### Database & Backend Services (Serverless)
- **Platform:** **Supabase** (PostgreSQL 기반)
  - *Rationale:* Provides Auth, DB (PostgreSQL), Realtime, and Storage in one free/low-cost package. No server maintenance required.
  - *Lock-in Risk:* Moderate. Mitigation: Uses standard PostgreSQL, migration is possible if needed.
- **Database:** **PostgreSQL** (via Supabase)
  - *Rationale:* Relational data integrity is crucial for orders and inventory, JSONB 활용하여 유동적인 분석 데이터 저장
- **Auth:** **Supabase Auth**
  - Email/Password + Naver Social Login 연동
- **Storage:** **Supabase Storage**
  - 분석용 스크린샷, 크롭 이미지 저장
  - Temporary generated images deleted after 30 days if not saved

### Infrastructure & Deployment
- **Hosting:** **Vercel**
  - *Rationale:* Zero-config deployment for Next.js, generous free tier, Next.js 최적화, 무중단 배포
- **CI/CD:** GitHub Actions + Vercel Automatic Deployments

## 3. External Integrations

### API Services
| Service | Purpose | Use Case | Alternative |
| :--- | :--- | :--- | :--- |
| **OpenAI API (GPT-4o/Vision)** | AI Analysis, Content Generation | 텍스트 및 비전 분석 (구조/디자인/카피), Generative AI for Detail Pages | Anthropic Claude, Gemini |
| **CoolSMS / Aligo** | SMS/Kakao Notifications | Sending SMS/Kakao Notifications (Order to Supplier) | Twilio (Global, more expensive) |
| **Hanjin Courier API** | Logistics Integration | Tracking & Invoice Registration | Manual Excel Upload (Fallback) |
| **Toss Payments** | Payment Processing | 유료화 대비 결제 시스템 | Stripe, PayPal |

### Target Platforms
- **Naver Smart Store**: cheerio/puppeteer 활용한 스크래핑
  - Fallback: Manual entry if scraping fails
  - 주기적인 파서 업데이트 필요

## 4. Data Requirements (데이터 요구사항)

### Schema Design Principles
- **Normalization**: Normalized relational schema (3NF) for orders and products
- **Flexibility**: 유연성 우선. 분석 항목이 계속 추가될 수 있으므로 `analysis_result` 컬럼은 JSONB 타입으로 설정하여 유동적인 필드 추가에 대응
- **Indexing**: Indexes on frequently queried fields (`order_date`, `status`, `user_id`, `target_url`)

### Data Lifecycle
#### Collection
- 사용자가 요청 시 실시간 수집
- Real-time order sync from Smart Store APIs

#### Retention
- **분석 결과**: 영구 보관 (사용자 히스토리)
- **원본 이미지**: 용량 절감을 위해 30일 후 자동 삭제 또는 리사이징 고려
- **Order Data**: Retained for 5 years (legal requirement)

#### Deletion
- **User Deletion**: 회원 탈퇴 시 모든 개인 데이터 즉시 파기
- **Privacy**: User personal data (PII) minimization; capability to "Hard Delete" on request

### Backup Strategy
- Daily automated backups via Supabase
- Point-in-time recovery enabled

## 5. Security & Permissions (보안 및 권한)

### RBAC (Role-Based Access Control)
| Role | Permissions | Use Case |
| :--- | :--- | :--- |
| **admin** | 모든 데이터 접근, 사용자 관리 | Service administrators |
| **subscriber** | 유료 회원 (무제한 분석, 고급 리포트) | Paid users |
| **user** | 무료 회원 (일 1회 제한) | Free tier users |
| **staff** | Limited access to specific store operations | Part-time helpers |
| **guest** | 접근 불가 (로그인 필수) | Not logged in |

### Security Best Practices
- **Row Level Security (RLS)**: Enabled on all Supabase tables to strictly separate tenant data
- **API Security**:
  - OpenAI API Key 등 민감 정보는 서버 사이드 환경 변수로만 관리
  - 클라이언트에 노출 절대 금지 (`NEXT_PUBLIC_` 접두사 주의)
- **Encryption**:
  - API keys and sensitive user info encrypted at rest
  - HTTPS enforced for all connections
- **Input Validation**:
  - All inputs validated on both Client and Server side
  - Protection against XSS, SQL Injection

## 6. Non-Functional Requirements (비기능 요구사항)

### Performance
- **Page Load**: Dashboard load time < 1.5s on 4G LTE
- **Analysis Speed**: 분석 요청 후 결과 도출까지 30초 이내 (Progress Indicator 필수)
- **API Response**: < 300ms for basic CRUD operations

### Responsiveness
- **Mobile Support**: Fully functional on mobile viewports (360px+)
- **Breakpoints**: Tailwind default breakpoints (sm, md, lg, xl)
- **Touch Targets**: Minimum 44px height for all interactive elements

### Scalability
- **서버리스 아키텍처**: 트래픽 폭주 시 자동 스케일링
- **Database Design**: Schema normalization to support thousands of orders
- **Designed to handle spike loads**: e.g., promotional periods

### Availability
- **Uptime Goal**: 99.9% 가동률 목표
- **Error Handling**: Graceful degradation when external services fail
- **Monitoring**: Real-time error tracking and performance monitoring

### Accessibility
- **WCAG 2.1**: Level AA compliance target
- **Screen Reader**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard support for all features

## 7. Development Guidelines

### API Design
- RESTful principles for CRUD operations
- Server Actions for form submissions
- Edge Functions for performance-critical operations

### Error Handling Strategy
- **Graceful Degradation**: AI API 호출 실패 시 전체 앱이 죽지 않고 "분석 실패, 다시 시도해주세요" 메시지 표시
- **User-Friendly Messages**: Technical errors translated to user-friendly Korean messages
- **Logging**: Comprehensive error logging for debugging

### Testing Strategy
- **Unit Tests**: Critical business logic
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user flows (Playwright recommended)
- **Manual Testing**: Mobile responsiveness and UI/UX

## 8. Deployment & Operations

### Environment Strategy
- **Development**: Local development with Supabase local instance
- **Staging**: Vercel preview deployments
- **Production**: Vercel production deployment with Supabase production instance

### Monitoring & Observability
- **Application Performance**: Vercel Analytics
- **Error Tracking**: Sentry or similar
- **Database Performance**: Supabase built-in monitoring
- **Cost Monitoring**: Track API usage costs (OpenAI, SMS)

### Rollback Strategy
- **Vercel Instant Rollback**: One-click rollback to previous deployment
- **Database Migrations**: Reversible migrations with down scripts
- **Feature Flags**: Progressive rollout for risky features
