# Stripe Live Mode 전환 가이드

## 현재 상황
- `.env`: Test Mode 키 사용 중 (`pk_test_51...`)
- Supabase Secrets: Test Mode 키로 추정
- DB에 저장된 `stripe_account_id`: Test Mode 계정 (`acct_test_xxx`)

## 에러 원인
```
You requested an account link for an account that is not connected
to your platform or does not exist.
```

**원인**: DB에 저장된 Test Mode 계정 ID가 Live Mode Stripe에서는 존재하지 않음

---

## 🚀 Live Mode 전환 단계

### 1️⃣ Stripe Dashboard에서 Live API 키 발급

1. https://dashboard.stripe.com 로그인
2. 왼쪽 상단 **"Test mode" 토글 OFF** → Live mode로 전환
3. **Developers → API keys** 메뉴 이동
4. 다음 키 복사:
   - **Publishable key**: `pk_live_51...`
   - **Secret key**: `sk_live_51...` (Reveal 클릭 후 복사)

### 2️⃣ 로컬 `.env` 파일 수정

```bash
# .env
VITE_SUPABASE_URL=https://twradcbjuupitopmrtmz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51...YOUR_LIVE_KEY
```

### 3️⃣ Supabase Secrets 업데이트

```bash
# Terminal에서 실행
supabase secrets set STRIPE_SECRET_KEY=sk_live_51...YOUR_LIVE_SECRET_KEY

# 확인
supabase secrets list
```

### 4️⃣ Vercel 환경 변수 업데이트

1. https://vercel.com → 프로젝트 선택
2. **Settings → Environment Variables**
3. `VITE_STRIPE_PUBLISHABLE_KEY` 값을 Live 키로 변경
4. **Redeploy** 실행

### 5️⃣ 데이터베이스 초기화 (중요!)

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- Test Mode 계정 ID 모두 초기화
UPDATE photographer_profiles
SET
  stripe_account_id = NULL,
  stripe_onboarding_completed = FALSE,
  stripe_charges_enabled = FALSE,
  stripe_account_status = NULL
WHERE stripe_account_id LIKE 'acct_test_%';

-- 확인
SELECT id, stripe_account_id, stripe_onboarding_completed
FROM photographer_profiles;
```

### 6️⃣ 재연결 테스트

1. 로컬 개발 서버 재시작: `npm run dev`
2. Dashboard → Settings → Payment Settings
3. **"Connect Stripe Account"** 버튼 클릭
4. Stripe 온보딩 완료

---

## ⚠️ 주의사항

### Live Mode 사용 전 필수 확인
- ✅ Stripe 계정 인증 완료 (사업자 정보, 은행 계좌)
- ✅ Test Mode에서 충분히 테스트 완료
- ✅ 실제 결제가 처리됨 - 소액으로 먼저 테스트

### 개발/프로덕션 분리 권장
```bash
# 로컬 개발: Test Mode
.env.local:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Vercel Production: Live Mode
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51...
```

---

## 🔍 트러블슈팅

### "Account does not exist" 에러
→ DB의 `stripe_account_id` 초기화 (Step 5)

### "STRIPE_SECRET_KEY not set" 에러
→ Supabase Secrets 확인 (Step 3)

### Stripe 온보딩 완료 후에도 "Setup Incomplete"
→ `stripe_charges_enabled`가 true인지 확인
→ Stripe Dashboard에서 계정 상태 확인

---

## 📞 Stripe Support
문제가 계속되면:
- https://support.stripe.com
- Stripe Dashboard → Help 메뉴
