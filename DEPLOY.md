# Synology NAS Docker 배포 가이드

## 사전 준비

### 1. GitHub Secrets 설정
GitHub 저장소 → Settings → Secrets and variables → Actions에서 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. GitHub 패키지 권한 확인
저장소 Settings → Actions → General → Workflow permissions:
- "Read and write permissions" 선택

---

## 배포 방법

### Step 1: 이미지 빌드 (자동)
`main` 브랜치에 push하면 GitHub Actions가 자동으로:
1. Docker 이미지 빌드
2. `ghcr.io/hyunjoonkwak/openstore_manager:latest`로 푸시

### Step 2: Synology에서 이미지 다운로드

**Container Manager 사용:**
1. Container Manager 열기
2. 레지스트리 → 설정 → GitHub Container Registry 추가
   - URL: `https://ghcr.io`
   - 사용자명: GitHub 계정명
   - 비밀번호: GitHub Personal Access Token (read:packages 권한)
3. 이미지 → 추가 → URL에서 추가
   - `ghcr.io/hyunjoonkwak/openstore_manager:latest`

**SSH 사용:**
```bash
# GitHub 로그인 (Personal Access Token 필요)
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# 이미지 다운로드
docker pull ghcr.io/hyunjoonkwak/openstore_manager:latest
```

### Step 3: 환경변수 파일 생성

NAS에서 `/docker/store-manager/` 폴더 생성 후 `.env` 파일 작성:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
CRON_SECRET=your-cron-secret
```

### Step 4: 컨테이너 실행

**Container Manager 사용:**
1. 이미지 선택 → 실행
2. 컨테이너 이름: `store-manager`
3. 포트 설정: 로컬 `3300` → 컨테이너 `3000`
4. 환경변수: `.env` 파일의 내용을 하나씩 추가
5. 자동 재시작: 활성화

**docker-compose 사용:**
```bash
cd /volume1/docker/store-manager

# .env 파일이 같은 폴더에 있어야 함
docker-compose up -d
```

---

## 역방향 프록시 설정

Synology DSM → 제어판 → 로그인 포털 → 고급 → 역방향 프록시:

| 항목 | 값 |
|------|-----|
| 설명 | Store Manager |
| 소스 프로토콜 | HTTPS |
| 소스 호스트명 | store.yourdomain.com |
| 소스 포트 | 443 |
| 대상 프로토콜 | HTTP |
| 대상 호스트명 | localhost |
| 대상 포트 | 3300 |

### WebSocket 설정 (선택)
사용자 정의 헤더 추가:
- `Upgrade`: `$http_upgrade`
- `Connection`: `$connection_upgrade`

---

## SSL 인증서 (Let's Encrypt)

1. 제어판 → 보안 → 인증서
2. 추가 → 새 인증서 추가 → Let's Encrypt 인증서
3. 도메인: `store.yourdomain.com`
4. 이메일 입력 후 발급
5. 발급 후 → 구성 → `store.yourdomain.com` 서비스에 인증서 적용

---

## 업데이트

```bash
# 최신 이미지 다운로드
docker pull ghcr.io/hyunjoonkwak/openstore_manager:latest

# 컨테이너 재시작
docker-compose down
docker-compose up -d

# (선택) 오래된 이미지 정리
docker image prune -f
```

---

## 문제 해결

### 로그 확인
```bash
docker logs store-manager
docker logs -f store-manager --tail 100
```

### 컨테이너 상태 확인
```bash
docker ps
docker stats store-manager
```

### 환경변수 확인
```bash
docker exec store-manager env | grep SUPABASE
```
