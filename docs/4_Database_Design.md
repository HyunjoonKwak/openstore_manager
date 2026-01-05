# Database Design - SmartStore Comprehensive Solution

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05

## Unified ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    USERS ||--o{ STORES : manages
    USERS ||--o{ SUPPLIERS : contacts
    USERS ||--o{ SUBSCRIPTIONS : "has"
    USERS ||--o{ ANALYSIS_LOGS : "requests"
    
    STORES ||--o{ ORDERS : receives
    STORES ||--o{ PRODUCTS : sells
    
    SUPPLIERS ||--o{ ORDERS : fulfills
    SUPPLIERS ||--o{ PRODUCTS : supplies
    
    ANALYSIS_LOGS ||--o{ SAVED_ASSETS : "contains"

    USERS {
        uuid id PK "Supabase Auth ID"
        string email
        string nickname
        string role "admin | subscriber | user | staff"
        timestamp created_at
    }

    STORES {
        uuid id PK
        uuid user_id FK
        string platform "Naver | Coupang | etc"
        string store_name
        json api_config "Encrypted Keys"
    }

    SUPPLIERS {
        uuid id PK
        uuid user_id FK
        string name
        string contact_number
        string contact_method "SMS | Kakao"
    }

    PRODUCTS {
        uuid id PK
        uuid store_id FK
        string name
        int price
        int stock_quantity
        string sku
        uuid supplier_id FK
    }

    ORDERS {
        uuid id PK
        uuid store_id FK
        string platform_order_id
        uuid product_id FK
        int quantity
        string customer_name
        string customer_address
        string status "New | Ordered | Shipped | Cancelled"
        string tracking_number
        string courier_code
        timestamp order_date
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        string plan_type "free | pro"
        timestamp start_date
        timestamp end_date
        bool is_active
    }

    ANALYSIS_LOGS {
        uuid id PK
        uuid user_id FK
        string target_url
        string target_platform "naver_smart_store"
        jsonb analysis_result "OpenAI JSON Output"
        string status "pending | completed | failed"
        timestamp created_at
    }

    SAVED_ASSETS {
        uuid id PK
        uuid log_id FK
        string asset_type "image | text | font"
        string asset_url "Supabase Storage URL"
        text content "OCR text or extracted copy"
    }

    DETAIL_PAGES {
        uuid id PK
        uuid user_id FK
        string title
        text content_html
        json user_inputs
        string status "Draft | Completed"
        timestamp created_at
    }
```

## Key Entities

### Core Entities
- **USERS**: 사용자 기본 정보 및 역할(RBAC) 관리
- **STORES**: 사용자가 관리하는 스토어 정보 (플랫폼, API 설정)
- **SUPPLIERS**: 상품 공급자 정보 및 연락처 관리
- **PRODUCTS**: 판매 상품 정보 (재고, 가격, SKU)
- **ORDERS**: 주문 정보 (상태, 배송 추적, 고객 정보)

### Subscription & Analytics
- **SUBSCRIPTIONS**: 유료/무료 플랜 상태 관리
- **ANALYSIS_LOGS**: 분석 요청 이력. `analysis_result` 컬럼에 AI가 분석한 비정형 데이터(구조, 디자인, 카피 정보)를 JSON 형태로 유연하게 저장
- **SAVED_ASSETS**: 분석 과정에서 추출된 중요한 이미지나 텍스트 조각을 별도로 저장하여 즐겨찾기 등에 활용
- **DETAIL_PAGES**: AI로 생성된 상세페이지 초안 저장

## Indexes & Performance

### Frequently Queried Fields
- `ORDERS.order_date` (DESC)
- `ORDERS.status`
- `ORDERS.store_id`
- `ANALYSIS_LOGS.user_id`
- `ANALYSIS_LOGS.created_at` (DESC)
- `PRODUCTS.sku`

### Composite Indexes
- `(user_id, created_at)` on ANALYSIS_LOGS
- `(store_id, order_date)` on ORDERS
- `(status, order_date)` on ORDERS

## Row Level Security (RLS) Policies

### USERS Table
- Users can only read/update their own record

### ORDERS, PRODUCTS, STORES
- Users can only access data from stores they own
- Staff role can read but not delete

### ANALYSIS_LOGS, SAVED_ASSETS
- Users can only access their own analysis results
- Admins have full access

### SUBSCRIPTIONS
- Users can read their own subscription
- Only admins can modify
