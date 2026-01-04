# Technical Requirements Document (TRD) - SmartStore Manager

> **Version:** 1.0
> **Date:** 2026-01-04
> **Status:** Draft

## 1. System Architecture
The system follows a **Serverless Monorepo** structure facilitated by Next.js and Supabase.

```mermaid
graph TD
    User[User (PC/Mobile)] -->|HTTPS| CDN[Vercel Edge Network]
    CDN -->|SSR/Static| NextJS[Next.js App Router]
    
    subgraph "Frontend Layer"
        NextJS -->|Auth/Data| SupabaseSDK
        NextJS -->|API Routes| BackendLogic
    end
    
    subgraph "Backend Services (Serverless)"
        BackendLogic -->|Generates Content| OpenAI[OpenAI/Gemini API]
        BackendLogic -->|Sends Notif| CoolSMS[CoolSMS/Kakao Biz]
        BackendLogic -->|Logistics| HanjinAPI[Hanjin Courier API]
    end
    
    subgraph "Data Layer (Supabase)"
        SupabaseSDK -->|Queries| Postgres[PostgreSQL DB]
        SupabaseSDK -->|Files| Storage[Supabase Storage]
        Postgres -->|Triggers| EdgeFunctions
    end
```

## 2. Technology Stack

### Frontend
- **Framework:** **Next.js 14+ (App Router)**
  - *Reason:* Best-in-class React framework, excellent SEO, easy deployment to Vercel, robust routing.
  - *Alternatives:* React (SPA) - rejected due to SEO needs and routing complexity.
- **Styling:** **Tailwind CSS** + **Shadcn/UI**
  - *Reason:* Rapid development, consistency, highly customizable, "Admin" aesthetic out-of-the-box.
- **State Management:** **Zustand** or **React Query** (TanStack Query)
  - *Reason:* Efficient server state management and simple client state.

### Backend & Database (Serverless)
- **Platform:** **Supabase**
  - *Reason:* Provides Auth, DB (PostgreSQL), Realtime, and Storage in one free/low-cost package. No server maintenance required.
  - *Lock-in Risk:* Moderate. Mitigation: It uses standard PostgreSQL, so migration is possible if needed.
- **Database:** **PostgreSQL** (via Supabase)
  - *Reason:* Relational data integrity is crucial for orders and inventory.
- **Auth:** **Supabase Auth** (Email/Password + Social Login if needed)

### Infrastructure & Deployment
- **Hosting:** **Vercel**
  - *Reason:* Zero-config deployment for Next.js, generous free tier.
- **CI/CD:** GitHub Actions + Vercel Automatic Deployments.

## 3. External Integrations
| Service | Purpose | Alternative |
| :--- | :--- | :--- |
| **OpenAI / Gemini** | Generative AI for Detail Pages (Text & Layout) | Anthropic Claude |
| **CoolSMS / Aligo** | Sending SMS/Kakao Notifications (Order to Supplier) | Twilio (Global, more expensive) |
| **Hanjin Courier API** | Tracking & Invoice Registration | Manual Excel Upload |

## 4. Non-Functional Requirements
- **Performance:** Dashboard load time < 1.5s on 4G LTE.
- **Responsiveness:** Fully functional on mobile viewports (360px+).
- **Security:**
  - Row Level Security (RLS) policies in Supabase to strictly separate tenant data.
  - Encryption of API keys and sensitive user info.
- **Scalability:**
  - Designed to handle spike loads (e.g., promotional periods).
  - Database schema normalization to support thousands of orders.

## 5. Database Requirements
- **Schema Design:** Normalized relational schema (3NF).
- **Indexing:** Indexes on frequently queried fields (`order_date`, `status`, `user_id`).
- **Backup:** Daily automated backups via Supabase.

## 6. Data Lifecycle
- **Retention:** Order data retained for 5 years (legal requirement).
- **Cleanup:** Temporary generated images deleted after 30 days if not saved.
- **Privacy:** User personal data (PII) minimization; capability to "Hard Delete" on request.
