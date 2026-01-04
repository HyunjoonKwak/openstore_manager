# Product Requirements Document (PRD) - SmartStore Manager

> **Version:** 1.0
> **Date:** 2026-01-04
> **Status:** Draft

## 1. Problem Definition
Currently, sellers managing Naver Smart Stores (especially those with side hustles) face significant inefficiencies:
- **Fragmented Workflow:** Juggling between Excel, store admin pages, and shipping sites consumes excessive time.
- **Manual Labor:** Repetitive tasks like order entry and shipping invoice registration are prone to human error.
- **Creative Barrier:** Creating high-converting product detail pages is difficult and stressful for non-designers.
- **Time Constraint:** 50s office workers with side businesses lack the time to manage operations during the day, encroaching on their personal time after work.

## 2. Goals & Objectives
- **Centralized Management:** Consolidate order tracking, inventory, and shipping into a single dashboard.
- **Automation:** Automate repetitive tasks (order collection, shipping registration) to minimize manual input.
- **AI-Assisted Creation:** Empower non-designers to generate professional detail pages using AI.
- **Operational Efficiency:** Enable "lunch break management" – allow full control via mobile/web in short bursts of time.

## 3. User Persona
| Attribute | Description |
| :--- | :--- |
| **Name** | Mr. Kim (The Efficient Side-Hustler) |
| **Age** | 50s |
| **Occupation** | Full-time Office Worker / Part-time Seller |
| **Tech Literacy** | Moderate (Uses Excel, Smartphones, but dislikes complexity) |
| **Pain Points** | Eye strain from small text, overwhelmed by complex menus, exhausted after work, design phobia. |
| **Goals** | Manage store during lunch/commute, maximize free time after work, grow revenue to 3M KRW. |
| **Environment** | Mobile (Check/Order) & PC (Detail work/Batch processing). |

## 4. User Stories
### Core Features (MVP)
- **[FEAT-1] Integrated Dashboard:** As a seller, I want to see all new orders and shipping status on one screen so that I don't have to open multiple tabs or Excel files.
- **[FEAT-2] One-Click Order Transmission:** As a seller, I want to send order lists to suppliers via text/Kakao with one button so that I avoid copy-paste errors.
- **[FEAT-3] Auto-Shipping Invoice:** As a seller, I want to automatically link shipping invoices from Hanjin Courier to my orders so that I don't have to manually type tracking numbers.
- **[FEAT-4] AI Detail Page Generator:** As a seller, I want to input product keywords and get a designed detail page so that I can launch products without hiring a designer.

### Admin & Operations
- **[ADMIN-1] Mobile View:** As a busy worker, I want to check order status on my phone during lunch without a broken UI.
- **[ADMIN-2] Role Management:** As a growing seller, I want to assign limited access to a part-time helper so that they can't mess up critical settings.

## 5. Success Metrics
- **North Star Metric:** "Time spent on operations per order" (Goal: < 5 mins/day total for 10 orders).
- **Revenue Goal:** Reaching 3M KRW monthly revenue.
- **User Satisfaction:** The creator finds the tool "perfect" for their needs (Dogfooding).
- **Market Validation:** Acquisition of paid subscribers (friends/acquaintances) for the SaaS model.

## 6. Non-Goals (Out of Scope for MVP)
- Global purchasing/shipping agency features (Future).
- AI automatic product sourcing (Future).
- Community features (Future).
- Complex animation or "fun" UI elements (Focus on functional speed).

## 7. Assumptions & Risks
| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **API Limitations** | Smart Store or Courier APIs might change or limit access. | Use official APIs where possible; implement fallback manual upload modes (Excel). |
| **AI Cost** | High usage of Image generation APIs could spike costs. | Implement strict quotas per tier; use cost-effective models for draft generation. |
| **Complexity Creep** | Adding features might ruin the "simple" UX. | Strictly adhere to the "Generic Admin" design principle; hide advanced features. |

## 8. Experiment & Learning Loop
- **Hypothesis:** "Sellers will pay for a tool that saves them 1 hour a day."
- **Experiment:** Launch MVP to friends for free/low cost.
- **Observation:** Measure retention and feature usage.
- **Learning:** adjust pricing or features based on feedback.
