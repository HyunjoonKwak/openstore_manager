# Product Requirements Document (PRD) - SmartStore Comprehensive Solution

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05
> **Status:** Active

## 1. Problem Definition (문제 정의)

### A. 스토어 운영 관리 문제
Currently, sellers managing Naver Smart Stores (especially those with side hustles) face significant inefficiencies:
- **Fragmented Workflow:** Juggling between Excel, store admin pages, and shipping sites consumes excessive time.
- **Manual Labor:** Repetitive tasks like order entry and shipping invoice registration are prone to human error.
- **Time Constraint:** 50s office workers with side businesses lack the time to manage operations during the day, encroaching on their personal time after work.

### B. 상세페이지 제작 문제
스마트스토어 초보 셀러들은 경쟁력 있는 상세페이지를 만들고 싶어 하지만:
- **Blank Page Syndrome (백지 공포)**: "어떤 구조로(기획), 어떻게 꾸미고(디자인), 무슨 말을 써야 할지(마케팅)" 막막함
- **Creative Barrier:** Creating high-converting product detail pages is difficult and stressful for non-designers.
- **Dependency on External Resources:** 개인의 감이나 비싼 외주에 의존해야 하는 고통스러운 영역

## 2. Goals & Objectives (목표)

### Primary Goals
1. **Centralized Management:** Consolidate order tracking, inventory, and shipping into a single dashboard.
2. **Automation:** Automate repetitive tasks (order collection, shipping registration) to minimize manual input.
3. **AI-Assisted Detail Page Creation:** 경쟁사 URL만 입력하면 즉시 참고 가능한 **기획 구조, 디자인 스타일, 마케팅 문구**를 분석하여 제공
4. **Operational Efficiency:** Enable "lunch break management" – allow full control via mobile/web in short bursts of time.

### Ultimate Goals
- **Design Independence (디자인 자립)**: 셀러가 타인의 도움 없이 스스로 매력적인 상세페이지를 기획하고 제작할 수 있도록 돕는다.
- **Revenue Growth:** Support sellers in reaching 3M KRW monthly revenue through efficiency gains.

## 3. User Persona (사용자 페르소나)

### Primary: "Mr. Kim - The Efficient Side-Hustler"
| Attribute | Description |
| :--- | :--- |
| **Name** | Mr. Kim (김 사장님) |
| **Age** | 50s |
| **Occupation** | Full-time Office Worker / Part-time Smart Store Seller |
| **Tech Literacy** | Moderate (Uses Excel, Smartphones, but dislikes complexity) |
| **Business Scale** | 1인 기업 또는 소규모 팀. 상품 소싱부터 CS까지 혼자 다 함 |
| **Pain Points** | Eye strain from small text, overwhelmed by complex menus, exhausted after work, design phobia, 디자인 감각 부족, 포토샵 못 다룸 |
| **Goals** | Manage store during lunch/commute, maximize free time after work, grow revenue to 3M KRW, "잘 팔리는 상세페이지는 뭐가 다른 거지?" 항상 궁금함 |
| **Environment** | Mobile (Check/Order) & PC (Detail work/Batch processing) |
| **Needs** | 복잡한 툴 학습 없이, URL 복붙만으로 "아, 이렇게 하면 되는구나"라는 명확한 가이드 |

## 4. User Stories (사용자 스토리)

### A. Store Management Features
- **[FEAT-1] Integrated Dashboard:** As a seller, I want to see all new orders and shipping status on one screen so that I don't have to open multiple tabs or Excel files.
- **[FEAT-2] One-Click Order Transmission:** As a seller, I want to send order lists to suppliers via text/Kakao with one button so that I avoid copy-paste errors.
- **[FEAT-3] Auto-Shipping Invoice:** As a seller, I want to automatically link shipping invoices from Hanjin Courier to my orders so that I don't have to manually type tracking numbers.
- **[ADMIN-1] Mobile View:** As a busy worker, I want to check order status on my phone during lunch without a broken UI.
- **[ADMIN-2] Role Management:** As a growing seller, I want to assign limited access to a part-time helper so that they can't mess up critical settings.

