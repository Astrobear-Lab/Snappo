# Stripe Connect 배포 가이드

완료된 작업들을 배포하는 순서입니다.

## ✅ 완료된 작업

### 1. PaymentModal 업데이트
- ✅ Link를 별도 옵션으로 표시 (tabs 레이아웃)
- ✅ Card, Link, Apple Pay, Google Pay, PayPal 모두 같은 레벨로 표시

### 2. Database Schema
- ✅ Migration 파일 생성: `supabase/migrations/add_stripe_connect.sql`
- ✅ `stripe_account_id`, `stripe_account_status`, `stripe_onboarding_completed`, `stripe_charges_enabled` 컬럼 추가

### 3. Supabase Edge Functions
- ✅ `create-connect-account` - Stripe Connect 계정 생성
- ✅ `create-payment-intent` - 자동 분배 로직 추가 (transfer_data)

### 4. Frontend Components
- ✅ `StripeConnectButton` - Connect 연결 버튼
- ✅ `PhotographerDashboardMain` - Settings 탭에 Stripe Connect 추가

## 📋 배포 단계

### Step 1: Database Migration 실행

Supabase Dashboard에서 SQL Editor 열기:

```sql
-- Add Stripe Connect columns to photographer_profiles table
ALTER TABLE photographer_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_photographer_stripe_account
ON photographer_profiles(stripe_account_id);

-- Add comment for documentation
COMMENT ON COLUMN photographer_profiles.stripe_account_id IS 'Stripe Connect Express account ID for receiving payments';
COMMENT ON COLUMN photographer_profiles.stripe_account_status IS 'Status: pending, active, restricted, or disabled';
COMMENT ON COLUMN photographer_profiles.stripe_onboarding_completed IS 'Whether photographer has completed Stripe onboarding';
COMMENT ON COLUMN photographer_profiles.stripe_charges_enabled IS 'Whether the account can receive charges';
```

**확인:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'photographer_profiles'
  AND column_name LIKE 'stripe%';
```

### Step 2: Supabase Secrets 설정

필요한 환경 변수:

```bash
# Supabase Service Role Key (create-payment-intent에서 사용)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (Connect 리다이렉트용)
supabase secrets set APP_URL=https://snappo-vercel.app

# Supabase URL (Edge Function에서 사용)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

**Service Role Key 찾기:**
1. Supabase Dashboard → Settings → API
2. "service_role" 키 복사 (절대 공개하지 말 것!)

### Step 3: Edge Functions 배포

```bash
# create-connect-account 배포
supabase functions deploy create-connect-account

# create-payment-intent 재배포 (업데이트된 버전)
supabase functions deploy create-payment-intent
```

**배포 확인:**
```bash
# Functions 목록 확인
supabase functions list

# 로그 확인
supabase functions logs create-connect-account
supabase functions logs create-payment-intent
```

### Step 4: Stripe Dashboard 설정

