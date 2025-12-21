# Stripe Connect Setup Guide - 포토그래퍼 정산 시스템

이 가이드는 포토그래퍼들이 판매 수익을 실제로 받을 수 있도록 Stripe Connect를 설정하는 방법입니다.

## Stripe Connect란?

Stripe Connect는 마켓플레이스/플랫폼에서 여러 판매자(포토그래퍼)에게 자동으로 수익을 분배하는 시스템입니다.

### 현재 시스템 vs Stripe Connect

**현재 (Mock):**
- 결제 금액이 플랫폼 계정으로만 입금
- 데이터베이스에만 수익 기록 (`photographer_earnings`)
- 포토그래퍼는 실제로 돈을 받지 못함

**Stripe Connect 적용 후:**
- 결제 시 포토그래퍼 계정으로 $2 자동 이체
- 플랫폼은 $1 수수료 자동 보관
- 실시간 정산 또는 일괄 정산 선택 가능

## 1. Stripe Connect 계정 유형 선택

### Standard Accounts (추천)
- ✅ 포토그래퍼가 자신의 Stripe 계정 완전 소유
- ✅ 포토그래퍼가 직접 환불, 분쟁 처리
- ✅ 플랫폼 책임 최소화
- ❌ 포토그래퍼가 Stripe 계정 생성 필요

### Express Accounts
- ✅ 간소화된 가입 절차 (플랫폼이 관리)
- ✅ 포토그래퍼는 최소한의 정보만 입력
- ❌ 플랫폼이 일부 책임 부담

### Custom Accounts
- ✅ 완전히 커스터마이징 가능
- ❌ 복잡한 구현 및 규제 준수 필요
- ❌ 플랫폼이 모든 책임 부담

**추천: Express Accounts** - 가입 간편 + 적절한 책임 분배

## 2. Stripe Dashboard 설정

### 2.1 Connect 활성화

