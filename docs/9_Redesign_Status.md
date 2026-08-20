# 재설계 이행 상태 — 마켓 중립 아키텍처

> **Date:** 2026-08-14 (당일 이관·배포 완료)
> **Branch:** main 병합·배포 완료
> **계획 문서:** 8_Architecture_and_Benchmark.md(결정 배경) + 승인된 재설계 계획

## 완료된 것

| Phase | 내용 | 비고 |
|---|---|---|
| 0 | legacy 마이그레이션 17개 → `supabase/migrations/legacy/` 보존, backup 스크립트(`scripts/backup-db.mjs`) | DB 백업 실행은 Supabase 복원 대기 |
| 1 | 새 스키마 `100_core_schema.sql`(코어 12테이블) + `110_studio_schema.sql`(스튜디오 3테이블) + `111_seed_studio_templates.sql`(템플릿 8종) | postgres:15에서 legacy 001-017 전체 체인 위 적용·멱등성 검증 완료. **충돌 legacy 테이블은 `legacy_*`로 리네임 보존** |
| 2 | 마켓 어댑터 레이어 `src/lib/markets/` — 인터페이스 + 네이버 구현 + 쿠팡 스텁(WING 검증 규칙만 실제) | `validateListing`은 순수 함수(준비 안 됨 뱃지) |
| 3 | 서버 액션 재구성 — market-accounts / master-products / listings / bulk(2단계) / market-orders / market-dispatch | `resolveCurrentStoreId` 제거, 마켓은 명시 파라미터 |
| 4 | 재동기화 파이프라인 `market-sync.ts` — 상품(initial=이관)/주문/정산 pull + 재고 push, supplier 재연결은 `legacy_products` SKU·originProductNo 매칭 | **실행·검증은 DB 복원 후** |
| 5 | IA 교체 — 2단계 사이드바, 마켓 필터 칩, 모바일 4탭(주문/발송/재고/더보기) | |
| 6 | 화면 재구성 — /products(마켓 컬럼·마스터-디테일·키보드), /products/[id]/listings(멀티마켓 편집·대조), /products/stock, /orders(클레임), /orders/dispatch(2단계), /orders/purchase(발주), /settlements, /dashboard, 설정 마켓 계정 탭 | |
| 7 | detailpage_maker 이식(/studio/interview·templates) + withus 흡수(placeOrderStatusType 구분, 30건 배치 발송) | |
| 8 | 구 코드 삭제(inventory·구 주문/발송/대시보드 화면, 구 액션 6종, StoreContext), E2E 갱신 | |

## ~~DB 복원 후 해야 하는 것~~ → 2026-08-14 전부 완료

복원이 **새 프로젝트**(`efvooqeffcnuhhaubvjk`)로 이루어져 URL·API 키가 전부 교체됐다.
로컬 `.env.local`·NAS `.env` 갱신 완료(NAS는 `.env.bak-20260814` 백업).
네이버 커머스 API 앱도 새 앱(`1YczNCuXVOy1LJHQrP8aXT`)으로 키 교체.
백업 → 마이그레이션 → 시드 → 계정 이관 → initial 동기화(상품 9, supplier 1) →
E2E 14/14 → main 병합 → ship 배포(healthy)까지 완료. 원래 체크리스트:

1. Supabase 대시보드에서 프로젝트 **Restore** (pause 상태 — DNS NXDOMAIN 확인됨)
2. `node scripts/backup-db.mjs` — 전 테이블 JSON 백업
3. SQL Editor에서 `100_core_schema.sql` → `110_studio_schema.sql` → `111_seed_studio_templates.sql` 순서 적용
4. 설정 > 마켓 계정에서 스마트스토어 계정 생성 + API 키 입력 (legacy stores.api_config 값 재입력)
5. 원본상품 화면에서 "마켓에서 동기화" 실행 (initial 모드 — 마스터 생성 + supplier 재연결)
6. 주문 화면에서 "주문 동기화" 실행, 데이터 검증
7. `npm run test:e2e` — 갱신된 여정 검증
8. 검증 후 `redesign` → `main` 병합, ship 배포
9. Supabase typegen으로 `src/types/redesign.types.ts` 대체, `199_drop_legacy.sql` 작성(legacy_* 테이블 제거) ← **유일하게 남은 항목 (충분히 운영 후)**

## 알려진 잔여 (이번 재설계 범위 밖)

- ~~**스케줄러/cron 자동화**~~ → **2026-08-20 복구 완료**. in-process node-cron은 standalone 빌드에서 아예 기동하지 않았고 legacy 테이블을 참조했다. 이제:
  `lib/sync/engine.ts`(세션 무관 코어) + `lib/sync/due.ts`(순수 due 규칙, 유닛 8개) +
  `/api/cron/sync`(service role, CRON_SECRET 인증, 계정별 due 평가) 구조이고,
  tick은 compose의 `store-manager-cron` 사이드카가 5분 간격으로 내부망에서 호출한다
  (DSM 크론은 업데이트 시 초기화되므로 사용하지 않음). 설정 > 자동화 탭에서 계정별
  주기·대상을 관리하고 최근 실행 기록을 본다. 운영에서 자동 실행 검증 완료.
- **설정 legacy 탭**: 서비스 연동(IntegrationsTab)·알림 탭이 legacy stores.api_config 기준(자동화 탭은 재작성 완료). 마켓 계정 탭이 새 경로이며, OpenAI 키 등 공용 키의 이관 위치 결정 필요
- **네이버 상세편집기(11탭)**: 구 inventory 상세편집기 삭제됨. 옵션·이미지·SEO 등 심화 편집은 새 리스팅 편집기 미지원 — 필요 시 remote_ref 기준으로 이식(네이버 판매자센터로 대체 가능)
- **엑셀 상품 업로드**: excel-upload 액션 삭제. master_products 기준 재구현 필요 시 별도 작업
- **tracking / benchmarking / analysis**: legacy 스키마와 무관하거나(carriers) 독립 테이블이라 그대로 동작. benchmark의 상품 연결(SelectProductDialog)만 legacy products 참조 여부 확인 필요
- **쿠팡 WING API**: 어댑터 스텁 상태. publishListing 등 구현 시 `src/lib/markets/coupang/adapter.ts`만 수정하면 됨

## 저장소 정리 (사용자 확인 후 실행)

- `detailpage_maker` — 이식 완료, archive 대상
- `withus_manager` — 선별 흡수 완료, archive 대상