1. **Stripe Connect 활성화**
   - [Stripe Dashboard](https://dashboard.stripe.com) → Settings → Connect
   - "Get started with Connect" 클릭
   - Account type: **Express** 선택
   - Platform name: `Snappo`
   - Save

2. **Redirect URLs 설정**
   - OAuth redirect URI: `https://snappo-vercel.app/dashboard`
   - Refresh URL: `https://snappo-vercel.app/dashboard`

3. **Webhook 설정** (선택사항 - 계정 상태 자동 업데이트용)
   - Endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events: `account.updated`, `account.application.authorized`

### Step 5: Frontend 배포

Vercel에 자동 배포됩니다. 변경사항:
- `src/components/PaymentModal.jsx` - tabs 레이아웃
- `src/components/photographer/StripeConnectButton.jsx` - 새 파일
- `src/components/photographer/PhotographerDashboardMain.jsx` - Settings 탭

**확인:**
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 없으면 커밋 & 푸시
git add .
git commit -m "Add Stripe Connect payment system"
git push
```

## 🧪 테스트 플로우

### 1. 포토그래퍼 계정 연결 테스트

1. 포토그래퍼로 로그인
2. Dashboard → Settings 탭
3. "Connect Stripe Account" 클릭
4. Stripe Express 온보딩 페이지로 이동
5. 테스트 정보 입력:
   - Name: Test Photographer
   - DOB: 1990-01-01
   - Address: 123 Test St, San Francisco, CA 94102
   - SSN (test): 000-00-0000
   - Bank account (test): Routing 110000000, Account 000123456789
6. Submit → Dashboard로 리다이렉트
7. Settings 탭에서 "✓ Stripe Connected" 확인

### 2. 결제 테스트 (Stripe Connect 없이)

1. 구매자로 사진 구매 시도
2. Payment Intent 생성 시 `transfer_data` 없음 (포토그래퍼가 Connect 안했으므로)
3. 결제 완료 → 전액 플랫폼 계정으로 입금
4. Database에만 `photographer_earnings` 기록

### 3. 결제 테스트 (Stripe Connect 있음)

1. 포토그래퍼가 Stripe Connect 완료한 상태
2. 구매자로 사진 구매 ($3)
3. Payment Intent 생성 시:
   - `application_fee_amount: 100` ($1 플랫폼 수수료)
   - `transfer_data.destination: acct_xxx` (포토그래퍼 계정)
4. 결제 완료 후 자동 분배:
   - 포토그래퍼 계정: $2.00
   - 플랫폼 계정: $1.00

**Stripe Dashboard 확인:**
- Payments → 전체 $3.00 표시
- Connect → 포토그래퍼 계정에 $2.00 transfer 표시

### 4. Link 결제 옵션 테스트

1. 사진 구매 클릭
2. Payment Modal에서 탭 확인:
   - Card
   - Link (이메일 입력하는 옵션)
   - Apple Pay (Safari만)
   - Google Pay (Chrome만)
   - PayPal
3. Link 선택 → 이메일 입력 → 결제

## 🔍 트러블슈팅

### "Failed to create payment intent: Photographer has not connected Stripe account"
- 포토그래퍼가 Stripe Connect를 완료하지 않은 경우
- 해결: Settings에서 Connect 완료하거나, 코드에서 Connect 없이도 결제 가능하게 수정

### "Service Role Key not found"
- `SUPABASE_SERVICE_ROLE_KEY` secret이 설정되지 않음
- 해결: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`

### Connect 버튼 클릭 시 "No onboarding URL received"
- Edge Function이 배포되지 않았거나 에러 발생
- 해결: `supabase functions logs create-connect-account` 확인

### Stripe 온보딩 후에도 "Setup Incomplete" 표시
- Database에 상태가 업데이트되지 않음
- 해결: "Refresh Status" 클릭 또는 Webhook 설정

## 📊 모니터링

### Edge Function 로그
```bash
# 실시간 로그 보기
supabase functions logs create-connect-account --tail
supabase functions logs create-payment-intent --tail
```

### Database 쿼리
```sql
-- Stripe Connect 상태 확인
SELECT
  id,
  user_id,
  stripe_account_id,
  stripe_account_status,
  stripe_onboarding_completed,
  stripe_charges_enabled,
  total_earnings
FROM photographer_profiles
WHERE stripe_account_id IS NOT NULL;

-- 최근 결제 내역
SELECT
  t.*,
  pc.code,
  pp.stripe_account_id
FROM transactions t
JOIN photo_codes pc ON t.photo_code_id = pc.id
JOIN photographer_profiles pp ON t.photographer_id = pp.id
ORDER BY t.created_at DESC
LIMIT 10;
```

## ✅ 배포 완료 체크리스트

- [ ] Database migration 실행 완료
- [ ] Supabase secrets 설정 완료
- [ ] Edge Functions 배포 완료
- [ ] Stripe Connect 활성화 완료
- [ ] Redirect URLs 설정 완료
- [ ] Frontend 배포 완료
- [ ] 포토그래퍼 계정 연결 테스트 완료
- [ ] 결제 테스트 (Connect 없이) 완료
- [ ] 결제 테스트 (Connect 있음) 완료
- [ ] Link 결제 옵션 테스트 완료

---

**도움이 필요하면:**
- [STRIPE_CONNECT_SETUP.md](STRIPE_CONNECT_SETUP.md) - 상세 설정 가이드
- [STRIPE_SETUP.md](STRIPE_SETUP.md) - 기본 Stripe 설정
- Stripe Dashboard Logs: https://dashboard.stripe.com/logs
- Supabase Logs: Dashboard → Edge Functions
