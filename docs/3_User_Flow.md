# User Flow - SmartStore Comprehensive Solution

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05

## Unified User Journey

```mermaid
graph TD
    Start([접속/Start]) --> LoginCheck{로그인 여부}

    LoginCheck -- No --> Landing[랜딩 페이지]
    Landing --> Login[로그인/회원가입]
    Login --> LoginCheck

    LoginCheck -- Yes --> Dashboard[통합 대시보드]

    subgraph "Core Loop 1: Order Processing"
        Dashboard -->|Check New Orders| OrderList[Integrated Order List]
        OrderList -->|Select & Send| SendOrder[Send Order to Supplier]
        SendOrder -->|One-Click| SMS[Send SMS/Kakao]
        SMS -->|Confirm| StatusWait[Wait for Supplier]
        StatusWait -->|Receive Tracking#| InputTracking[Input Tracking Info]
        InputTracking -->|Auto/Manual| Invoice[Register Invoice]
        Invoice -->|Sync| OrderComplete((Order Complete))
        OrderComplete --> Dashboard
    end

    subgraph "Core Loop 2: Detail Page Benchmarking"
        Dashboard --> NewAnalysis[+ 새 분석 요청]
        NewAnalysis --> InputURL[URL 입력]
        InputURL --> ValidateURL{유효한 주소인가?}

        ValidateURL -- No --> ErrorURL[에러 메시지] --> InputURL
        ValidateURL -- Yes --> CheckLimit{일일 잔여 횟수?}

        CheckLimit -- 0회 --> Paywall[유료 구독 유도]
        Paywall --> MakePayment[결제] --> ProcessAnalysis
        Paywall --> Cancel[취소] --> Dashboard

        CheckLimit -- 잔여 있음 --> ProcessAnalysis[분석 진행 AI Agent]

        ProcessAnalysis --> Loading[로딩/진행상황 표시]
        Loading --> Complete{분석 완료?}

        Complete -- Fail --> ErrorRetry[오류 알림 & 재시도]
        Complete -- Success --> Result[분석 결과 페이지]

        Result --> Tab1[구조기획 탭]
        Result --> Tab2[디자인 탭]
        Result --> Tab3[마케팅 탭]

        Tab1 --> Action1[인사이트 메모 저장]
        Tab2 --> Action2[스타일가이드 다운로드]
        Tab3 --> Action3[카피 문구 복사]

        Action1 --> AnalysisLoop[성공 루프: 또 다른 상품 분석]
        AnalysisLoop --> Dashboard
    end

    subgraph "Feature: AI Detail Page Generator"
        Dashboard -->|Create New| PageGen[Detail Page Generator]
        PageGen -->|Input Keywords| AI_Process{AI Generating...}
        AI_Process -->|Draft Created| Editor[Review & Edit Draft]
        Editor -->|Save| Download[Download/Upload to Store]
        Download --> Dashboard
    end

    subgraph "Mobile Quick Check"
        Dashboard -->|Tap Summary| DailyStats[Daily Revenue/Order Stats]
        DailyStats -->|Quick View| OrderList
    end
```

## Key User Paths

### Path 1: Daily Order Management (매일 주문 관리)
1. **Login** → Dashboard
2. **View** → New orders in integrated list
3. **Select** → Orders to send to supplier
4. **Send** → One-click SMS/Kakao to supplier
5. **Input** → Tracking numbers (auto/manual)
6. **Complete** → Order status updated

**Success Criteria**: < 5 minutes for 10 orders

### Path 2: Competitive Analysis (경쟁사 분석)
1. **Discover** → 경쟁사 상세페이지 발견 (Mobile/PC)
2. **Input** → URL 입력
3. **Wait** → AI 분석 진행 (30초 이내)
4. **Review** → 구조/디자인/마케팅 탭 탐색
5. **Save** → 인사이트 메모, 스타일 가이드 다운로드
6. **Apply** → 내 상품 상세페이지에 적용

**Success Criteria**: 주 3회 이상 재방문

### Path 3: AI Detail Page Creation (AI 상세페이지 생성)
1. **Start** → Detail Page Generator
2. **Input** → 상품 키워드, 주요 특징
3. **Generate** → AI 초안 생성
4. **Review** → 생성된 콘텐츠 검토 및 수정
5. **Download** → HTML/이미지 다운로드
6. **Upload** → 스마트스토어에 업로드

**Success Criteria**: 기획 시간 50% 단축