### B. Detail Page Benchmarking Features
- **[BENCH-1] Structure Analysis (기획):** 셀러는 잘 팔리는 경쟁사 상세페이지 URL을 입력함으로써, 해당 페이지의 논리적 구조(인트로-소구점-증거-오퍼)를 파악하고 싶다.
- **[BENCH-2] Design Extraction (디자인):** 셀러는 벤치마킹할 페이지의 주요 색상, 폰트, 레이아웃 패턴을 확인함으로써, 내 상세페이지 디자인의 방향성을 잡고 싶다.
- **[BENCH-3] Marketing Copy (마케팅):** 셀러는 상위 노출 상품의 핵심 키워드와 후킹 문구를 추출함으로써, 내 상품 설명에 즉시 적용할 카피 아이디어를 얻고 싶다.
- **[BENCH-4] Mobile Access (접근성):** 셀러는 이동 중이나 경쟁사 발견 즉시 스마트폰으로 URL을 입력해 분석을 요청하고, 나중에 PC에서 결과를 확인하고 싶다.
- **[BENCH-5] AI Detail Page Generator:** As a seller, I want to input product keywords and get a designed detail page so that I can launch products without hiring a designer.

## 5. Success Metrics (성공 지표)

### North Star Metrics
- **Operational Efficiency:** "Time spent on operations per order" (Goal: < 5 mins/day total for 10 orders)
- **User Retention (재방문율):** "상품 등록할 때마다 무조건 킨다" -> 주 3회 이상 사용 사용자 비율
- **Time Savings (시간 단축):** 상세페이지 기획/구상 단계 소요 시간 50% 단축

### Business Metrics
- **Revenue Goal:** Reaching 3M KRW monthly revenue
- **User Satisfaction:** The creator finds the tool "perfect" for their needs (Dogfooding)
- **Market Validation:** Acquisition of paid subscribers (friends/acquaintances) for the SaaS model

## 6. Scope (범위)

### In-Scope (MVP)
#### Store Management
- Integrated order dashboard (PC/Mobile responsive)
- One-click order transmission to suppliers
- Automatic shipping invoice integration
- Basic role management

#### Detail Page Benchmarking
- **Structure Analysis**: HTML 텍스트 및 이미지 배치를 기반으로 논리 구조 파악
- **Style Extraction**: 주요 컬러 코드, 폰트 패밀리 추출
- **Keyword/Copy**: 빈도수 높은 키워드 및 감성 분석을 통한 문구 추출
- **Responsive Web**: PC/Mobile 웹 지원

### Out-of-Scope (Non-goals)
- **AI Image Generation**: 이미지를 직접 만들어주는 기능은 차기 버전(V2)
- **Direct Editing**: 분석 결과를 바로 수정해서 HTML로 내보내기 기능
- Global purchasing/shipping agency features (Future)
- AI automatic product sourcing (Future)
- Community features (Future)
- Complex animation or "fun" UI elements (Focus on functional speed)

## 7. Assumptions & Risks (가정 및 리스크)

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **API Limitations** | Smart Store or Courier APIs might change or limit access | Use official APIs where possible; implement fallback manual upload modes (Excel) |
| **AI Cost** | High usage of Image generation APIs could spike costs | Implement strict quotas per tier; use cost-effective models for draft generation |
| **Complexity Creep** | Adding features might ruin the "simple" UX | Strictly adhere to the "Generic Admin" design principle; hide advanced features |
| **Crawling Blocked** | 경쟁사 상세페이지가 통이미지로 되어 있어 텍스트 추출이 어려울 수 있다 | OCR(광학 문자 인식) 기능 필수 도입 고려 (MVP 단계에서는 OpenAI Vision API 활용) |
| **Platform Changes** | 네이버 스마트스토어 구조가 변경되어 크롤링이 막힐 수 있다 | 주기적인 파서 업데이트 및 서버리스의 유연한 배포로 대응 |

## 8. Experiment & Learning Loop (실험 루프)

### Hypothesis
- **H1:** "Sellers will pay for a tool that saves them 1 hour a day."
- **H2:** "구조만 분석해줘도 셀러들은 막막함의 80%를 해결했다고 느낄 것이다."

### Experiments
- **Experiment 1:** Launch MVP to friends for free/low cost
- **Experiment 2:** MVP 배포 후 '구조 분석' 탭의 체류 시간과 '도움됨' 버튼 클릭률 측정

### Observations & Learning
- Measure retention and feature usage
- Track which features (Order Management vs Detail Page Benchmarking) drive more engagement
- Adjust pricing or features based on feedback
- 구조 분석 만족도가 낮다면, 디자인/마케팅 분석 비중을 높이는 방향으로 피벗
