# Apple Pay Domain Verification

이 디렉토리는 Apple Pay 도메인 인증을 위한 파일을 저장합니다.

## 설정 방법

1. **Stripe Dashboard에서 인증 파일 다운로드**
   - https://dashboard.stripe.com/settings/payment_methods
   - Apple Pay 섹션 → "Add new domain"
   - 도메인 입력: `snappo2.vercel.app`
   - "Download verification file" 클릭
   - `apple-developer-merchantid-domain-association` 파일 다운로드

2. **이 디렉토리에 파일 배치**
   - 다운로드한 파일을 이 디렉토리(`public/.well-known/`)에 복사
   - 파일명: `apple-developer-merchantid-domain-association` (확장자 없음)

3. **배포 및 인증**
   ```bash
   git add public/.well-known/apple-developer-merchantid-domain-association
   git commit -m "Add Apple Pay domain verification file"
   git push
   ```

4. **Stripe에서 도메인 인증**
   - 배포 완료 후 Stripe Dashboard로 돌아가기
   - "Verify domain" 클릭
   - 인증 완료되면 ✓ 표시

5. **테스트**
   - Safari에서 `https://snappo2.vercel.app` 접속
   - 결제 모달에서 Apple Pay 버튼 확인

## 인증 확인

파일이 올바르게 배포되었는지 확인:
```
https://snappo2.vercel.app/.well-known/apple-developer-merchantid-domain-association
```

위 URL을 브라우저에서 열었을 때 파일이 다운로드되어야 합니다.