1. [Stripe Dashboard](https://dashboard.stripe.com) 로그인
2. **Settings** → **Connect**
3. **Get started with Connect** 클릭
4. Account type: **Express** 선택
5. Platform name: `Snappo`
6. Save

### 2.2 Redirect URLs 설정

Connect 설정에서:
- **OAuth redirect URI**: `https://your-domain.com/dashboard/connect/callback`
- **Refresh URL**: `https://your-domain.com/dashboard`

## 3. Database Schema 업데이트

포토그래퍼 계정에 Stripe Connect ID 저장:

```sql
-- photographer_profiles 테이블에 컬럼 추가
ALTER TABLE photographer_profiles
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_account_status TEXT DEFAULT 'pending',
ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false;

-- Index 추가
CREATE INDEX idx_photographer_stripe_account
ON photographer_profiles(stripe_account_id);
```

## 4. Backend - Stripe Connect 계정 생성

### 4.1 Supabase Edge Function 생성

`supabase/functions/create-connect-account/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photographerId, email, country = 'US' } = await req.json()

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Express 계정 생성
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        photographerId: photographerId,
      },
    })

    // 온보딩 링크 생성 (포토그래퍼가 정보 입력하는 페이지)
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get('APP_URL')}/dashboard`,
      return_url: `${Deno.env.get('APP_URL')}/dashboard?connect=success`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        accountId: account.id,
        onboardingUrl: accountLink.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### 4.2 배포

```bash
supabase functions deploy create-connect-account
```

환경 변수 설정:
```bash
supabase secrets set APP_URL=https://your-domain.com
```

## 5. Frontend - 포토그래퍼 연결 버튼

`src/components/photographer/StripeConnectButton.jsx`:

```jsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';

const StripeConnectButton = () => {
  const { user } = useAuth();
  const { photographerProfile } = usePhotographer();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Stripe Connect 계정 생성 요청
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          photographerId: photographerProfile.id,
          email: user.email,
          country: 'US', // 또는 사용자 국가
        },
      });

      if (error) throw error;

      // DB에 계정 ID 저장
      await supabase
        .from('photographer_profiles')
        .update({
          stripe_account_id: data.accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', photographerProfile.id);

      // Stripe 온보딩 페이지로 리다이렉트
      window.location.href = data.onboardingUrl;
    } catch (err) {
      console.error('Connect error:', err);
      alert('Failed to connect Stripe account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 이미 연결된 경우
  if (photographerProfile?.stripe_account_id && photographerProfile?.stripe_onboarding_completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-green-700 font-semibold">✓ Stripe Connected</p>
        <p className="text-sm text-green-600 mt-1">Your earnings will be automatically transferred</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Connecting...' : '🔗 Connect Stripe to Receive Payments'}
    </button>
  );
};

export default StripeConnectButton;
```

## 6. Payment Intent 수정 - Direct Charges with Destination

결제 시 포토그래퍼 계정으로 자동 이체하도록 수정:

`supabase/functions/create-payment-intent/index.ts`:

```typescript
// ... 기존 코드 ...

// 포토그래퍼의 Stripe 계정 ID 가져오기
const { data: photographerData, error: photographerError } = await supabaseClient
  .from('photographer_profiles')
  .select('stripe_account_id')
  .eq('id', photographerId)
  .single();

if (photographerError || !photographerData?.stripe_account_id) {
  throw new Error('Photographer has not connected Stripe account');
}

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100), // $3.00
  currency: 'usd',
  automatic_payment_methods: {
    enabled: true,
  },
  // 플랫폼 수수료 ($1) 제외하고 포토그래퍼에게 전송
  application_fee_amount: 100, // $1 = 100 cents (플랫폼 수수료)
  transfer_data: {
    destination: photographerData.stripe_account_id, // 포토그래퍼 계정으로 $2 자동 이체
  },
  metadata: {
    photoCodeId,
    buyerId: buyerId || 'guest',
    photographerId: photographerId || '',
  },
});
```

## 7. Webhook 처리 - 계정 상태 업데이트

포토그래퍼가 온보딩을 완료하면 자동으로 DB 업데이트:

`supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  })

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    // 계정 업데이트 이벤트 처리
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account

      const { data, error } = await supabaseClient
        .from('photographer_profiles')
        .update({
          stripe_account_status: account.charges_enabled ? 'active' : 'pending',
          stripe_onboarding_completed: account.details_submitted,
        })
        .eq('stripe_account_id', account.id)

      if (error) console.error('DB update error:', error)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
```

### Webhook 설정

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Events to send:
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`
4. Webhook secret 복사 → Supabase secrets 설정:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 8. 포토그래퍼 대시보드에 추가

`src/components/PhotographerDashboard.jsx`에 StripeConnectButton 추가:

```jsx
import StripeConnectButton from './photographer/StripeConnectButton';

// ... 대시보드 코드 ...

<div className="mb-8">
  <h3 className="text-xl font-bold mb-4">Payment Settings</h3>
  <StripeConnectButton />
</div>
```

## 9. 테스트 플로우

### 9.1 포토그래퍼 계정 연결
1. 포토그래퍼 대시보드에서 "Connect Stripe" 클릭
2. Stripe Express 온보딩 페이지로 리다이렉트
3. 정보 입력 (이름, 생년월일, 은행 계좌 등)
4. 완료 후 대시보드로 돌아옴
5. DB에 `stripe_account_id` 저장됨

### 9.2 테스트 결제
1. 구매자가 사진 구매 ($3)
2. Payment Intent 생성 시 자동으로:
   - 플랫폼: $1 (application_fee)
   - 포토그래퍼 계정: $2 (자동 이체)
3. Stripe Dashboard에서 확인:
   - Payments → 전체 $3 표시
   - Connect → 포토그래퍼 계정 $2 표시

## 10. Production 체크리스트

- [ ] Stripe Connect 활성화
- [ ] DB에 `stripe_account_id` 컬럼 추가
- [ ] Edge Function 배포 (`create-connect-account`)
- [ ] Payment Intent에 `transfer_data` 추가
- [ ] Webhook 설정 및 테스트
- [ ] 포토그래퍼 대시보드에 Connect 버튼 추가
- [ ] 온보딩 완료 후 리다이렉트 URL 설정
- [ ] 테스트 모드에서 완전히 테스트
- [ ] Live 모드로 전환 전 Stripe 승인 확인

## 11. 비용 및 수수료

### Stripe 수수료
- 카드 결제: 2.9% + $0.30 per transaction
- Stripe Connect: 추가 수수료 없음 (Standard/Express)

### 예시 계산 ($3 판매 시)
```
구매 금액: $3.00
Stripe 수수료: $0.39 (2.9% + $0.30)
순수익: $2.61

분배:
- 포토그래퍼: $2.00
- 플랫폼: $0.61
```

실제 포토그래퍼가 받는 금액에서도 Stripe 수수료를 고려하려면:
```typescript
application_fee_amount: 100, // $1 플랫폼 수수료
// 포토그래퍼 실수령: $2.00 - (Stripe 수수료의 포토그래퍼 부담분)
```

## 12. 참고 자료

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Direct Charges](https://stripe.com/docs/connect/direct-charges)
- [Testing Connect](https://stripe.com/docs/connect/testing)
